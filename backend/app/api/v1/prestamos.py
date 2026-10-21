# Re-export para mantener retrocompatibilidad mientras se migran las demás features
from app.features.prestamos.controller import router

__all__ = ["router"]
