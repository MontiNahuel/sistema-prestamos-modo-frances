from typing import Optional
from pydantic import BaseModel, Field


class PersonaBusquedaRequest(BaseModel):
    nombreApellido: Optional[str] = Field(default="", description="Nombre o apellido del socio")
    documento: Optional[str] = Field(default="", description="DNI o documento de identidad")
    idPersona: Optional[int] = Field(default=None, description="ID numérico de la persona")
