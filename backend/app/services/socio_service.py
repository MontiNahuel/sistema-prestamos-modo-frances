from typing import Optional
from sqlalchemy.orm import Session
from app.features.socios.model import Socio
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService


def sincronizar_socio_titular(
    db: Session,
    persona_id: int,
    nombre_completo: str,
    documento: Optional[str] = None
) -> Socio:
    """Función helper retrocompatible."""
    repo = SocioRepository(db)
    service = SocioService(repo)
    return service.sincronizar_socio_titular(
        persona_id=persona_id,
        nombre_completo=nombre_completo,
        documento=documento
    )
