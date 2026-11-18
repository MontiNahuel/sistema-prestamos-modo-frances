import os
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.domain.enums import TipoCuotaPresentacion
from app.features.cuotas_sociales.model import CuotaSocial
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio
from app.features.empresas.repository import EmpresaOriginanteRepository
from app.features.presentaciones_bapro.model import PresentacionBaproArchivo, PresentacionBaproAuditoria
from app.features.presentaciones_bapro.repository import (
    PresentacionBaproRepository,
    DniExcluidoBaproRepository,
    PresentacionFiltroMasivoBaproRepository,
)
from app.features.presentaciones_bapro.bapro_layout import (
    BaproRegistroIndividual,
    RepartidorDePartes,
    ParseadorRespuestaBapro,
)
from app.features.presentaciones_bapro.cuota_matcher import CuotaBaproMatcher
from app.features.presentaciones_bapro.schemas import (
    BuscarCuotasBaproResponse,
    GenerarPresentacionBaproRequest,
    GenerarPresentacionBaproResponse,
    ProcesarRespuestaBaproResponse,
)
from app.features.auditoria.service import AuditoriaService
from app.integrations.coopya_db_client import (
    CoopYaDbClient,
    coopya_db_client,
    sincronizar_cuotas_presentadas_con_coopya,
)


def _parse_fecha_impacto(fecha_str: Optional[str]) -> str:
    if not fecha_str:
        return datetime.utcnow().strftime("%d%m%Y")
    clean = fecha_str.replace("-", "").replace("/", "")
    if len(clean) == 8 and clean.isdigit() and "-" in fecha_str:
        p = fecha_str.split("-")
        return f"{p[2]}{p[1]}{p[0]}"
    return clean if len(clean) == 8 and clean.isdigit() else datetime.utcnow().strftime("%d%m%Y")


class PresentacionBaproService:
    STORAGE_DIR = os.path.join(os.getcwd(), "storage", "presentaciones", "bapro")

    def __init__(self, db: Session, coopya_db: Optional[CoopYaDbClient] = coopya_db_client):
        self.db = db
        self.repo = PresentacionBaproRepository(db)
        self.empresa_repo = EmpresaOriginanteRepository(db)
        self.dni_repo = DniExcluidoBaproRepository(db)
        self.filtro_repo = PresentacionFiltroMasivoBaproRepository(db)
        self.auditoria_service = AuditoriaService(db)
        self.coopya_db = coopya_db

    def obtener_proximo_nro_lista(self) -> int:
        return self.repo.obtener_proximo_nro_archivo_local()

    def validar_nro_lista(self, nro_lista: int) -> bool:
        return self.repo.validar_nro_archivo_disponible(nro_lista)

    def buscar_cuotas_presentables(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        dni_desde: Optional[int] = None,
        dni_hasta: Optional[int] = None,
        incluir_presentadas: bool = True,
        base_filtrada: bool = False,
        usuario_id: Optional[int] = None,
        tipo_cuota: TipoCuotaPresentacion = TipoCuotaPresentacion.CUOTA_PRESTAMO,
    ) -> BuscarCuotasBaproResponse:
        dnis_excluidos = self.dni_repo.obtener_todos_dnis()
        ids_filtrados = set(self.filtro_repo.obtener_ids_personas(usuario_id)) if (base_filtrada and usuario_id) else None
        matcher = CuotaBaproMatcher(self.db, dnis_excluidos, ids_filtrados)
        return matcher.buscar(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            fecha_corte=fecha_corte,
            dni_desde=dni_desde,
            dni_hasta=dni_hasta,
            incluir_presentadas=incluir_presentadas,
            tipo_cuota=tipo_cuota,
        )

    def generar_presentacion_bapro(
        self,
        req: GenerarPresentacionBaproRequest,
        usuario_id: Optional[int] = None,
        usuario_operador: Optional[str] = None,
    ) -> Tuple[GenerarPresentacionBaproResponse, bytes]:
        from app.features.respuestas_bancarias.service import bloquear_cobranzas
        bloquear_cobranzas(self.db)
        if not req.cuota_ids and not req.cuota_social_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe seleccionar al menos una cuota")

        empresa = (
            self.empresa_repo.obtener_por_id(req.empresa_originante_id)
            if req.empresa_originante_id
            else self.empresa_repo.obtener_predeterminada()
        )
        if not empresa:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se encontró una empresa originante configurada")

        fecha_venc = _parse_fecha_impacto(req.fecha_impacto)
        nro_archivo = req.nro_lista or self.repo.obtener_proximo_nro_archivo_local()
        nombre_archivo = req.nombre_archivo or f"{empresa.prefijo_archivo}{nro_archivo}.txt"
        min_desglose_centavos = int(req.monto_minimo_desglose_pesos * 100)

        cuotas = (
            self.db.query(Cuota, Prestamo, Socio)
            .join(Prestamo, Cuota.prestamo_id == Prestamo.id)
            .join(Socio, Prestamo.persona_id == Socio.id)
            .filter(Cuota.id.in_(req.cuota_ids))
            .all()
            if req.cuota_ids
            else []
        )
        cuotas_sociales = (
            self.db.query(CuotaSocial, Socio)
            .join(Socio, CuotaSocial.socio_id == Socio.id)
            .filter(CuotaSocial.id.in_(req.cuota_social_ids))
            .all()
            if req.cuota_social_ids
            else []
        )
        if not cuotas and not cuotas_sociales:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontraron cuotas para los IDs provistos")

        objetivos = []
        prestamos_por_cuota_id = {}
        for cuota, prestamo, socio in cuotas:
            saldo = cuota.cuota_total_centavos - cuota.monto_pagado_centavos
            if prestamo.estado not in ('ACTIVO', 'MORA') or cuota.estado in ('PAGADA', 'CANCELADA') or saldo <= 0:
                raise HTTPException(409, 'Una cuota seleccionada ya no admite débitos. Actualice la búsqueda.')
            objetivos.append(("Prestamo", cuota, cuota.id, None, saldo, socio))
            prestamos_por_cuota_id[cuota.id] = prestamo

        for cs, socio in cuotas_sociales:
            saldo = cs.valor_centavos - cs.monto_pagado_centavos
            if cs.estado in ('PAGADA', 'ANULADA') or saldo <= 0:
                raise HTTPException(409, 'Una cuota social seleccionada ya no admite débitos. Actualice la búsqueda.')
            objetivos.append(("CuotaSocial", cs, None, cs.id, saldo, socio))

        carpeta_lote = os.path.join(self.STORAGE_DIR, str(nro_archivo))
        os.makedirs(carpeta_lote, exist_ok=True)
        ruta_archivo = os.path.join(carpeta_lote, nombre_archivo)

        lineas: List[str] = []
        detalles: List[PresentacionBaproAuditoria] = []
        cuotas_prestamo_presentadas = []
        numero_op = req.numero_operacion_inicial
        total_centavos = 0

        for tipo_importe, modelo, cuota_id, cuota_social_id, saldo, socio in objetivos:
            cbu = CuotaBaproMatcher.resolver_cbu_bapro(socio)
            if not cbu:
                continue

            desglosar = req.aplicar_desglose and saldo >= min_desglose_centavos and saldo >= 2
            partes = RepartidorDePartes.repartir(saldo, 2) if desglosar else [saldo]

            for parte_centavos in partes:
                ref_debito = f"{nro_archivo}{str(numero_op).zfill(6)}"
                linea = BaproRegistroIndividual.formatear_linea(
                    fecha_vencimiento_ddmmaaaa=fecha_venc,
                    identificador_cliente=socio.id,
                    cbu=cbu,
                    importe_centavos=parte_centavos,
                    numero_operacion=numero_op,
                    nro_lista=nro_archivo,
                    cuit_empresa=empresa.cuit,
                    descripcion_transaccion=empresa.descripcion_transaccion,
                    nombre_empresa=empresa.razon_social[:16],
                )
                lineas.append(linea)
                detalles.append(
                    PresentacionBaproAuditoria(
                        cuota_id=cuota_id, cuota_social_id=cuota_social_id,
                        tipo_importe=tipo_importe,
                        id_persona=socio.id, nro_archivo=nro_archivo,
                        numero_operacion=numero_op, codigo_interno="71", fecha_vencimiento=fecha_venc,
                        identificador_cliente=f"000000{str(socio.id).zfill(6)}", tipo_dato="P",
                        bloque1_cbu=cbu[:8], bloque2_cbu=cbu[8:], importe=str(parte_centavos).zfill(10),
                        monto_pesos=Decimal(parte_centavos) / Decimal(100), cuit_empresa=empresa.cuit,
                        descripcion_transaccion=empresa.descripcion_transaccion, referencia_debito=ref_debito,
                        nombre_empresa=empresa.razon_social[:16], nombre_archivo=nombre_archivo,
                        usuario_id=usuario_id, id_corrida=req.id_corrida,
                    )
                )
                total_centavos += parte_centavos
                numero_op += 1

            modelo.estado = "PRESENTADA"
            if cuota_id and cuota_id in prestamos_por_cuota_id:
                cuotas_prestamo_presentadas.append((modelo, prestamos_por_cuota_id[cuota_id]))

        contenido_bytes = ("\r\n".join(lineas) + "\r\n").encode("ascii")
        with open(ruta_archivo, "wb") as f:
            f.write(contenido_bytes)

        archivo = PresentacionBaproArchivo(
            nro_archivo=nro_archivo, ruta=f"presentaciones/bapro/{nro_archivo}/{nombre_archivo}",
            tipo="BAPRO", total_registros=len(lineas), total_monto=round(total_centavos / 100.0, 2),
            usuario_id=usuario_id, estado="GENERADO", nombre_archivo=nombre_archivo,
        )
        self.repo.crear_archivo(archivo)
        for det in detalles:
            det.presentacion_archivo_id = archivo.id
        self.repo.insertar_detalles(detalles)
        self.db.commit()

        sincronizar_cuotas_presentadas_con_coopya(
            db=self.db,
            cuotas_y_prestamos=cuotas_prestamo_presentadas,
            banco="BAPRO",
            nro_archivo=nro_archivo,
            fecha_impacto_str=req.fecha_impacto,
            coopya_db=self.coopya_db,
        )

        self.auditoria_service.auditar_presentacion_bapro(
            accion="GENERAR", nro_archivo=nro_archivo, presentacion_archivo_id=archivo.id,
            total_registros=len(lineas), total_monto=round(total_centavos / 100.0, 2),
            usuario_operador=usuario_operador or (str(usuario_id) if usuario_id else "SISTEMA"),
            detalles_json={"nombre_archivo": nombre_archivo, "empresa_cuit": empresa.cuit, "registros": len(lineas)},
        )

        return (
            GenerarPresentacionBaproResponse(
                nro_archivo=nro_archivo, nombre_archivo=nombre_archivo,
                total_registros=len(lineas), total_monto=round(total_centavos / 100.0, 2),
                ruta=archivo.ruta, fecha_generacion=archivo.fecha_generacion,
            ),
            contenido_bytes,
        )

    def procesar_respuesta_bapro(
        self, nro_archivo: int, contenido_texto: str, usuario_id: Optional[int] = None
    ) -> ProcesarRespuestaBaproResponse:
        raise HTTPException(
            status_code=410,
            detail='Use Carga de respuesta: previsualizar y confirmar. La imputación directa fue reemplazada para evitar duplicados y saldos incorrectos.',
        )
