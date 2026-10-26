import os
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings


class CoopYaClient:
    """Cliente HTTP asíncrono para interactuar con la API del Monolito Central CoopYa."""

    def __init__(self, base_url: Optional[str] = None, default_token: Optional[str] = None):
        self.base_url = (base_url or settings.COOPYA_BASE_URL).rstrip("/")
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
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 401:
                    try:
                        return resp.json()
                    except Exception:
                        return {"success": False, "message": "Usuario o contraseña incorrectos."}
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                raise RuntimeError(f"Error HTTP en CoopYa ({e.response.status_code}): {e.response.text}")
            except Exception as e:
                raise RuntimeError(f"Fallo de comunicación con CoopYa: {str(e)}")

    async def buscar_personas(
        self,
        nombre_apellido: str = "",
        documento: str = "",
        id_persona: Optional[int] = None,
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Llama a POST /Personas/BuscarPersona?token={token}"""
        auth_token = token or self.default_token
        url = f"{self.base_url}/Personas/BuscarPersona?token={auth_token}"
        payload = {
            "nombreApellido": nombre_apellido,
            "documento": documento,
            "idPersona": id_persona
        }

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                raise RuntimeError(f"Error HTTP en CoopYa ({e.response.status_code}): {e.response.text}")
            except Exception as e:
                raise RuntimeError(f"Fallo de comunicación con CoopYa: {str(e)}")

    async def obtener_cuenta_corriente_resumen(
        self,
        id_persona: int,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Llama a GET /Personas/GetCuentaCorrienteResumen?idPersona={id}&token={token}"""
        auth_token = token or self.default_token
        url = f"{self.base_url}/Personas/GetCuentaCorrienteResumen"
        params = {
            "idPersona": id_persona,
            "token": auth_token
        }

        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                raise RuntimeError(f"Error HTTP en CoopYa ({e.response.status_code}): {e.response.text}")
            except Exception as e:
                raise RuntimeError(f"Fallo de comunicación con CoopYa: {str(e)}")

    async def crear_persona(
        self,
        datos: Dict[str, Any],
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Da de alta una persona en el Monolito CoopYa.
        Primero intenta POST /Personas/InsertarPersona (endpoint real del monolito con mediosDePago).
        Si responde 404, recurre al endpoint alternativo o fallback simulado.
        """
        auth_token = token or self.default_token
        url_insertar = f"{self.base_url}/Personas/InsertarPersona?token={auth_token}"

        # Estructurar medios de pago al estilo nativo de CoopYa
        medios_de_pago = []
        cbu = datos.get("cbu") or datos.get("alias_cbu")
        if cbu:
            medios_de_pago.append({
                "tipo": 2,  # 2 = CBU
                "valor": str(cbu),
                "predeterminado": True,
                "banco": datos.get("banco_id")
            })

        payload = {
            "numeroDoc": str(datos.get("documento", "")),
            "cuil": datos.get("cuil"),
            "nombre": datos.get("nombre"),
            "apellido": datos.get("apellido"),
            "mail": datos.get("email"),
            "telefono": datos.get("telefono"),
            "calle": datos.get("domicilio"),
            "estado": 1,
            "mediosDePago": medios_de_pago
        }

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                resp = await client.post(url_insertar, json=payload)
                if resp.status_code == 404:
                    # Intento con URL /Personas/Crear
                    url_crear = f"{self.base_url}/Personas/Crear?token={auth_token}"
                    resp = await client.post(url_crear, json=payload)

                if resp.status_code == 404:
                    # Simulación de desarrollo si aún no está desplegado en staging
                    doc = str(datos.get("documento", "0"))
                    mock_id = int(doc[-6:] if len(doc) >= 6 else doc or "1001")
                    return {
                        "idPersona": mock_id,
                        "success": True,
                        "mock": True,
                        "mensaje": "Alta simulada (endpoint pendiente en CoopYa staging)"
                    }
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                raise RuntimeError(f"Error HTTP en CoopYa ({e.response.status_code}): {e.response.text}")
            except Exception as e:
                raise RuntimeError(f"Fallo de comunicación con CoopYa: {str(e)}")


coopya_client = CoopYaClient()
