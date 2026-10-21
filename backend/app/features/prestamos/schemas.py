from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.features.socios.schemas import SocioResponse


class CuotaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    numero_cuota: int
    fecha_vencimiento: Optional[date] = None
    saldo_inicial_centavos: int
    capital_centavos: int
    interes_centavos: int
    iva_interes_centavos: int
    cuota_pura_centavos: int
    cuota_total_centavos: int
    saldo_final_centavos: int
    estado: str
    fecha_pago: Optional[datetime] = None
    monto_pagado_centavos: int = 0


class PrestamoLineaSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prestamo_id: str
    linea_id: int
    linea_codigo: str
    linea_nombre: str
    motor_id: int
    motor_nombre: str
    tasa_catalogo_vigente: Decimal
    alicuota_iva: Decimal
    monto_minimo_centavos: int
    monto_maximo_centavos: int
    plazo_minimo_meses: int
    plazo_maximo_meses: int
    reglas_motor_json: Any
    fecha_snapshot: datetime


class PrestamoCreate(BaseModel):
    persona_id: int
    persona_nombre: str
    persona_doc: Optional[str] = None
    monto_solicitado_centavos: int = Field(gt=0)
    plazo_meses: int = Field(gt=0, le=120)
    tna_pactada: Decimal = Field(gt=0)
    alicuota_iva: Decimal = Field(default=Decimal("0.2100"))
    linea_id: Optional[int] = None
    motor_id: Optional[int] = None
    fecha_primer_vencimiento: Optional[date] = None
    observaciones: Optional[str] = None


class PrestamoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    persona_id: int
    persona_nombre: Optional[str] = None
    persona_doc: Optional[str] = None
    monto_solicitado_centavos: int
    plazo_meses: int
    tna_pactada: Decimal
    tem_pactada: Decimal
    alicuota_iva: Decimal
    total_capital_centavos: int
    total_interes_centavos: int
    total_iva_centavos: int
    total_a_pagar_centavos: int
    saldo_deudor_actual_centavos: int
    estado: str
    fecha_alta: datetime
    observaciones: Optional[str] = None
    socio: Optional[SocioResponse] = None
    cuotas: Optional[List[CuotaResponse]] = None
    linea_snapshot: Optional[PrestamoLineaSnapshotResponse] = None
