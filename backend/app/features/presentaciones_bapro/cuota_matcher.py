from typing import List, Optional, Set
from sqlalchemy.orm import Session
from app.domain.enums import TipoCuotaPresentacion
from app.features.cuotas_sociales.presentables import (
    buscar_cuotas_sociales_candidatas,
    coincide_ultimo_digito_dni,
    parsear_fecha_iso,
)
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio
from app.features.presentaciones_bapro.bapro_layout import BaproRegistroIndividual
from app.features.presentaciones_bapro.schemas import (
    CuotaPresentableItem,
    BuscarCuotasBaproResponse,
)


class CuotaBaproMatcher:
    """Búsqueda y evaluación de elegibilidad de cuotas (préstamo y social) para BAPRO."""

    def __init__(self, db: Session, dnis_excluidos: Set[str], ids_filtrados: Optional[Set[int]] = None):
        self.db = db
        self.dnis_excluidos = dnis_excluidos
        self.ids_filtrados = ids_filtrados

    def _evaluar_socio_bapro(self, socio: Socio) -> tuple[Optional[str], Optional[str]]:
        doc = (socio.documento or "").strip()
        cbu_elegido = self.resolver_cbu_bapro(socio)
        motivo: Optional[str] = None
        if not cbu_elegido:
            motivo = "Sin CBU de Banco Provincia (código 014)"
        elif doc and doc in self.dnis_excluidos:
            motivo = "DNI en lista negra de débitos BAPRO"
        return cbu_elegido, motivo

    def buscar(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        dni_desde: Optional[int] = None,
        dni_hasta: Optional[int] = None,
        incluir_presentadas: bool = True,
        tipo_cuota: TipoCuotaPresentacion = TipoCuotaPresentacion.CUOTA_PRESTAMO,
    ) -> BuscarCuotasBaproResponse:
        estados = ["PENDIENTE", "VENCIDA", "PARCIAL", "RECHAZADA"]
        if incluir_presentadas:
            estados.append("PRESENTADA")

        presentables: List[CuotaPresentableItem] = []
        excluidas: List[CuotaPresentableItem] = []
        total_centavos = 0

        if tipo_cuota in (TipoCuotaPresentacion.CUOTA_PRESTAMO, TipoCuotaPresentacion.PRESTAMO_Y_CUOTA_SOCIAL):
            q = (
                self.db.query(Cuota, Prestamo, Socio)
                .join(Prestamo, Cuota.prestamo_id == Prestamo.id)
                .join(Socio, Prestamo.persona_id == Socio.id)
                .filter(Cuota.estado.in_(estados), Prestamo.estado.in_(["ACTIVO", "MORA"]))
            )
            fd = parsear_fecha_iso(fecha_desde)
            if fd:
                q = q.filter(Cuota.fecha_vencimiento >= fd)
            fh = parsear_fecha_iso(fecha_hasta or fecha_corte)
            if fh:
                q = q.filter(Cuota.fecha_vencimiento <= fh)
            if self.ids_filtrados:
                q = q.filter(Socio.id.in_(self.ids_filtrados))

            for cuota, prestamo, socio in q.order_by(Cuota.fecha_vencimiento.asc(), Socio.nombre_completo.asc()).all():
                if not coincide_ultimo_digito_dni(socio.documento, dni_desde, dni_hasta):
                    continue
                saldo = max(0, cuota.cuota_total_centavos - cuota.monto_pagado_centavos)
                if not saldo:
                    continue
                cbu_elegido, motivo = self._evaluar_socio_bapro(socio)
                item = CuotaPresentableItem(
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
                estados=estados,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
                fecha_corte=fecha_corte,
                ids_filtrados=self.ids_filtrados,
            )
            for cs, socio in filas_cs:
                if not coincide_ultimo_digito_dni(socio.documento, dni_desde, dni_hasta):
                    continue
                saldo = max(0, cs.valor_centavos - cs.monto_pagado_centavos)
                if not saldo:
                    continue
                cbu_elegido, motivo = self._evaluar_socio_bapro(socio)
                item = CuotaPresentableItem(
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

        return BuscarCuotasBaproResponse(
            presentables=presentables,
            excluidas=excluidas,
            total_presentables=len(presentables),
            total_monto_pesos=round(total_centavos / 100.0, 2),
        )

    @staticmethod
    def resolver_cbu_bapro(socio: Socio) -> Optional[str]:
        candidatos = [
            mp for mp in socio.medios_de_pago
            if mp.valor and BaproRegistroIndividual.es_cbu_banco_provincia(mp.valor)
        ]
        if not candidatos:
            return None
        candidatos.sort(key=lambda x: (not x.predeterminado, x.valor))
        return BaproRegistroIndividual.normalizar_cbu(candidatos[0].valor)
