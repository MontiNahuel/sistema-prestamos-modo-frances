from fastapi import HTTPException, status
from app.features.simulaciones.schemas import SimulacionRequest
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, PlanAmortizacion, MotorConfig
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual


class SimulacionService:
    """Orquesta el cálculo de simulaciones de amortización asociadas a líneas o motores."""

    def __init__(
        self,
        linea_repository: LineaPrestamoRepository,
        motor_repository: MotorCalculoRepository
    ):
        self.linea_repository = linea_repository
        self.motor_repository = motor_repository

    def simular(self, req: SimulacionRequest) -> PlanAmortizacion:
        cfg = MotorConfig()

        # Si se especificó una línea de préstamo, obtenemos su motor
        if req.linea_id:
            linea = self.linea_repository.get_by_id(req.linea_id)
            if linea and linea.motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(linea.motor.convencion_tasa),
                    base_dias=BaseDias(linea.motor.base_dias),
                    modalidad_iva=ModalidadIva(linea.motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(linea.motor.ajuste_residual)
                )

        # Si se especificó un motor puntual, tiene precedencia
        elif req.motor_id:
            motor = self.motor_repository.get_by_id(req.motor_id)
            if motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(motor.convencion_tasa),
                    base_dias=BaseDias(motor.base_dias),
                    modalidad_iva=ModalidadIva(motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(motor.ajuste_residual)
                )

        try:
            return CalculadoraFrances.calcular(
                monto_centavos=req.monto_centavos,
                plazo_meses=req.plazo_meses,
                tasa_anual=req.tna,
                alicuota_iva=req.alicuota_iva,
                config=cfg,
                fecha_primer_vencimiento=req.fecha_primer_vencimiento
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
