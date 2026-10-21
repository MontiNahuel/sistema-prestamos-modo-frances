from typing import List, Optional
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.motores.schemas import (
    MotorCalculoCreate,
    MotorCalculoUpdate,
    MotorCalculoResponse
)
from app.features.motores.repository import MotorCalculoRepository
from app.features.auditoria.repository import HistorialCambiosRepository
from app.features.auditoria.service import HistorialCambiosService
from app.features.motores.service import MotorCalculoService

router = APIRouter(prefix="/motores", tags=["Motores de Fórmulas"])


def get_motor_service(db: Session = Depends(get_db)) -> MotorCalculoService:
    repository = MotorCalculoRepository(db)
    audit_repo = HistorialCambiosRepository(db)
    audit_service = HistorialCambiosService(audit_repo)
    return MotorCalculoService(repository=repository, auditoria_service=audit_service)


@router.get("", response_model=List[MotorCalculoResponse])
def listar_motores(
    solo_activos: bool = False,
    service: MotorCalculoService = Depends(get_motor_service)
):
    """Lista todos los motores de cálculo registrados."""
    return service.listar(solo_activos=solo_activos)


@router.get("/{id}", response_model=MotorCalculoResponse)
def obtener_motor(
    id: int,
    service: MotorCalculoService = Depends(get_motor_service)
):
    """Obtiene el detalle de un motor de cálculo por su identificador."""
    return service.obtener_por_id(id)


@router.post("", response_model=MotorCalculoResponse, status_code=status.HTTP_201_CREATED)
def crear_motor(
    data: MotorCalculoCreate,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: MotorCalculoService = Depends(get_motor_service)
):
    """Registra una nueva variante matemática de cálculo con auditoría."""
    return service.crear(data, usuario_operador=x_user)


@router.put("/{id}", response_model=MotorCalculoResponse)
def actualizar_motor(
    id: int,
    data: MotorCalculoUpdate,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: MotorCalculoService = Depends(get_motor_service)
):
    """Actualiza la configuración de un motor de cálculo con auditoría."""
    return service.actualizar(id, data, usuario_operador=x_user)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_motor(
    id: int,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: MotorCalculoService = Depends(get_motor_service)
):
    """Aplica soft-delete a un motor de cálculo (siempre que no sea de sistema)."""
    service.eliminar(id, usuario_operador=x_user)
    return None
