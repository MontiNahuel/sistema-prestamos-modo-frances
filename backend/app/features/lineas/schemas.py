from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.features.motores.schemas import MotorCalculoResponse


class LineaPrestamoBase(BaseModel):
    codigo: str = Field(..., max_length=50, examples=["PERS_TRADICIONAL"])
    nombre: str = Field(..., max_length=100, examples=["Préstamo Personal"])
    descripcion: Optional[str] = Field(None, max_length=300)
    motor_id: int
    tasa_default: Decimal = Field(..., ge=0, examples=[0.6000])
    alicuota_iva: Decimal = Field(default=Decimal("0.2100"), ge=0, examples=[0.2100])
    permite_override_tasa: bool = True
    monto_minimo_centavos: int = Field(default=1000000, gt=0)
    monto_maximo_centavos: int = Field(default=200000000, gt=0)
    monto_paso_centavos: int = Field(default=100000, gt=0)
    plazo_minimo_meses: int = Field(default=1, gt=0)
    plazo_maximo_meses: int = Field(default=60, gt=0)
    requiere_socio_al_dia: bool = True
    gasto_otorgamiento_pct: Decimal = Field(default=Decimal("0.0000"), ge=0)
    seguro_vida_mensual_pct: Decimal = Field(default=Decimal("0.0000"), ge=0)
    activo: bool = True


class LineaPrestamoCreate(LineaPrestamoBase):
    pass


class LineaPrestamoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    motor_id: Optional[int] = None
    tasa_default: Optional[Decimal] = None
    alicuota_iva: Optional[Decimal] = None
    permite_override_tasa: Optional[bool] = None
    monto_minimo_centavos: Optional[int] = None
    monto_maximo_centavos: Optional[int] = None
    monto_paso_centavos: Optional[int] = None
    plazo_minimo_meses: Optional[int] = None
    plazo_maximo_meses: Optional[int] = None
    requiere_socio_al_dia: Optional[bool] = None
    gasto_otorgamiento_pct: Optional[Decimal] = None
    seguro_vida_mensual_pct: Optional[Decimal] = None
    activo: Optional[bool] = None


class LineaPrestamoResponse(LineaPrestamoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha_creacion: datetime
    motor: Optional[MotorCalculoResponse] = None

    @property
    def tipo_tasa(self) -> str:
        if self.motor and "TEA" in self.motor.convencion_tasa:
            return "TEA"
        return "TNA"
