from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.features.lineas.model import LineaPrestamo


class LineaPrestamoRepository:
    """Encapsula todas las operaciones de acceso a datos para líneas de préstamos."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, linea_id: int) -> Optional[LineaPrestamo]:
        return (
            self.db.query(LineaPrestamo)
            .options(joinedload(LineaPrestamo.motor))
            .filter(LineaPrestamo.id == linea_id)
            .first()
        )

    def get_by_codigo(self, codigo: str) -> Optional[LineaPrestamo]:
        return self.db.query(LineaPrestamo).filter(LineaPrestamo.codigo == codigo).first()

    def list_all(self, solo_activas: bool = False) -> List[LineaPrestamo]:
        query = self.db.query(LineaPrestamo).options(joinedload(LineaPrestamo.motor))
        if solo_activas:
            query = query.filter(LineaPrestamo.activo == True)
        return query.order_by(LineaPrestamo.id).all()

    def create(self, linea: LineaPrestamo) -> LineaPrestamo:
        self.db.add(linea)
        self.db.commit()
        self.db.refresh(linea)
        return linea

    def update(self, linea: LineaPrestamo) -> LineaPrestamo:
        self.db.commit()
        self.db.refresh(linea)
        return linea

    def delete(self, linea: LineaPrestamo) -> None:
        self.db.delete(linea)
        self.db.commit()
