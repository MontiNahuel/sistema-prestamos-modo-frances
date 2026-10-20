from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual


class MotorCalculoBase(BaseModel):
    codigo: str = Field(..., max_length=50, examples=["FRANCES_CLASICO"])
    nombre: str = Field(..., max_length=100, examples=["Francés Tradicional"])
    descripcion: Optional[str] = Field(None, max_length=300)
    convencion_tasa: ConvencionTasa = ConvencionTasa.TNA_PROPORCIONAL
    base_dias: BaseDias = BaseDias.COMERCIAL_30_360
    modalidad_iva: ModalidadIva = ModalidadIva.IVA_DECRECIENTE
    ajuste_residual: AjusteResidual = AjusteResidual.ULTIMA_CUOTA
    activo: bool = True


class MotorCalculoCreate(MotorCalculoBase):
    pass


class MotorCalculoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    convencion_tasa: Optional[ConvencionTasa] = None
    base_dias: Optional[BaseDias] = None
    modalidad_iva: Optional[ModalidadIva] = None
    ajuste_residual: Optional[AjusteResidual] = None
    activo: Optional[bool] = None


class MotorCalculoResponse(MotorCalculoBase):
    id: int
    es_sistema: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True
