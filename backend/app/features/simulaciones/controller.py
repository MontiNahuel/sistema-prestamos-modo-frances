from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.simulaciones.schemas import SimulacionRequest
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.simulaciones.service import SimulacionService
from app.domain.calculadoras.sistema_frances import PlanAmortizacion

router = APIRouter(tags=["Simulaciones"])


def get_simulacion_service(db: Session = Depends(get_db)) -> SimulacionService:
    linea_repo = LineaPrestamoRepository(db)
    motor_repo = MotorCalculoRepository(db)
    return SimulacionService(linea_repository=linea_repo, motor_repository=motor_repo)


@router.post("/simulaciones", response_model=PlanAmortizacion, summary="Simular préstamo en Sistema Francés")
def simular_prestamo(
    req: SimulacionRequest,
    service: SimulacionService = Depends(get_simulacion_service)
):
    """
    Calcula la tabla de amortización completa bajo el Sistema Francés con IVA y ajuste de centavos.
    Permite asociar dinámicamente un motor de fórmula o una línea de crédito configurada en el ABM.
    """
    return service.simular(req)
