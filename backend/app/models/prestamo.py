# Re-export para mantener compatibilidad
from app.features.prestamos.model import Prestamo, PrestamoLineaSnapshot, Cuota

__all__ = ["Prestamo", "PrestamoLineaSnapshot", "Cuota"]
