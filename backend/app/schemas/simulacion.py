from decimal import Decimal
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    usuario: str = Field(..., description="Nombre de usuario del operador")
    contrasena: str = Field(..., description="Contraseña del operador")


class SimulacionRequest(BaseModel):
    monto_centavos: int = Field(..., gt=0, description="Monto en centavos (ej: 10000000 para $100.000,00)", examples=[10000000])
    plazo_meses: int = Field(..., gt=0, le=120, description="Plazo total en cuotas mensuales", examples=[12])
    tna: Decimal = Field(..., ge=0, description="Tasa Nominal Anual (ej: 0.60 para 60%)", examples=[0.60])
    alicuota_iva: Decimal = Field(default=Decimal("0.21"), ge=0, description="Alícuota de IVA sobre intereses", examples=[0.21])
    fecha_primer_vencimiento: Optional[date] = Field(default=None, description="Fecha estimada de la primera cuota")


class PersonaBusquedaRequest(BaseModel):
    nombreApellido: Optional[str] = Field(default="", description="Nombre o apellido del socio")
    documento: Optional[str] = Field(default="", description="DNI o documento de identidad")
    idPersona: Optional[int] = Field(default=None, description="ID numérico de la persona")
