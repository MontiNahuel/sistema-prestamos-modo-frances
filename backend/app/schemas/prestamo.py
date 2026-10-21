from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


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
    linea_id: Optional[int] = None
    linea_nombre: Optional[str] = None
    motor_nombre: Optional[str] = None
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
    cuotas: Optional[List[CuotaResponse]] = None
