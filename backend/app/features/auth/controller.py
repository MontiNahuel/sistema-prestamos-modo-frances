from typing import Optional
from fastapi import APIRouter, Depends, Header
from app.features.auth.schemas import LoginRequest, UserProfileResponse
from app.features.auth.service import AuthService, OperadorResuelto

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service() -> AuthService:
    return AuthService()


def obtener_operador_opcional(
    authorization: Optional[str] = Header(None),
    x_token: Optional[str] = Header(None, alias="X-Auth-Token"),
    x_user: Optional[str] = Header(None, alias="X-User-Name"),
    x_usuario: Optional[str] = Header(None, alias="X-Usuario-Operador"),
    auth_service: AuthService = Depends(get_auth_service),
) -> OperadorResuelto:
    """Resuelve al operador autenticado para trazabilidad y auditoría."""
    token = authorization or x_token
    fallback = x_user or x_usuario
    return auth_service.resolver_operador(token=token, fallback_usuario=fallback)


@router.post("/login", summary="Iniciar sesión delegando al Monolito CoopYa")
async def login(
    req: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    """
    Autentica al operador contra el sistema central CoopYa.
    Retorna el token oficial de sesión de CoopYa para navegar y operar.
    """
    return await service.login(usuario=req.usuario, contrasena=req.contrasena)


@router.get("/me", response_model=UserProfileResponse, summary="Obtener perfil y roles del usuario activo")
def obtener_perfil_actual(
    authorization: Optional[str] = Header(None),
    x_token: Optional[str] = Header(None, alias="X-Auth-Token"),
    service: AuthService = Depends(get_auth_service),
):
    """
    Retorna el perfil del usuario autenticado en CoopYa, incluyendo si posee el rol 'Acceso Completo'.
    """
    token = authorization or x_token
    return service.obtener_perfil_por_token(token)
