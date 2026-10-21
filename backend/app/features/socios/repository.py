from typing import Optional
from sqlalchemy.orm import Session
from app.features.socios.model import Socio


class SocioRepository:
    """Encapsula todas las operaciones de acceso a datos para la tabla sombra de socios."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, persona_id: int) -> Optional[Socio]:
        return self.db.query(Socio).filter(Socio.id == persona_id).first()

    def create(self, socio: Socio) -> Socio:
        self.db.add(socio)
        self.db.flush()
        return socio

    def update(self, socio: Socio) -> Socio:
        self.db.flush()
        return socio
