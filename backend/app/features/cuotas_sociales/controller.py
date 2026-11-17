from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.cuotas_sociales.schemas import (
    ActivarCuotaSocialRequest,
    BajaCuotaSocialRequest,
    GenerarPeriodosCuotaSocialRequest,
    SocioCuotaSocialEstadoResponse,
)
from app.features.cuotas_sociales.service import CuotaSocialService

router = APIRouter(prefix="/cuotas-sociales", tags=["Cuotas Sociales"])


def get_cuota_social_service(db: Session = Depends(get_db)) -> CuotaSocialService:
    return CuotaSocialService(db)


@router.get("/socio/{socio_id}", response_model=SocioCuotaSocialEstadoResponse)
def obtener_estado_cuota_social(
    socio_id: int,
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Devuelve el estado de suscripción de Cuota Social y el historial mensual del socio."""
    return service.obtener_estado_socio(socio_id)


@router.post("/socio/{socio_id}/activar", response_model=SocioCuotaSocialEstadoResponse)
def activar_cuota_social(
    socio_id: int,
    req: ActivarCuotaSocialRequest,
    _x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Activa o actualiza la Cuota Social de un socio asegurando el período inicial."""
    return service.activar_socio(
        socio_id=socio_id,
        valor_centavos=req.valor_centavos,
        prestamo_id=req.prestamo_id,
        fecha_primer_vencimiento=req.fecha_primer_vencimiento,
    )


@router.post("/socio/{socio_id}/baja", response_model=SocioCuotaSocialEstadoResponse)
def baja_cuota_social(
    socio_id: int,
    _req: BajaCuotaSocialRequest = BajaCuotaSocialRequest(),
    _x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Da de baja la Cuota Social de un socio y anula los períodos aún no presentados."""
    return service.dar_baja_socio(socio_id)


@router.post("/generar")
def generar_periodos_pendientes(
    req: GenerarPeriodosCuotaSocialRequest = GenerarPeriodosCuotaSocialRequest(),
    _x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Materializa los períodos mensuales pendientes para socios con Cuota Social activa."""
    creadas = service.asegurar_periodos_hasta(fecha_hasta=req.fecha_hasta)
    return {"generadas": creadas}
