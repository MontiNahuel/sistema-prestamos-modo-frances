# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.socios.schemas import SocioBase, SocioResponse

__all__ = ["SocioBase", "SocioResponse"]
