from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.auth.controller import obtener_operador_opcional
from app.features.auth.service import OperadorResuelto
from app.features.lineas.schemas import (
    LineaPrestamoCreate,
    LineaPrestamoUpdate,
    LineaPrestamoResponse
)
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.auditoria.repository import HistorialCambiosRepository
from app.features.auditoria.service import HistorialCambiosService
from app.features.lineas.service import LineaPrestamoService

router = APIRouter(prefix="/lineas", tags=["Líneas de Préstamos"])


def get_linea_service(db: Session = Depends(get_db)) -> LineaPrestamoService:
    linea_repo = LineaPrestamoRepository(db)
    motor_repo = MotorCalculoRepository(db)
    audit_repo = HistorialCambiosRepository(db)
    audit_service = HistorialCambiosService(audit_repo)
    return LineaPrestamoService(
        repository=linea_repo,
        motor_repository=motor_repo,
        auditoria_service=audit_service
    )


@router.get("", response_model=List[LineaPrestamoResponse])
def listar_lineas(
    solo_activas: bool = False,
    service: LineaPrestamoService = Depends(get_linea_service)
):
    """Lista todas las líneas de crédito registradas."""
    return service.listar(solo_activas=solo_activas)


@router.get("/{id}", response_model=LineaPrestamoResponse)
def obtener_linea(
    id: int,
    service: LineaPrestamoService = Depends(get_linea_service)
):
    """Obtiene el detalle de una línea de crédito por su identificador."""
    return service.obtener_por_id(id)


@router.post("", response_model=LineaPrestamoResponse, status_code=status.HTTP_201_CREATED)
def crear_linea(
    data: LineaPrestamoCreate,
    operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: LineaPrestamoService = Depends(get_linea_service)
):
    """Crea y registra una nueva línea comercial de crédito con auditoría."""
    return service.crear(data, usuario_operador=operador.usuario)


@router.put("/{id}", response_model=LineaPrestamoResponse)
def actualizar_linea(
    id: int,
    data: LineaPrestamoUpdate,
    operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: LineaPrestamoService = Depends(get_linea_service)
):
    """Actualiza la configuración comercial de una línea de crédito con auditoría."""
    return service.actualizar(id, data, usuario_operador=operador.usuario)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_linea(
    id: int,
    operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: LineaPrestamoService = Depends(get_linea_service)
):
    """Aplica soft-delete a una línea de crédito con auditoría."""
    service.eliminar(id, usuario_operador=operador.usuario)
    return None
