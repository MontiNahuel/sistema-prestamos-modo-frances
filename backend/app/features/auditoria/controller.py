from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.auditoria.schemas import HistorialCambioResponse
from app.features.auditoria.repository import HistorialCambiosRepository
from app.features.auditoria.service import HistorialCambiosService

router = APIRouter(prefix="/auditoria", tags=["Historial de Cambios y Auditoría"])


def get_auditoria_service(db: Session = Depends(get_db)) -> HistorialCambiosService:
    repository = HistorialCambiosRepository(db)
    return HistorialCambiosService(repository)


@router.get("", response_model=List[HistorialCambioResponse], summary="Consultar historial de cambios y auditoría")
def listar_historial(
    entidad_nombre: Optional[str] = Query(None, description="Filtrar por entidad (ej: lineas_prestamo, prestamos, motores_calculo)"),
    entidad_id: Optional[str] = Query(None, description="Filtrar por ID de la entidad"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: HistorialCambiosService = Depends(get_auditoria_service)
):
    """
    Retorna los eventos de auditoría y modificaciones registradas con snapshots JSON.
    """
    return service.listar(
        entidad_nombre=entidad_nombre,
        entidad_id=entidad_id,
        limit=limit,
        offset=offset
    )
