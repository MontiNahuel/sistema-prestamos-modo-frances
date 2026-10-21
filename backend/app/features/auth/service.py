from typing import Dict, Any
from fastapi import HTTPException, status
from app.integrations.coopya_client import CoopYaClient, coopya_client


class AuthService:
    """Orquesta la autenticación delegada contra el monolito central CoopYa."""

    def __init__(self, client: CoopYaClient = coopya_client):
        self.client = client

    async def login(self, usuario: str, contrasena: str) -> Dict[str, Any]:
        try:
            res = await self.client.validar_login(usuario=usuario, contrasena=contrasena)
            if not res.get("success"):
                mensaje = res.get("message") or "Usuario o contraseña incorrectos en el sistema central."
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=mensaje)
            return res
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"No se pudo conectar con el servicio de autenticación: {str(e)}"
            )
