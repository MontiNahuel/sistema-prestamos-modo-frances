from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


DEFAULT_CUOTA_SOCIAL_CENTAVOS = 550000  # $5.500,00 por defecto


class CuotaSocialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    socio_id: int
    prestamo_id: Optional[str] = None
    periodo: str
    fecha_vencimiento: date
    valor_centavos: int
    monto_pagado_centavos: int
    estado: str
    fecha_pago: Optional[datetime] = None
    fecha_alta: datetime


class SocioCuotaSocialEstadoResponse(BaseModel):
    socio_id: int
    activa: bool
    valor_centavos: int
    prestamo_id: Optional[str] = None
    fecha_alta: Optional[datetime] = None
    fecha_baja: Optional[datetime] = None
    dia_vencimiento: int = 10
    cuotas: List[CuotaSocialResponse] = []


class ActivarCuotaSocialRequest(BaseModel):
    valor_centavos: int = Field(default=DEFAULT_CUOTA_SOCIAL_CENTAVOS, gt=0)
    prestamo_id: Optional[str] = None
    fecha_primer_vencimiento: Optional[date] = None


class BajaCuotaSocialRequest(BaseModel):
    motivo: Optional[str] = None


class GenerarPeriodosCuotaSocialRequest(BaseModel):
    fecha_hasta: Optional[date] = None
