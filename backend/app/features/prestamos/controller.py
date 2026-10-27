import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Header, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.prestamos.schemas import PrestamoCreate, PrestamoResponse
from app.features.prestamos.repository import PrestamoRepository
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService
from app.features.auditoria.repository import HistorialCambiosRepository
from app.features.auditoria.service import HistorialCambiosService
from app.features.prestamos.service import PrestamoService

router = APIRouter(prefix="/prestamos", tags=["Préstamos Otorgados"])
logger = logging.getLogger("PrestamosController")


def get_prestamo_service(db: Session = Depends(get_db)) -> PrestamoService:
    prestamo_repo = PrestamoRepository(db)
    linea_repo = LineaPrestamoRepository(db)
    motor_repo = MotorCalculoRepository(db)
    socio_repo = SocioRepository(db)
    socio_service = SocioService(socio_repo)
    auditoria_repo = HistorialCambiosRepository(db)
    auditoria_service = HistorialCambiosService(auditoria_repo)

    return PrestamoService(
        repository=prestamo_repo,
        linea_repository=linea_repo,
        motor_repository=motor_repo,
        socio_service=socio_service,
        auditoria_service=auditoria_service
    )


@router.post("", response_model=PrestamoResponse, status_code=status.HTTP_201_CREATED, summary="Otorgar un nuevo préstamo oficial")
def otorgar_prestamo(
    req: PrestamoCreate,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: PrestamoService = Depends(get_prestamo_service)
):
    """
    Otorga un préstamo formalmente: calcula el plan de amortización exacto en centavos,
    persiste el contrato junto con sus cuotas y el snapshot legal inmutable, y audita el evento.
    """
    try:
        return service.otorgar_prestamo(req, usuario_operador=x_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado al otorgar préstamo: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al otorgar préstamo: {str(e)}"
        )


@router.get("", response_model=List[PrestamoResponse], summary="Listar préstamos otorgados")
def listar_prestamos(
    persona_id: Optional[int] = Query(None, description="Filtrar por ID de persona"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (ACTIVO, FINALIZADO, CANCELADO)"),
    buscar: Optional[str] = Query(None, description="Búsqueda por nombre o documento del socio"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: PrestamoService = Depends(get_prestamo_service)
):
    """Retorna el listado histórico de préstamos otorgados con paginación y filtros."""
    return service.listar(
        persona_id=persona_id,
        estado=estado,
        buscar=buscar,
        limit=limit,
        offset=offset
    )


@router.get("/{prestamo_id}", response_model=PrestamoResponse, summary="Obtener detalle y cuotas de un préstamo")
def obtener_prestamo(
    prestamo_id: str,
    service: PrestamoService = Depends(get_prestamo_service)
):
    """Retorna la información completa de un préstamo junto con todas sus cuotas y estados de pago."""
    return service.obtener_por_id(prestamo_id)


@router.post("/{prestamo_id}/cancelar", response_model=PrestamoResponse, summary="Cancelar un préstamo otorgado")
def cancelar_prestamo(
    prestamo_id: str,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: PrestamoService = Depends(get_prestamo_service)
):
    """Cancela un préstamo y sus cuotas pendientes con auditoría."""
    return service.cancelar(prestamo_id, usuario_operador=x_user)


@router.post("/{prestamo_id}/cuotas/{numero_cuota}/pagar", response_model=PrestamoResponse, summary="Registrar cobro de una cuota")
def pagar_cuota(
    prestamo_id: str,
    numero_cuota: int,
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    service: PrestamoService = Depends(get_prestamo_service)
):
    """Registra el pago de una cuota del préstamo, actualiza el saldo deudor y audita el cobro."""
    return service.pagar_cuota(prestamo_id=prestamo_id, numero_cuota=numero_cuota, usuario_operador=x_user)
