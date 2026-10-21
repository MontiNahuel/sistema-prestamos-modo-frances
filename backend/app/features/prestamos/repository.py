from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.features.prestamos.model import Prestamo, Cuota, PrestamoLineaSnapshot


class PrestamoRepository:
    """Encapsula todas las operaciones de acceso a datos para préstamos, cuotas y snapshots."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, prestamo_id: str) -> Optional[Prestamo]:
        return (
            self.db.query(Prestamo)
            .options(
                joinedload(Prestamo.cuotas),
                joinedload(Prestamo.socio),
                joinedload(Prestamo.linea_snapshot)
            )
            .filter(Prestamo.id == prestamo_id)
            .first()
        )

    def list_filtered(
        self,
        persona_id: Optional[int] = None,
        estado: Optional[str] = None,
        buscar: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Prestamo]:
        query = self.db.query(Prestamo).options(
            joinedload(Prestamo.socio),
            joinedload(Prestamo.linea_snapshot)
        )

        if persona_id is not None:
            query = query.filter(Prestamo.persona_id == persona_id)

        if estado:
            query = query.filter(Prestamo.estado == estado.upper())

        if buscar:
            termino = f"%{buscar.strip()}%"
            query = query.filter(
                (Prestamo.persona_nombre.ilike(termino)) | (Prestamo.persona_doc.ilike(termino))
            )

        return query.order_by(Prestamo.fecha_alta.desc()).offset(offset).limit(limit).all()

    def create(
        self,
        prestamo: Prestamo,
        cuotas: List[Cuota],
        snapshot: Optional[PrestamoLineaSnapshot] = None
    ) -> Prestamo:
        self.db.add(prestamo)
        if snapshot:
            self.db.add(snapshot)
        for cuota in cuotas:
            self.db.add(cuota)
        self.db.commit()
        self.db.refresh(prestamo)
        return prestamo

    def update(self, prestamo: Prestamo) -> Prestamo:
        self.db.commit()
        self.db.refresh(prestamo)
        return prestamo
