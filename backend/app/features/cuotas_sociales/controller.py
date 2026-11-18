from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.auth.controller import obtener_operador_opcional
from app.features.auth.service import OperadorResuelto
from app.features.cuotas_sociales.schemas import (
    ActivarCuotaSocialRequest,
    ActualizarCuotaSocialConfigRequest,
    ActualizarCuotaSocialConfigResponse,
    BajaCuotaSocialRequest,
    CuotaSocialConfigResponse,
    CuotaSocialReporteItem,
    CuotaSocialSociosActivosResponse,
    GenerarPeriodosCuotaSocialRequest,
    SocioCuotaSocialEstadoResponse,
)
from app.features.cuotas_sociales.service import CuotaSocialService

router = APIRouter(prefix="/cuotas-sociales", tags=["Cuotas Sociales"])


def get_cuota_social_service(db: Session = Depends(get_db)) -> CuotaSocialService:
    return CuotaSocialService(db)


@router.get("/configuracion", response_model=CuotaSocialConfigResponse)
def obtener_configuracion_cuota_social(
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Obtiene el valor por defecto vigente de Cuota Social y el resumen del padrón activo."""
    return service.obtener_configuracion_global()


@router.put("/configuracion", response_model=ActualizarCuotaSocialConfigResponse)
def actualizar_configuracion_cuota_social(
    req: ActualizarCuotaSocialConfigRequest,
    operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Actualiza el valor por defecto de Cuota Social y opcionalmente los socios activos."""
    return service.actualizar_configuracion_global(
        valor_default_centavos=req.valor_default_centavos,
        aplicar_a_activos=req.aplicar_a_activos,
        usuario_operador=operador.usuario,
    )


@router.get("/activos", response_model=CuotaSocialSociosActivosResponse)
def listar_socios_activos_cuota_social(
    buscar: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Lista los socios con suscripción de Cuota Social activa."""
    return service.listar_socios_activos(buscar=buscar, limit=limit, offset=offset)


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
    _operador: OperadorResuelto = Depends(obtener_operador_opcional),
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
    _operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Da de baja la Cuota Social de un socio y anula los períodos aún no presentados."""
    return service.dar_baja_socio(socio_id)


@router.post("/generar")
def generar_periodos_pendientes(
    req: GenerarPeriodosCuotaSocialRequest = GenerarPeriodosCuotaSocialRequest(),
    _operador: OperadorResuelto = Depends(obtener_operador_opcional),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Materializa los períodos mensuales pendientes para socios con Cuota Social activa."""
    creadas = service.asegurar_periodos_hasta(fecha_hasta=req.fecha_hasta)
    return {"generadas": creadas}


@router.get("/periodos", response_model=List[CuotaSocialReporteItem])
def listar_periodos_reporte(
    desde: date = Query(..., description="Fecha inicial de vencimiento (YYYY-MM-DD)"),
    hasta: date = Query(..., description="Fecha final de vencimiento (YYYY-MM-DD)"),
    incluir_anuladas: bool = Query(default=False),
    service: CuotaSocialService = Depends(get_cuota_social_service),
):
    """Lista los períodos de Cuota Social en el rango consultado sin proyectar meses a futuro."""
    return service.listar_periodos_reporte(
        desde=desde,
        hasta=hasta,
        incluir_anuladas=incluir_anuladas,
    )
