# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.socios.model import Socio

__all__ = ["Socio"]
