from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.auth.service import AuthService
from app.features.auditoria.schemas import (
    PaginatedAuditoriaPrestamo,
    PaginatedAuditoriaPresentacionBapro,
    PaginatedAuditoriaConfiguracionCredito,
    PaginatedAuditoriaSincronizacionPersona,
)
from app.features.auditoria.repository import AuditoriaRepository
from app.features.auditoria.service import AuditoriaService

router = APIRouter(prefix="/auditoria", tags=["Auditoría Especializada"])


def get_auditoria_service(db: Session = Depends(get_db)) -> AuditoriaService:
    return AuditoriaService(AuditoriaRepository(db))


def verificar_acceso_completo(
    authorization: Optional[str] = Header(None),
    x_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> None:
    """Verifica que el usuario posea el rol 'Acceso Completo' en CoopYa."""
    token = authorization or x_token
    auth_service = AuthService()
    perfil = auth_service.obtener_perfil_por_token(token)
    if not perfil.es_acceso_completo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requiere rol de 'Acceso Completo' para ver la auditoría.",
        )


@router.get(
    "/prestamos",
    response_model=PaginatedAuditoriaPrestamo,
    summary="Auditoría de Préstamos (Paginada)",
)
def listar_auditoria_prestamos(
    prestamo_id: Optional[str] = Query(None, description="Filtrar por UUID de préstamo"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditoriaService = Depends(get_auditoria_service),
    _permiso: None = Depends(verificar_acceso_completo),
):
    items, total = service.listar_prestamos(
        prestamo_id=prestamo_id, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get(
    "/presentaciones-bapro",
    response_model=PaginatedAuditoriaPresentacionBapro,
    summary="Auditoría de Presentaciones BAPRO (Paginada)",
)
def listar_auditoria_presentaciones_bapro(
    nro_archivo: Optional[int] = Query(None, description="Filtrar por número de lote"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditoriaService = Depends(get_auditoria_service),
    _permiso: None = Depends(verificar_acceso_completo),
):
    items, total = service.listar_presentaciones_bapro(
        nro_archivo=nro_archivo, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get(
    "/configuracion-creditos",
    response_model=PaginatedAuditoriaConfiguracionCredito,
    summary="Auditoría de Líneas y Motores (Paginada)",
)
def listar_auditoria_configuracion_creditos(
    tipo_entidad: Optional[str] = Query(None, description="LINEA o MOTOR"),
    entidad_id: Optional[int] = Query(None, description="ID de la línea o motor"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditoriaService = Depends(get_auditoria_service),
    _permiso: None = Depends(verificar_acceso_completo),
):
    items, total = service.listar_configuracion_creditos(
        tipo_entidad=tipo_entidad, entidad_id=entidad_id, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get(
    "/sincronizacion-personas",
    response_model=PaginatedAuditoriaSincronizacionPersona,
    summary="Auditoría de Sincronización de Personas (Paginada)",
)
def listar_auditoria_sincronizacion_personas(
    documento: Optional[str] = Query(None, description="DNI del socio"),
    estado: Optional[str] = Query(None, description="EXITO, ERROR_ORACLE, DESINC_COOPYA"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditoriaService = Depends(get_auditoria_service),
    _permiso: None = Depends(verificar_acceso_completo),
):
    items, total = service.listar_sincronizaciones_persona(
        documento=documento, estado=estado, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("", summary="Consulta general de auditoría (compatibilidad)")
def listar_auditoria_general(
    entidad_nombre: Optional[str] = Query(None),
    entidad_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditoriaService = Depends(get_auditoria_service),
    _permiso: None = Depends(verificar_acceso_completo),
):
    """Endpoint unificado para compatibilidad hacia atrás."""
    if entidad_nombre in ("lineas_prestamo", "motores_calculo"):
        tipo = "LINEA" if "linea" in entidad_nombre else "MOTOR"
        eid = int(entidad_id) if entidad_id and entidad_id.isdigit() else None
        items, total = service.listar_configuracion_creditos(
            tipo_entidad=tipo, entidad_id=eid, limit=limit, offset=offset
        )
        return items
    if entidad_nombre == "prestamos":
        items, _ = service.listar_prestamos(
            prestamo_id=entidad_id, limit=limit, offset=offset
        )
        return items
    if entidad_nombre == "personas":
        items, _ = service.listar_sincronizaciones_persona(
            documento=entidad_id, limit=limit, offset=offset
        )
        return items
    items, _ = service.listar_prestamos(limit=limit, offset=offset)
    return items
