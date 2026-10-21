from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    usuario: str = Field(..., description="Nombre de usuario del operador")
    contrasena: str = Field(..., description="Contraseña del operador")
