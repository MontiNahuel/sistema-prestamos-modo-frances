from fastapi import APIRouter, Depends
from app.features.auth.schemas import LoginRequest
from app.features.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service() -> AuthService:
    return AuthService()


@router.post("/login", summary="Iniciar sesión delegando al Monolito CoopYa")
async def login(
    req: LoginRequest,
    service: AuthService = Depends(get_auth_service)
):
    """
    Autentica al operador contra el sistema central CoopYa.
    Retorna el token oficial de sesión de CoopYa para navegar y operar.
    """
    return await service.login(usuario=req.usuario, contrasena=req.contrasena)
