from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual, RedondeoCuota


class MotorCalculoBase(BaseModel):
    codigo: str = Field(..., max_length=50, examples=["FRANCES_CLASICO"])
    nombre: str = Field(..., max_length=100, examples=["Francés Tradicional"])
    descripcion: Optional[str] = Field(None, max_length=300)
    convencion_tasa: ConvencionTasa = ConvencionTasa.TNA_PROPORCIONAL
    base_dias: BaseDias = BaseDias.COMERCIAL_30_360
    modalidad_iva: ModalidadIva = ModalidadIva.IVA_DECRECIENTE
    ajuste_residual: AjusteResidual = AjusteResidual.ULTIMA_CUOTA
    redondeo_cuota: RedondeoCuota = RedondeoCuota.CON_CENTAVOS
    activo: bool = True

    @field_validator("redondeo_cuota", mode="before")
    @classmethod
    def normalizar_redondeo(cls, v):
        return v or RedondeoCuota.CON_CENTAVOS


class MotorCalculoCreate(MotorCalculoBase):
    pass


class MotorCalculoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    convencion_tasa: Optional[ConvencionTasa] = None
    base_dias: Optional[BaseDias] = None
    modalidad_iva: Optional[ModalidadIva] = None
    ajuste_residual: Optional[AjusteResidual] = None
    redondeo_cuota: Optional[RedondeoCuota] = None
    activo: Optional[bool] = None


class MotorCalculoResponse(MotorCalculoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    es_sistema: bool
    fecha_creacion: datetime
