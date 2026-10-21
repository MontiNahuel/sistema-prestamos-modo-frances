from typing import List, Optional
from sqlalchemy.orm import Session
from app.features.auditoria.model import HistorialCambio


class HistorialCambiosRepository:
    """Acceso a datos para el registro de auditoría e historial de cambios."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, evento: HistorialCambio) -> HistorialCambio:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def list_filtered(
        self,
        entidad_nombre: Optional[str] = None,
        entidad_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[HistorialCambio]:
        query = self.db.query(HistorialCambio)
        if entidad_nombre:
            query = query.filter(HistorialCambio.entidad_nombre == entidad_nombre)
        if entidad_id:
            query = query.filter(HistorialCambio.entidad_id == str(entidad_id))
        return query.order_by(HistorialCambio.fecha_registro.desc()).offset(offset).limit(limit).all()
