from typing import List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    usuario: str = Field(..., description="Nombre de usuario del operador")
    contrasena: str = Field(..., description="Contraseña del operador")


class UserProfileResponse(BaseModel):
    id: int
    usuario: str
    mail: Optional[str] = None
    roles: List[str] = []
    es_acceso_completo: bool = False
