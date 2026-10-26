from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.empresas.schemas import (
    EmpresaOriginanteCreate,
    EmpresaOriginanteUpdate,
    EmpresaOriginanteResponse,
)
from app.features.empresas.service import EmpresaOriginanteService

router = APIRouter(prefix="/empresas-originantes", tags=["Empresas Originantes"])


def get_service(db: Session = Depends(get_db)) -> EmpresaOriginanteService:
    return EmpresaOriginanteService(db)


@router.get("", response_model=List[EmpresaOriginanteResponse])
def listar_empresas(
    solo_activas: bool = Query(False, description="Filtrar sólo empresas activas"),
    service: EmpresaOriginanteService = Depends(get_service),
):
    return service.listar(solo_activas=solo_activas)


@router.get("/{empresa_id}", response_model=EmpresaOriginanteResponse)
def obtener_empresa(
    empresa_id: int,
    service: EmpresaOriginanteService = Depends(get_service),
):
    return service.obtener_por_id(empresa_id)


@router.post("", response_model=EmpresaOriginanteResponse, status_code=status.HTTP_201_CREATED)
def crear_empresa(
    dto: EmpresaOriginanteCreate,
    service: EmpresaOriginanteService = Depends(get_service),
):
    return service.crear(dto)


@router.put("/{empresa_id}", response_model=EmpresaOriginanteResponse)
def actualizar_empresa(
    empresa_id: int,
    dto: EmpresaOriginanteUpdate,
    service: EmpresaOriginanteService = Depends(get_service),
):
    return service.actualizar(empresa_id, dto)


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_empresa(
    empresa_id: int,
    service: EmpresaOriginanteService = Depends(get_service),
):
    service.eliminar(empresa_id)
