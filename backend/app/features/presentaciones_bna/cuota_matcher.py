from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio, MedioDePago
from app.features.presentaciones_bna.bna_layout import BnaRegistroIndividual
from app.features.presentaciones_bna.schemas import (
    CuotaPresentableBnaItem,
    BuscarCuotasBnaResponse,
)


class CuotaBnaMatcher:
    """Búsqueda y evaluación de elegibilidad de cuotas para presentación BNA."""

    def __init__(self, db: Session, dict_sucursales: Dict[str, str]):
        self.db = db
        self.dict_sucursales = dict_sucursales

    def buscar(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        incluir_presentadas: bool = True,
    ) -> BuscarCuotasBnaResponse:
        estados = ["PENDIENTE", "PRESENTADA"] if incluir_presentadas else ["PENDIENTE"]
        q = (
            self.db.query(Cuota, Prestamo, Socio)
            .join(Prestamo, Cuota.prestamo_id == Prestamo.id)
            .join(Socio, Prestamo.persona_id == Socio.id)
            .filter(Cuota.estado.in_(estados), Prestamo.estado == "ACTIVO")
        )

        if fecha_desde:
            try:
                fd = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
                q = q.filter(Cuota.fecha_vencimiento >= fd)
            except ValueError:
                pass

        fh_str = fecha_hasta or fecha_corte
        if fh_str:
            try:
                fh = datetime.strptime(fh_str, "%Y-%m-%d").date()
                q = q.filter(Cuota.fecha_vencimiento <= fh)
            except ValueError:
                pass

        resultados = q.order_by(Cuota.fecha_vencimiento.asc(), Socio.nombre_completo.asc()).all()

        presentables: List[CuotaPresentableBnaItem] = []
        excluidas: List[CuotaPresentableBnaItem] = []
        total_centavos = 0

        for cuota, prestamo, socio in resultados:
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

            monto_pesos = round(cuota.cuota_total_centavos / 100.0, 2)
            item = CuotaPresentableBnaItem(
                cuota_id=cuota.id,
                prestamo_id=prestamo.id,
                numero_cuota=cuota.numero_cuota,
                socio_id=socio.id,
                socio_nombre=socio.nombre_completo,
                socio_documento=socio.documento,
                cbu=cbu_elegido,
                sucursal_bna=sucursal_bna,
                nro_cuenta_bna=nro_cuenta_bna,
                monto_pesos=monto_pesos,
                monto_centavos=cuota.cuota_total_centavos,
                fecha_vencimiento=cuota.fecha_vencimiento.isoformat() if cuota.fecha_vencimiento else None,
                estado=cuota.estado,
                presentable=motivo is None,
                motivo_exclusion=motivo,
            )

            if motivo is None:
                presentables.append(item)
                total_centavos += cuota.cuota_total_centavos
            else:
                excluidas.append(item)

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
