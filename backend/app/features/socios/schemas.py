from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SocioBase(BaseModel):
    id: int
    nombre_completo: str
    documento: Optional[str] = None


class SocioResponse(SocioBase):
    model_config = ConfigDict(from_attributes=True)

    fecha_alta: datetime
    fecha_ultima_actualizacion: datetime
