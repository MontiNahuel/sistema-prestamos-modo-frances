from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.domain.enums import TipoCuotaPresentacion
from app.features.cuotas_sociales.presentables import (
    buscar_cuotas_sociales_candidatas,
    parsear_fecha_iso,
)
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio
from app.features.presentaciones_bna.bna_layout import BnaRegistroIndividual
from app.features.presentaciones_bna.schemas import (
    CuotaPresentableBnaItem,
    BuscarCuotasBnaResponse,
)


class CuotaBnaMatcher:
    """Búsqueda y evaluación de elegibilidad de cuotas (préstamo y social) para BNA."""

    def __init__(self, db: Session, dict_sucursales: Dict[str, str]):
        self.db = db
        self.dict_sucursales = dict_sucursales

    def _resolver_datos_bna_socio(self, socio: Socio) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        cbu_elegido = self.resolver_cbu_bna(socio)
        motivo: Optional[str] = None
        sucursal_bna: Optional[str] = None
        nro_cuenta_bna: Optional[str] = None

        if not cbu_elegido:
            motivo = "Sin CBU de Banco Nación (código 011)"
        else:
            try:
                sucursal_bna, _, nro_cuenta_bna = BnaRegistroIndividual.resolver_datos_bna(
                    cbu_elegido, self.dict_sucursales
                )
            except ValueError as ex:
                motivo = str(ex)
        return cbu_elegido, sucursal_bna, nro_cuenta_bna, motivo

    def buscar(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        incluir_presentadas: bool = True,
        tipo_cuota: TipoCuotaPresentacion = TipoCuotaPresentacion.CUOTA_PRESTAMO,
        cuota_social_centavos: Optional[int] = None,
        usuario_operador: Optional[str] = None,
    ) -> BuscarCuotasBnaResponse:
        estados_prestamo = ["PENDIENTE", "PRESENTADA"] if incluir_presentadas else ["PENDIENTE"]
        estados_social = ["PENDIENTE", "RECHAZADA", "PARCIAL"] + (["PRESENTADA"] if incluir_presentadas else [])

        presentables: List[CuotaPresentableBnaItem] = []
        excluidas: List[CuotaPresentableBnaItem] = []
        total_centavos = 0

        if tipo_cuota in (TipoCuotaPresentacion.CUOTA_PRESTAMO, TipoCuotaPresentacion.PRESTAMO_Y_CUOTA_SOCIAL):
            q = (
                self.db.query(Cuota, Prestamo, Socio)
                .join(Prestamo, Cuota.prestamo_id == Prestamo.id)
                .join(Socio, Prestamo.persona_id == Socio.id)
                .filter(Cuota.estado.in_(estados_prestamo), Prestamo.estado == "ACTIVO")
            )
            fd = parsear_fecha_iso(fecha_desde)
            if fd:
                q = q.filter(Cuota.fecha_vencimiento >= fd)
            fh = parsear_fecha_iso(fecha_hasta or fecha_corte)
            if fh:
                q = q.filter(Cuota.fecha_vencimiento <= fh)

            for cuota, prestamo, socio in q.order_by(Cuota.fecha_vencimiento.asc(), Socio.nombre_completo.asc()).all():
                saldo = max(0, cuota.cuota_total_centavos - cuota.monto_pagado_centavos)
                if not saldo:
                    continue
                cbu_elegido, sucursal_bna, nro_cuenta_bna, motivo = self._resolver_datos_bna_socio(socio)
                item = CuotaPresentableBnaItem(
                    cuota_id=cuota.id,
                    cuota_social_id=None,
                    tipo_item="CUOTA_PRESTAMO",
                    periodo=cuota.fecha_vencimiento.strftime("%Y-%m") if cuota.fecha_vencimiento else None,
                    prestamo_id=prestamo.id,
                    numero_cuota=cuota.numero_cuota,
                    socio_id=socio.id,
                    socio_nombre=socio.nombre_completo,
                    socio_documento=socio.documento,
                    cbu=cbu_elegido,
                    sucursal_bna=sucursal_bna,
                    nro_cuenta_bna=nro_cuenta_bna,
                    monto_pesos=round(saldo / 100.0, 2),
                    monto_centavos=saldo,
                    fecha_vencimiento=cuota.fecha_vencimiento.isoformat() if cuota.fecha_vencimiento else None,
                    estado=cuota.estado,
                    presentable=motivo is None,
                    motivo_exclusion=motivo,
                )
                if motivo is None:
                    presentables.append(item)
                    total_centavos += saldo
                else:
                    excluidas.append(item)

        if tipo_cuota in (TipoCuotaPresentacion.CUOTA_SOCIAL, TipoCuotaPresentacion.PRESTAMO_Y_CUOTA_SOCIAL):
            filas_cs = buscar_cuotas_sociales_candidatas(
                db=self.db,
                estados=estados_social,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
                fecha_corte=fecha_corte,
                cuota_social_centavos=cuota_social_centavos,
                usuario_operador=usuario_operador,
            )
            for cs, socio in filas_cs:
                saldo = max(0, cs.valor_centavos - cs.monto_pagado_centavos)
                if not saldo:
                    continue
                cbu_elegido, sucursal_bna, nro_cuenta_bna, motivo = self._resolver_datos_bna_socio(socio)
                item = CuotaPresentableBnaItem(
                    cuota_id=None,
                    cuota_social_id=cs.id,
                    tipo_item="CUOTA_SOCIAL",
                    periodo=cs.periodo,
                    prestamo_id=cs.prestamo_id,
                    numero_cuota=None,
                    socio_id=socio.id,
                    socio_nombre=socio.nombre_completo,
                    socio_documento=socio.documento,
                    cbu=cbu_elegido,
                    sucursal_bna=sucursal_bna,
                    nro_cuenta_bna=nro_cuenta_bna,
                    monto_pesos=round(saldo / 100.0, 2),
                    monto_centavos=saldo,
                    fecha_vencimiento=cs.fecha_vencimiento.isoformat(),
                    estado=cs.estado,
                    presentable=motivo is None,
                    motivo_exclusion=motivo,
                )
                if motivo is None:
                    presentables.append(item)
                    total_centavos += saldo
                else:
                    excluidas.append(item)

        clave_orden = lambda it: (it.fecha_vencimiento or "", it.socio_nombre, it.tipo_item)
        presentables.sort(key=clave_orden)
        excluidas.sort(key=clave_orden)

        return BuscarCuotasBnaResponse(
            presentables=presentables,
            excluidas=excluidas,
            total_presentables=len(presentables),
            total_monto_pesos=round(total_centavos / 100.0, 2),
        )

    @staticmethod
    def resolver_cbu_bna(socio: Socio) -> Optional[str]:
        candidatos = [
            mp for mp in socio.medios_de_pago
            if mp.valor and BnaRegistroIndividual.es_cbu_banco_nacion(mp.valor)
        ]
        if not candidatos:
            return None
        candidatos.sort(key=lambda x: (not x.predeterminado, x.valor))
        return BnaRegistroIndividual.normalizar_cbu(candidatos[0].valor)
