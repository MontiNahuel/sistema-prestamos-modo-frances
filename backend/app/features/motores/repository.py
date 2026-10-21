from typing import List, Optional
from sqlalchemy.orm import Session
from app.features.motores.model import MotorCalculo


class MotorCalculoRepository:
    """Encapsula todas las operaciones de acceso a datos para motores de cálculo."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, motor_id: int) -> Optional[MotorCalculo]:
        return self.db.query(MotorCalculo).filter(MotorCalculo.id == motor_id).first()

    def get_by_codigo(self, codigo: str) -> Optional[MotorCalculo]:
        return self.db.query(MotorCalculo).filter(MotorCalculo.codigo == codigo).first()

    def list_all(self, solo_activos: bool = False) -> List[MotorCalculo]:
        query = self.db.query(MotorCalculo)
        if solo_activos:
            query = query.filter(MotorCalculo.activo == True)
        return query.order_by(MotorCalculo.id).all()

    def create(self, motor: MotorCalculo) -> MotorCalculo:
        self.db.add(motor)
        self.db.commit()
        self.db.refresh(motor)
        return motor

    def update(self, motor: MotorCalculo) -> MotorCalculo:
        self.db.commit()
        self.db.refresh(motor)
        return motor

    def delete(self, motor: MotorCalculo) -> None:
        self.db.delete(motor)
        self.db.commit()
