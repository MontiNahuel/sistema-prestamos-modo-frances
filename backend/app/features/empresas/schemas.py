from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class EmpresaOriginanteBase(BaseModel):
    cuit: str = Field(..., min_length=11, max_length=11, description="CUIT numérico de 11 dígitos")
    razon_social: str = Field(..., max_length=100)
    nombre_fantasia: Optional[str] = Field(None, max_length=50)
    prefijo_archivo: str = Field("EBT_COOPCREDITOYALTDA", max_length=50)
    descripcion_transaccion: str = Field("SERVICI014", max_length=10)
    activo: bool = True
    predeterminado: bool = False


class EmpresaOriginanteCreate(EmpresaOriginanteBase):
    pass


class EmpresaOriginanteUpdate(BaseModel):
    cuit: Optional[str] = Field(None, min_length=11, max_length=11)
    razon_social: Optional[str] = Field(None, max_length=100)
    nombre_fantasia: Optional[str] = None
    prefijo_archivo: Optional[str] = None
    descripcion_transaccion: Optional[str] = None
    activo: Optional[bool] = None
    predeterminado: Optional[bool] = None


class EmpresaOriginanteResponse(EmpresaOriginanteBase):
    id: int
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)
