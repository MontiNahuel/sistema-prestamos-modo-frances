import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings


class CoopYaClient:
    """Cliente HTTP hacia el monolito CoopYa para operaciones de autenticación y lectura."""

    def __init__(self, base_url: Optional[str] = None, default_token: Optional[str] = None):
        self.base_url = base_url or settings.COOPYA_BASE_URL
        self.default_token = default_token or settings.COOPYA_DEFAULT_TOKEN

    async def validar_login(self, usuario: str, contrasena: str) -> Dict[str, Any]:
        """
        Autentica contra el endpoint real del Monolito: POST /Login/ValidarLogin
        Payload: {"usuario": "...", "contraseña": "..."}
        Retorna: {"success": True, "token": "..."} o {"success": False, "message": "..."}
        """
        url = f"{self.base_url}/Login/ValidarLogin"
        payload = {
            "usuario": usuario,
            "contraseña": contrasena
        }

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def buscar_personas(
        self,
        nombre_apellido: str = "",
        documento: str = "",
        id_persona: Optional[int] = None,
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        auth_token = token or self.default_token
        url = f"{self.base_url}/Personas/BuscarPersona?token={auth_token}"
        payload = {
            "nombreApellido": nombre_apellido,
            "documento": documento,
            "idPersona": id_persona
        }

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def obtener_cuenta_corriente_resumen(
        self,
        id_persona: int,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        auth_token = token or self.default_token
        url = f"{self.base_url}/Personas/GetCuentaCorrienteResumen?idPersona={id_persona}&token={auth_token}"

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()


coopya_client = CoopYaClient()
