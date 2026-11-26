from dataclasses import dataclass
import logging
import re
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.core.config import settings
from app.integrations.coopya_client import CoopYaClient, coopya_client
from app.integrations.coopya_db_client import CoopYaDbClient
from app.features.auth.schemas import UserProfileResponse

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OperadorResuelto:
    """Identidad resuelta del operador que ejecuta una acción."""

    id: Optional[int] = None
    usuario: Optional[str] = None


class AuthService:
    """Orquesta la autenticación delegada contra el monolito central CoopYa."""

    def __init__(
        self,
        client: CoopYaClient = coopya_client,
        db_client: Optional[CoopYaDbClient] = None,
    ):
        self.client = client
        self.db_client = db_client or CoopYaDbClient()

    async def login(self, usuario: str, contrasena: str) -> Dict[str, Any]:
        try:
            res = await self.client.validar_login(usuario=usuario, contrasena=contrasena)
            if not res.get("success"):
                mensaje = (
                    res.get("message")
                    or "Usuario o contraseña incorrectos en el sistema central."
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail=mensaje
                )
            return res
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"No se pudo conectar con el servicio de autenticación: {str(e)}",
            )

    @staticmethod
    def limpiar_token(token: Optional[str]) -> str:
        return re.sub(r"^Bearer(?:\s+|$)", "", (token or "").strip(), count=1, flags=re.IGNORECASE).strip()

    def obtener_perfil_por_token(
        self, token: Optional[str]
    ) -> UserProfileResponse:
        """Resuelve el usuario y sus roles desde CoopYaBeta verificando sesión activa."""
        if not token:
            # Fallback desarrollo / testing sin autenticación estricta
            return UserProfileResponse(
                id=1,
                usuario="operador_dev",
                mail="dev@coopya.com.ar",
                roles=["Acceso Completo"],
                es_acceso_completo=True,
                sistema_central_url=settings.COOPYA_BASE_URL,
            )

        token_limpio = self.limpiar_token(token)
        if len(token_limpio) != 36:
            raise HTTPException(401, "Sesión expirada o token inválido en CoopYa.")

        try:
            with self.db_client._connection() as conn:
                if not conn:
                    # En caso de cliente desactivado
                    return UserProfileResponse(
                        id=1,
                        usuario="operador_local",
                        roles=["Acceso Completo"],
                        es_acceso_completo=True,
                        sistema_central_url=settings.COOPYA_BASE_URL,
                    )
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT
                        u.Id AS UsuarioId,
                        u.Usuario,
                        u.Mail,
                        r.IdRol,
                        r.Nombre AS RolNombre
                    FROM dbo.UsuarioSesion s
                    JOIN dbo.Usuarios u ON s.IdUsuario = u.Id
                    LEFT JOIN dbo.UsuarioRoles ur ON u.Id = ur.IdUsuario
                    LEFT JOIN dbo.Roles r ON ur.IdRol = r.IdRol AND r.Activo = 1
                    WHERE s.Token = TRY_CONVERT(UNIQUEIDENTIFIER, ?)
                      AND s.FechaExpiracion > GETDATE()
                      AND u.Activo = 1
                """,
                    (token_limpio,),
                )
                rows = cursor.fetchall()
                if not rows:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Sesión expirada o token inválido en CoopYa.",
                    )

                roles = [r[4] for r in rows if r[4] is not None]
                es_admin = any(
                    r[3] == 1 or "acceso completo" in r[4].lower()
                    for r in rows if r[4] is not None
                )
                return UserProfileResponse(
                    id=rows[0][0],
                    usuario=rows[0][1],
                    mail=rows[0][2],
                    roles=roles,
                    es_acceso_completo=es_admin,
                    sistema_central_url=settings.COOPYA_BASE_URL,
                )
        except HTTPException:
            raise
        except Exception as e:
            # Si hay fallo de red con CoopYa, permitir fallback si es token de test
            if "test" in token_limpio.lower():
                return UserProfileResponse(
                    id=1,
                    usuario="test_operator",
                    roles=["Acceso Completo"],
                    es_acceso_completo=True,
                    sistema_central_url=settings.COOPYA_BASE_URL,
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al verificar perfil de usuario en CoopYa: {str(e)}",
            )

    def resolver_operador(
        self,
        token: Optional[str],
        fallback_usuario: Optional[str] = None,
    ) -> OperadorResuelto:
        """Resuelve el operador activo priorizando el token de sesión sobre headers auxiliares."""
        fallback = (
            fallback_usuario.strip()
            if fallback_usuario and fallback_usuario.strip()
            else None
        )
        token_limpio = self.limpiar_token(token)
        if not token_limpio:
            return OperadorResuelto(id=None, usuario=fallback)

        try:
            perfil = self.obtener_perfil_por_token(token_limpio)
        except HTTPException as exc:
            logger.warning(
                "No se pudo resolver el operador desde el token (%s); usando fallback.",
                exc.status_code,
            )
            return OperadorResuelto(id=None, usuario=fallback)

        if not self.db_client.enabled and fallback:
            return OperadorResuelto(id=perfil.id, usuario=fallback)
        return OperadorResuelto(id=perfil.id, usuario=perfil.usuario or fallback)
