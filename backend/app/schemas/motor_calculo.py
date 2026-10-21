# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.motores.schemas import (
    MotorCalculoBase,
    MotorCalculoCreate,
    MotorCalculoUpdate,
    MotorCalculoResponse
)

__all__ = [
    "MotorCalculoBase",
    "MotorCalculoCreate",
    "MotorCalculoUpdate",
    "MotorCalculoResponse"
]
