# Re-export de schemas
from app.features.prestamos.schemas import (
    CuotaResponse,
    PrestamoLineaSnapshotResponse,
    PrestamoCreate,
    PrestamoResponse
)

__all__ = [
    "CuotaResponse",
    "PrestamoLineaSnapshotResponse",
    "PrestamoCreate",
    "PrestamoResponse"
]
