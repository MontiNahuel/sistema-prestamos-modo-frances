from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.integrations.coopya_client import CoopYaClient, coopya_client


class PersonasService:
    """Orquesta las consultas del padrón de personas y cuentas corrientes contra el monolito central."""

    def __init__(self, client: CoopYaClient = coopya_client):
        self.client = client

    async def buscar_personas(
        self,
        nombre_apellido: str = "",
        documento: str = "",
        id_persona: Optional[int] = None,
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            return await self.client.buscar_personas(
                nombre_apellido=nombre_apellido,
                documento=documento,
                id_persona=id_persona,
                token=token
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error consultando al sistema central: {str(e)}"
            )

    async def obtener_cuenta_corriente(
        self,
        id_persona: int,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            return await self.client.obtener_cuenta_corriente_resumen(
                id_persona=id_persona,
                token=token
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error consultando cuenta corriente: {str(e)}"
            )
