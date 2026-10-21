from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Header
from app.features.personas.schemas import PersonaBusquedaRequest
from app.features.personas.service import PersonasService

router = APIRouter(prefix="/personas", tags=["Personas"])


def get_personas_service() -> PersonasService:
    return PersonasService()


@router.post("/buscar", summary="Buscar personas/socios en el Monolito CoopYa")
async def buscar_personas(
    req: PersonaBusquedaRequest,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    service: PersonasService = Depends(get_personas_service)
):
    """Consulta socios en el sistema central CoopYa por nombre, DNI o ID."""
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    return await service.buscar_personas(
        nombre_apellido=req.nombreApellido or "",
        documento=req.documento or "",
        id_persona=req.idPersona,
        token=auth_token
    )


@router.get("/{id_persona}/cuenta-corriente", summary="Consultar saldo y mora de la persona")
async def consultar_cuenta_corriente(
    id_persona: int,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    service: PersonasService = Depends(get_personas_service)
):
    """Consulta el estado de cuenta corriente y morosidad de una persona en CoopYa."""
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    return await service.obtener_cuenta_corriente(id_persona=id_persona, token=auth_token)
