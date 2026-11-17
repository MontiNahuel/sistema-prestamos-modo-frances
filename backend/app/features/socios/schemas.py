from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TipoBancoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo: str
    activo: bool


class MedioDePagoBase(BaseModel):
    tipo: int = 2  # 1: Descuento, 2: CBU, 3: Tarjeta, 4: Otro
    valor: str
    banco_id: Optional[int] = None
    predeterminado: bool = True
    titular_verificado: bool = False


class MedioDePagoCreate(MedioDePagoBase):
    pass


class MedioDePagoResponse(MedioDePagoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    socio_id: int
    fecha_alta: datetime


class SocioBase(BaseModel):
    id: int
    nombre_completo: str
    documento: Optional[str] = None


class SocioResponse(SocioBase):
    model_config = ConfigDict(from_attributes=True)

    cuota_social_activa: bool = False
    cuota_social_valor_centavos: int = 550000
    cuota_social_prestamo_id: Optional[str] = None
    cuota_social_fecha_alta: Optional[datetime] = None
    cuota_social_fecha_baja: Optional[datetime] = None
    fecha_alta: datetime
    fecha_ultima_actualizacion: datetime
    medios_de_pago: List[MedioDePagoResponse] = []
