from typing import Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.domain.enums import TipoCostoOperativo


class SimulacionRequest(BaseModel):
    monto_centavos: int = Field(..., gt=0, description="Monto en centavos (ej: 10000000 para $100.000,00)", examples=[10000000])
    plazo_meses: int = Field(..., gt=0, le=120, description="Plazo total en cuotas mensuales", examples=[12])
    tna: Decimal = Field(..., ge=0, description="Tasa Nominal/Efectiva Anual (ej: 0.60 para 60%)", examples=[0.60])
    alicuota_iva: Decimal = Field(default=Decimal("0.21"), ge=0, description="Alícuota de IVA sobre intereses", examples=[0.21])
    fecha_primer_vencimiento: Optional[date] = Field(default=None, description="Fecha estimada de la primera cuota")
    motor_id: Optional[int] = Field(default=None, description="ID del motor de fórmula a utilizar")
    linea_id: Optional[int] = Field(default=None, description="ID de la línea de crédito")
    costo_operativo_tipo: TipoCostoOperativo = Field(default=TipoCostoOperativo.FIJO)
    costo_operativo_centavos: int = Field(default=0, ge=0, description="Costo operativo fijo por cuota en centavos")
    costo_operativo_porcentaje: Decimal = Field(default=Decimal("0"), ge=0, description="Porcentaje sobre capital por cuota (ej: 0.015 = 1.5%)")

    @field_validator("costo_operativo_centavos", mode="before")
    @classmethod
    def _default_costo_op_centavos(cls, v):
        return 0 if v is None or v == "" else v

    @field_validator("costo_operativo_porcentaje", mode="before")
    @classmethod
    def _default_costo_op_porcentaje(cls, v):
        return Decimal("0") if v is None or v == "" else v
