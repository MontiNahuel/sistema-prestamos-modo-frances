# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.lineas.model import LineaPrestamo

__all__ = ["LineaPrestamo"]
