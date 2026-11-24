from datetime import date, datetime
from typing import List, Optional, Sequence, Set, Tuple
from sqlalchemy import true
from sqlalchemy.orm import Session
from app.features.cuotas_sociales.config_service import CuotaSocialConfigService
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


ESTADOS_CUOTA_SOCIAL_MODIFICABLES = ("PENDIENTE", "RECHAZADA", "EN_MORA")
ESTADOS_CUOTA_SOCIAL_REPRESENTABLES = ("PENDIENTE", "RECHAZADA", "EN_MORA", "PRESENTADA")


def aplicar_valor_cuota_social_vigente(
    db: Session,
    valor_centavos: int,
    cuota_social_ids: Optional[Sequence[str]] = None,
    usuario_operador: Optional[str] = None,
    sincronizar_admin: bool = True,
) -> int:
    """
    Unifica el importe de Cuota Social en socios activos y cuotas sin pagos:
    - En búsqueda general (`cuota_social_ids=None`): solo actualiza `PENDIENTE`, `RECHAZADA`, `EN_MORA`.
    - Al generar/re-presentar IDs seleccionados (`cuota_social_ids` explícito): incluye además `PRESENTADA`
      cuando `monto_pagado_centavos == 0`, sin alterar nunca otras `PRESENTADA` no incluidas ni `PAGADA`/`ANULADA`.
    También sincroniza el valor por defecto de Admin -> Cuotas Sociales cuando cambia.
    """
    if valor_centavos <= 0:
        return 0

    actualizadas = 0
    if cuota_social_ids is not None:
        ids = list(cuota_social_ids)
        if not ids:
            return 0
        cuotas = (
            db.query(CuotaSocial)
            .filter(
                CuotaSocial.id.in_(ids),
                CuotaSocial.estado.in_(ESTADOS_CUOTA_SOCIAL_REPRESENTABLES),
                CuotaSocial.monto_pagado_centavos == 0,
            )
            .all()
        )
        socio_ids: Set[int] = set()
        for cs in cuotas:
            if cs.valor_centavos != valor_centavos:
                cs.valor_centavos = valor_centavos
                actualizadas += 1
            socio_ids.add(cs.socio_id)
        if socio_ids:
            socios = (
                db.query(Socio)
                .filter(Socio.id.in_(socio_ids), Socio.cuota_social_activa == true())
                .all()
            )
            for socio in socios:
                if socio.cuota_social_valor_centavos != valor_centavos:
                    socio.cuota_social_valor_centavos = valor_centavos
                    actualizadas += 1
    else:
        socios_activos = db.query(Socio).filter(Socio.cuota_social_activa == true()).all()
        for socio in socios_activos:
            if socio.cuota_social_valor_centavos != valor_centavos:
                socio.cuota_social_valor_centavos = valor_centavos
                actualizadas += 1

        cuotas_pendientes = (
            db.query(CuotaSocial)
            .filter(
                CuotaSocial.estado.in_(ESTADOS_CUOTA_SOCIAL_MODIFICABLES),
                CuotaSocial.monto_pagado_centavos == 0,
            )
            .all()
        )
        for cs in cuotas_pendientes:
            if cs.valor_centavos != valor_centavos:
                cs.valor_centavos = valor_centavos
                actualizadas += 1

    if actualizadas > 0:
        db.flush()

    if sincronizar_admin:
        cfg_srv = CuotaSocialConfigService(db)
        if cfg_srv.obtener_valor_default_centavos() != int(valor_centavos):
            cfg_srv.actualizar_configuracion_global(
                valor_default_centavos=int(valor_centavos),
                aplicar_a_activos=False,
                usuario_operador=usuario_operador,
            )
            actualizadas += 1

    return actualizadas


def buscar_cuotas_sociales_candidatas(
    db: Session,
    estados: Sequence[str],
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    fecha_corte: Optional[str] = None,
    ids_filtrados: Optional[Set[int]] = None,
    cuota_social_centavos: Optional[int] = None,
    usuario_operador: Optional[str] = None,
) -> List[Tuple[CuotaSocial, Socio]]:
    """
    Asegura los períodos mensuales activos hasta la fecha solicitada y devuelve las
    tuplas ``(CuotaSocial, Socio)`` elegibles según estado y rango de fechas.
    """
    actualizadas = 0
    if cuota_social_centavos is not None and cuota_social_centavos > 0:
        actualizadas = aplicar_valor_cuota_social_vigente(
            db=db,
            valor_centavos=int(cuota_social_centavos),
            usuario_operador=usuario_operador,
        )

    fh = parsear_fecha_iso(fecha_hasta or fecha_corte)
    creadas = CuotaSocialService(db).asegurar_periodos_hasta(
        fecha_hasta=fh or date.today(),
        commit=True,
    )
    if actualizadas > 0 and creadas == 0:
        db.commit()

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
