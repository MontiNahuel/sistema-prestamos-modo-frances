from typing import Optional
from fastapi import APIRouter, Depends, Header
from app.features.auth.schemas import LoginRequest, UserProfileResponse
from app.features.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service() -> AuthService:
    return AuthService()


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
