from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Header, status, HTTPException
from app.integrations.coopya_db_client import coopya_db_client
from app.features.respuestas_bancarias.controller import operador
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.integrations.coopya_client import coopya_client
from app.integrations.oracle_client import oracle_client
from app.features.auditoria.repository import AuditoriaRepository
from app.features.socios.repository import SocioRepository
from app.features.socios.schemas import TipoBancoResponse
from app.features.personas.schemas import (
    PersonaBusquedaRequest,
    PersonaCreateRequest,
    PersonaCreateResponse
)
from app.features.personas.service import PersonasService

router = APIRouter(prefix="/personas", tags=["Personas"])


def get_personas_service(db: Session = Depends(get_db)) -> PersonasService:
    return PersonasService(
        client=coopya_client,
        oracle=oracle_client,
        auditoria_repo=AuditoriaRepository(db),
        socio_repo=SocioRepository(db)
    )


@router.get("/padron-cooperativa", summary="Consultar padrón de socios")
def consultar_padron_cooperativa(usuario: str = Depends(operador)):
    """Consulta las personas marcadas en el padrón de May en CoopYa."""
    try:
        with coopya_db_client._connection() as conn:
            if conn is None:
                raise RuntimeError("Conexión deshabilitada")
            cursor = conn.cursor()
            cursor.execute("SELECT Id, NroSocio, Apellido, Nombre, NumeroDoc, Cuil, Observaciones FROM dbo.Personas WHERE Observaciones COLLATE Latin1_General_CI_AI LIKE ? ORDER BY Apellido, Nombre, Id", ('%En Padrón de May%',))
            return [dict(zip(('id', 'socio', 'apellido', 'nombre', 'documento', 'cuil', 'observacion'), row)) for row in cursor]
    except Exception:
        raise HTTPException(status_code=503, detail="No se pudo consultar el padrón en CoopYa.") from None


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


@router.post(
    "",
    response_model=PersonaCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear persona con orden estricto (Oracle Legacy -> Monolito CoopYa)"
)
async def crear_persona(
    req: PersonaCreateRequest,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    x_usuario: Optional[str] = Header(default=None, alias="X-Usuario-Operador"),
    service: PersonasService = Depends(get_personas_service)
):
    """
    Alta de persona con consistencia estricta:
    1. Impacta primero en la base de datos vieja en Oracle (modo thick). Si falla, no se toca CoopYa.
    2. Si Oracle es exitoso, impacta en el Monolito CoopYa.
    """
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    return await service.crear_persona(
        req=req,
        token=auth_token,
        usuario_operador=x_usuario or "OPERADOR"
    )


@router.get(
    "/bancos",
    response_model=List[TipoBancoResponse],
    summary="Listar catálogo oficial de bancos"
)
def listar_bancos(db: Session = Depends(get_db)):
    """Retorna los bancos oficiales disponibles para asociar al CBU."""
    repo = SocioRepository(db)
    return repo.list_bancos()
