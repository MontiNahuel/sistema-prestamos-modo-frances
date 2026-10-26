from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class PersonaBusquedaRequest(BaseModel):
    nombreApellido: Optional[str] = Field(default="", description="Nombre o apellido del socio")
    documento: Optional[str] = Field(default="", description="DNI o documento de identidad")
    idPersona: Optional[int] = Field(default=None, description="ID numérico de la persona")


class PersonaCreateRequest(BaseModel):
    documento: str = Field(..., min_length=6, max_length=15, description="Número de DNI o documento")
    cuil: Optional[str] = Field(default=None, max_length=15, description="CUIL del socio")
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombres")
    apellido: str = Field(..., min_length=2, max_length=100, description="Apellidos")
    email: Optional[str] = Field(default=None, max_length=120, description="Correo electrónico")
    telefono: Optional[str] = Field(default=None, max_length=50, description="Teléfono de contacto")
    domicilio: Optional[str] = Field(default=None, max_length=200, description="Domicilio legal o particular")
    cbu: Optional[str] = Field(default=None, max_length=22, description="CBU bancario (22 dígitos)")
    alias_cbu: Optional[str] = Field(default=None, max_length=50, description="Alias bancario")
    banco_id: Optional[int] = Field(default=None, description="ID del banco en TipoBancos")
    banco_nombre: Optional[str] = Field(default=None, max_length=100, description="Nombre de la entidad bancaria")
    datos_extra: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadatos complementarios")


class PersonaCreateResponse(BaseModel):
    success: bool
    documento: str
    nombre_completo: str
    oracle_id: Optional[Union[str, int]] = None
    coopya_id: Optional[Union[str, int]] = None
    cbu: Optional[str] = None
    alias_cbu: Optional[str] = None
    banco_id: Optional[int] = None
    banco_nombre: Optional[str] = None
    medio_de_pago_id: Optional[int] = None
    oracle_ok: bool = False
    coopya_ok: bool = False
    mensaje: str
