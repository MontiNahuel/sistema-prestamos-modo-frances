# Re-export de schemas
from app.features.lineas.schemas import (
    LineaPrestamoBase,
    LineaPrestamoCreate,
    LineaPrestamoUpdate,
    LineaPrestamoResponse
)

__all__ = [
    "LineaPrestamoBase",
    "LineaPrestamoCreate",
    "LineaPrestamoUpdate",
    "LineaPrestamoResponse"
]
