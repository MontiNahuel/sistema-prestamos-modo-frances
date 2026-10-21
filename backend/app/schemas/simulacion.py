# Re-export para mantener retrocompatibilidad mientras se migran las demás capas
from app.features.simulaciones.schemas import SimulacionRequest
from app.features.auth.schemas import LoginRequest
from app.features.personas.schemas import PersonaBusquedaRequest

__all__ = ["SimulacionRequest", "LoginRequest", "PersonaBusquedaRequest"]
