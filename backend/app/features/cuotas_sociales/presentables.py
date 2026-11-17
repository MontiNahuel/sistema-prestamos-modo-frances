from datetime import date, datetime
from typing import List, Optional, Sequence, Set, Tuple
from sqlalchemy.orm import Session
from app.features.cuotas_sociales.model import CuotaSocial
from app.features.cuotas_sociales.service import CuotaSocialService
from app.features.socios.model import Socio


def parsear_fecha_iso(fecha_str: Optional[str]) -> Optional[date]:
    if not fecha_str:
        return None
    try:
        return datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def coincide_ultimo_digito_dni(
    documento: Optional[str],
    dni_desde: Optional[int],
    dni_hasta: Optional[int],
) -> bool:
    if dni_desde is None and dni_hasta is None:
        return True
    doc = (documento or "").strip()
    digito_str = next((c for c in reversed(doc) if c.isdigit()), None)
    if digito_str is None:
        return False
    digito = int(digito_str)
    if dni_desde is not None and digito < dni_desde:
        return False
    if dni_hasta is not None and digito > dni_hasta:
        return False
    return True


def buscar_cuotas_sociales_candidatas(
    db: Session,
    estados: Sequence[str],
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    fecha_corte: Optional[str] = None,
    ids_filtrados: Optional[Set[int]] = None,
) -> List[Tuple[CuotaSocial, Socio]]:
    """
    Asegura los períodos mensuales activos hasta la fecha solicitada y devuelve las
    tuplas ``(CuotaSocial, Socio)`` elegibles según estado y rango de fechas.
    """
    fh = parsear_fecha_iso(fecha_hasta or fecha_corte)
    CuotaSocialService(db).asegurar_periodos_hasta(
        fecha_hasta=fh or date.today(),
        commit=True,
    )

    q = (
        db.query(CuotaSocial, Socio)
        .join(Socio, CuotaSocial.socio_id == Socio.id)
        .filter(CuotaSocial.estado.in_(list(estados)))
    )
    fd = parsear_fecha_iso(fecha_desde)
    if fd:
        q = q.filter(CuotaSocial.fecha_vencimiento >= fd)
    if fh:
        q = q.filter(CuotaSocial.fecha_vencimiento <= fh)
    if ids_filtrados:
        q = q.filter(Socio.id.in_(ids_filtrados))

    return q.order_by(CuotaSocial.fecha_vencimiento.asc(), Socio.nombre_completo.asc()).all()
