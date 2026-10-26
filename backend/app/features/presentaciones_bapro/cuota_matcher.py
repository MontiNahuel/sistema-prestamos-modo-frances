from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Set
from sqlalchemy.orm import Session
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import Socio, MedioDePago
from app.features.presentaciones_bapro.bapro_layout import BaproRegistroIndividual
from app.features.presentaciones_bapro.schemas import (
    CuotaPresentableItem,
    BuscarCuotasBaproResponse,
)


class CuotaBaproMatcher:
    """Búsqueda y evaluación de elegibilidad de cuotas para presentación BAPRO."""

    def __init__(self, db: Session, dnis_excluidos: Set[str], ids_filtrados: Optional[Set[int]] = None):
        self.db = db
        self.dnis_excluidos = dnis_excluidos
        self.ids_filtrados = ids_filtrados

    def buscar(
        self,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        fecha_corte: Optional[str] = None,
        dni_desde: Optional[int] = None,
        dni_hasta: Optional[int] = None,
        incluir_presentadas: bool = True,
    ) -> BuscarCuotasBaproResponse:
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

        if self.ids_filtrados:
            q = q.filter(Socio.id.in_(self.ids_filtrados))

        resultados = q.order_by(Cuota.fecha_vencimiento.asc(), Socio.nombre_completo.asc()).all()

        presentables: List[CuotaPresentableItem] = []
        excluidas: List[CuotaPresentableItem] = []
        total_centavos = 0

        for cuota, prestamo, socio in resultados:
            doc = (socio.documento or "").strip()
            if dni_desde is not None or dni_hasta is not None:
                digito_str = next((c for c in reversed(doc) if c.isdigit()), None)
                if digito_str is None:
                    continue
                digito = int(digito_str)
                if dni_desde is not None and digito < dni_desde:
                    continue
                if dni_hasta is not None and digito > dni_hasta:
                    continue

            cbu_elegido = self.resolver_cbu_bapro(socio)
            motivo: Optional[str] = None

            if not cbu_elegido:
                motivo = "Sin CBU de Banco Provincia (código 014)"
            elif doc and doc in self.dnis_excluidos:
                motivo = "DNI en lista negra de débitos BAPRO"

            monto_pesos = round(cuota.cuota_total_centavos / 100.0, 2)
            item = CuotaPresentableItem(
                cuota_id=cuota.id,
                prestamo_id=prestamo.id,
                numero_cuota=cuota.numero_cuota,
                socio_id=socio.id,
                socio_nombre=socio.nombre_completo,
                socio_documento=socio.documento,
                cbu=cbu_elegido,
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
