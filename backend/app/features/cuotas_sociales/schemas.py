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
    valor_centavos: Optional[int] = Field(default=None, gt=0)
    prestamo_id: Optional[str] = None
    fecha_primer_vencimiento: Optional[date] = None


class BajaCuotaSocialRequest(BaseModel):
    motivo: Optional[str] = None


class GenerarPeriodosCuotaSocialRequest(BaseModel):
    fecha_hasta: Optional[date] = None


class CuotaSocialConfigResponse(BaseModel):
    valor_default_centavos: int
    fecha_actualizacion: Optional[datetime] = None
    actualizado_por: Optional[str] = None
    socios_activos_count: int = 0
    cuotas_pendientes_modificables_count: int = 0


class ActualizarCuotaSocialConfigRequest(BaseModel):
    valor_default_centavos: int = Field(gt=0)
    aplicar_a_activos: bool = Field(default=False)


class ActualizarCuotaSocialConfigResponse(CuotaSocialConfigResponse):
    valor_anterior_centavos: int
    socios_actualizados: int = 0
    cuotas_pendientes_actualizadas: int = 0


class CuotaSocialSocioActivoItem(BaseModel):
    socio_id: int
    nombre_completo: str
    documento: Optional[str] = None
    valor_centavos: int
    fecha_alta: Optional[datetime] = None
    prestamo_id: Optional[str] = None
    cuotas_pendientes: int = 0


class CuotaSocialSociosActivosResponse(BaseModel):
    total: int
    items: List[CuotaSocialSocioActivoItem]


class CuotaSocialReporteItem(BaseModel):
    id: str
    socio_id: int
    persona_nombre: str
    persona_doc: Optional[str] = None
    prestamo_id: Optional[str] = None
    numero_prestamo: Optional[int] = None
    periodo: str
    fecha_vencimiento: date
    valor_centavos: int
    monto_pagado_centavos: int
    estado: str
    fecha_pago: Optional[datetime] = None
    cuota_social_activa: bool
