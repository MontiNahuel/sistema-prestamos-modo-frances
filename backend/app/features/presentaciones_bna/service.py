import os
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio
from app.features.presentaciones_bna.model import PresentacionBnaArchivo, PresentacionBnaAuditoria
from app.features.presentaciones_bna.repository import PresentacionBnaRepository
from app.features.presentaciones_bna.bna_layout import BnaRegistroIndividual
from app.features.presentaciones_bna.cuota_matcher import CuotaBnaMatcher
from app.features.presentaciones_bna.sucursales_service import obtener_mapa_sucursales_bna
from app.features.presentaciones_bna.schemas import (
    BuscarCuotasBnaResponse,
    GenerarPresentacionBnaRequest,
    GenerarPresentacionBnaResponse,
    ProcesarRespuestaBnaResponse,
)
from app.features.presentaciones_bna.response_service import PresentacionBnaResponseService


def _parse_fecha_aaaammdd(fecha_str: Optional[str]) -> str:
    if not fecha_str:
        return datetime.utcnow().strftime("%Y%m%d")
    clean = fecha_str.replace("-", "").replace("/", "")
    if len(clean) == 8 and clean.isdigit():
        if "-" in fecha_str:
            p = fecha_str.split("-")
            return f"{p[0]}{p[1]}{p[2]}"
        return clean
    return datetime.utcnow().strftime("%Y%m%d")


class PresentacionBnaService:
    STORAGE_DIR = os.path.join(os.getcwd(), "storage", "presentaciones", "bna")

    def __init__(self, db: Session):
        self.db = db
        self.repo = PresentacionBnaRepository(db)
        self.mapa_sucursales = obtener_mapa_sucursales_bna()
        self.response_service = PresentacionBnaResponseService(db, self.repo)

    def obtener_proximo_nro_lista(self) -> int:
        return self.repo.obtener_proximo_nro_archivo_local()

    def validar_nro_lista(self, nro_lista: int) -> bool:
        return self.repo.validar_nro_archivo_disponible(nro_lista)

    def buscar_cuotas_presentables(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        incluir_presentadas: bool = True,
    ) -> BuscarCuotasBnaResponse:
        matcher = CuotaBnaMatcher(self.db, self.mapa_sucursales)
        return matcher.buscar(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            fecha_corte=fecha_corte,
            incluir_presentadas=incluir_presentadas,
        )

    def generar_presentacion_bna(
        self, req: GenerarPresentacionBnaRequest, usuario_id: Optional[int] = None
    ) -> Tuple[GenerarPresentacionBnaResponse, bytes]:
        if not req.cuota_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe seleccionar al menos una cuota")

        if req.nro_lista is not None:
            if not self.repo.validar_nro_archivo_disponible(req.nro_lista):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El número de lote {req.nro_lista} ya fue utilizado previamente. Por favor use el próximo número disponible o valide otro número.",
                )
            nro_archivo = req.nro_lista
        else:
            nro_archivo = self.repo.obtener_proximo_nro_archivo_local()

        nombre_archivo = req.nombre_archivo or f"BNA_{nro_archivo}.txt"
        fecha_tope = _parse_fecha_aaaammdd(req.fecha_impacto)
        secuencia = fecha_tope[4:6] + "01"

        cuotas = (
            self.db.query(Cuota, Prestamo, Socio)
            .join(Prestamo, Cuota.prestamo_id == Prestamo.id)
            .join(Socio, Prestamo.persona_id == Socio.id)
            .filter(Cuota.id.in_(req.cuota_ids))
            .all()
        )
        if not cuotas:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontraron cuotas para los IDs provistos")

        carpeta_lote = os.path.join(self.STORAGE_DIR, str(nro_archivo))
        os.makedirs(carpeta_lote, exist_ok=True)
        ruta_archivo = os.path.join(carpeta_lote, nombre_archivo)

        lineas: List[str] = []
        detalles: List[PresentacionBnaAuditoria] = []
        numero_op = req.numero_operacion_inicial
        total_centavos = 0

        # Cabecera Tipo 1
        cabecera = BnaRegistroIndividual.formatear_cabecera(
            casa=req.casa,
            producto=req.producto,
            cuenta=req.cuenta,
            secuencia=secuencia,
            fecha_tope_aaaammdd=fecha_tope,
            indicador_lote=req.indicador_lote,
        )
        lineas.append(cabecera)

        # Detalles Tipo 2
        for cuota, prestamo, socio in cuotas:
            cbu = CuotaBnaMatcher.resolver_cbu_bna(socio)
            if not cbu:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El socio {socio.nombre_completo} no posee CBU de Banco Nación (011)"
                )
            sucursal_bna, sistema_cuenta, nro_cuenta = BnaRegistroIndividual.resolver_datos_bna(
                cbu, self.mapa_sucursales
            )

            concepto_debito = f"{nro_archivo}-{numero_op}"[:10]
            monto_pesos = Decimal(str(round(cuota.cuota_total_centavos / 100.0, 2)))

            linea_det = BnaRegistroIndividual.formatear_detalle(
                sucursal_cliente=sucursal_bna,
                nro_cuenta_cliente=nro_cuenta,
                importe_centavos=cuota.cuota_total_centavos,
                concepto_debito=concepto_debito,
                sistema_cuenta=sistema_cuenta,
            )
            lineas.append(linea_det)
            total_centavos += cuota.cuota_total_centavos
            cuota.estado = "PRESENTADA"

            detalles.append(
                PresentacionBnaAuditoria(
                    cuota_id=cuota.id,
                    id_persona=socio.id,
                    nro_archivo=nro_archivo,
                    numero_operacion=numero_op,
                    sucursal_cuenta_cliente=sucursal_bna,
                    sistema_cuenta=sistema_cuenta,
                    nro_cuenta_cliente=nro_cuenta,
                    importe=str(cuota.cuota_total_centavos).zfill(15),
                    monto_pesos=monto_pesos,
                    concepto_debito=concepto_debito,
                    nombre_archivo=nombre_archivo,
                    usuario_id=usuario_id,
                )
            )
            numero_op += 1

        # Pie Tipo 3
        pie = BnaRegistroIndividual.formatear_pie(
            total_centavos=total_centavos,
            cantidad_registros=len(cuotas),
        )
        lineas.append(pie)

        contenido_txt = "\r\n".join(lineas) + "\r\n"
        contenido_bytes = contenido_txt.encode("ascii")
        with open(ruta_archivo, "wb") as f:
            f.write(contenido_bytes)

        monto_total_pesos = Decimal(str(round(total_centavos / 100.0, 2)))
        archivo_db = PresentacionBnaArchivo(
            nro_archivo=nro_archivo,
            ruta=ruta_archivo,
            tipo="BNA",
            total_registros=len(cuotas),
            total_monto=monto_total_pesos,
            usuario_id=usuario_id,
            estado="GENERADO",
            nombre_archivo=nombre_archivo,
        )
        archivo_creado = self.repo.crear_archivo(archivo_db)
        for d in detalles:
            d.presentacion_archivo_id = archivo_creado.id
        self.repo.insertar_detalles(detalles)

        resp = GenerarPresentacionBnaResponse(
            archivo_id=archivo_creado.id,
            nro_archivo=nro_archivo,
            nombre_archivo=nombre_archivo,
            total_registros=len(cuotas),
            total_monto_pesos=float(monto_total_pesos),
            ruta_descarga=f"/api/v1/presentaciones-bna/archivos/{archivo_creado.id}/descargar",
        )
        return resp, contenido_bytes

    def procesar_respuesta_bna(
        self, archivo_id: int, contenido_txt: str, usuario_id: Optional[int] = None
    ) -> ProcesarRespuestaBnaResponse:
        return self.response_service.procesar(archivo_id, contenido_txt, usuario_id)
