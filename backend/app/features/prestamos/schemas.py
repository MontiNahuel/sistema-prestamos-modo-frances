from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.features.socios.schemas import SocioResponse
from app.domain.calculadoras.romi import CuotaRomiExacta
from app.domain.enums import TipoCostoOperativo


class CuotaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    numero_cuota: int
    fecha_vencimiento: Optional[date] = None
    saldo_inicial_centavos: int
    capital_centavos: int
    interes_centavos: int
    iva_interes_centavos: int
    costo_operativo_centavos: int = 0
    cuota_pura_centavos: int
    cuota_total_centavos: int
    saldo_final_centavos: int
    calculo_exacto: Optional[CuotaRomiExacta] = None
    estado: str
    fecha_pago: Optional[datetime] = None
    monto_pagado_centavos: int = 0
    movimiento_coopya_id: Optional[int] = None
    desglose_coopya_id: Optional[int] = None


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
    cbu: Optional[str] = None
    banco_id: Optional[int] = None
    monto_solicitado_centavos: int = Field(gt=0)
    plazo_meses: int = Field(gt=0, le=120)
    tna_pactada: Decimal = Field(gt=0)
    alicuota_iva: Decimal = Field(default=Decimal("0.2100"))
    linea_id: Optional[int] = None
    motor_id: Optional[int] = None
    fecha_primer_vencimiento: Optional[date] = None
    observaciones: Optional[str] = None
    costo_operativo_tipo: TipoCostoOperativo = TipoCostoOperativo.FIJO
    costo_operativo_centavos: int = Field(default=0, ge=0)
    costo_operativo_porcentaje: Decimal = Field(default=Decimal("0"), ge=0)
    incluir_cuota_social: bool = True
    cuota_social_centavos: Optional[int] = Field(default=None, ge=0)

    @field_validator("costo_operativo_centavos", mode="before")
    @classmethod
    def _default_costo_op_centavos(cls, v):
        return 0 if v is None or v == "" else v

    @field_validator("costo_operativo_porcentaje", mode="before")
    @classmethod
    def _default_costo_op_porcentaje(cls, v):
        return Decimal("0") if v is None or v == "" else v

    @field_validator("cuota_social_centavos", mode="before")
    @classmethod
    def _default_cuota_social_centavos(cls, v):
        return None if v is None or v == "" else v


class PrestamoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    numero_prestamo: int
    persona_id: int
    persona_nombre: Optional[str] = None
    persona_doc: Optional[str] = None
    monto_solicitado_centavos: int
    plazo_meses: int
    tna_pactada: Decimal
    tem_pactada: Decimal
    alicuota_iva: Decimal
    costo_operativo_tipo: str = "FIJO"
    costo_operativo_centavos: int = 0
    costo_operativo_porcentaje: Decimal = Decimal("0")
    total_capital_centavos: int
    total_interes_centavos: int
    total_iva_centavos: int
    total_costo_operativo_centavos: int = 0
    total_a_pagar_centavos: int
    cft_tna: Decimal = Decimal("0")
    cft_tea: Decimal = Decimal("0")
    saldo_deudor_actual_centavos: int
    estado: str
    fecha_alta: datetime
    observaciones: Optional[str] = None
    socio: Optional[SocioResponse] = None
    cuotas: Optional[List[CuotaResponse]] = None
    linea_snapshot: Optional[PrestamoLineaSnapshotResponse] = None
