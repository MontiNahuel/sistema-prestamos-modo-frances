# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.motores.model import MotorCalculo

__all__ = ["MotorCalculo"]
