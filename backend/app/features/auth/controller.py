from typing import Optional
from fastapi import APIRouter, Depends, Header
from app.features.auth.schemas import LoginRequest, UserProfileResponse
from app.features.auth.service import AuthService, OperadorResuelto
from app.core.config import settings
from fastapi import HTTPException, Response
from urllib.parse import urlsplit
import base64, hashlib, hmac, json, time, uuid

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service() -> AuthService:
    return AuthService()


def obtener_perfil_verificado(
    authorization: Optional[str] = Header(None),
    x_token: Optional[str] = Header(None, alias="X-Auth-Token"),
    service: AuthService = Depends(get_auth_service),
) -> UserProfileResponse:
    """Exige la misma sesión CoopYa que usa el perfil de la aplicación."""
    token = authorization if authorization is not None else x_token
    if not AuthService.limpiar_token(token):
        raise HTTPException(401, "Iniciá sesión en CoopYa para consultar este reporte.")
    if not settings.COOPYA_DB_ENABLED:
        raise HTTPException(503, "La verificación de sesiones CoopYa no está configurada.")
    perfil = service.obtener_perfil_por_token(token)
    if perfil.usuario in ("operador_dev", "operador_local", "test_operator"):
        raise HTTPException(401, "Se requiere una sesión verificada de CoopYa.")
    return perfil


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


@router.post('/sso/masivos')
def acceso_masivos(response: Response, authorization: Optional[str] = Header(None), service: AuthService = Depends(get_auth_service)):
    """Emite un JWT breve para el usuario autorizado de CoopYa."""
    if not authorization or not authorization.startswith('Bearer ') or not settings.COOPYA_DB_ENABLED:
        raise HTTPException(401, 'Iniciá sesión para acceder a WhatsApp Masivo.')
    perfil = service.obtener_perfil_por_token(authorization)
    if perfil.usuario in ('operador_dev', 'operador_local', 'test_operator') or not perfil.es_acceso_completo:
        raise HTTPException(403, 'No tenés permiso para acceder a WhatsApp Masivo.')
    destino = settings.MASIVOS_BASE_URL.rstrip('/')
    url = urlsplit(destino)
    if not settings.SSO_SECRET or url.scheme != 'https' or not url.netloc or url.username or url.password or url.query or url.fragment:
        raise HTTPException(503, 'WhatsApp Masivo aún no está configurado.')
    if not perfil.usuario or len(perfil.usuario) > 200:
        raise HTTPException(400, 'No se pudo identificar al usuario.')
    ahora = int(time.time())
    claims = {'sub': perfil.usuario, 'jti': str(uuid.uuid4()), 'iat': ahora, 'exp': ahora + 60}
    if settings.SSO_ISSUER:
        claims['iss'] = settings.SSO_ISSUER
    def codificar(valor):
        return base64.urlsafe_b64encode(valor).rstrip(b'=').decode('ascii')
    header = codificar(json.dumps({'alg': 'HS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
    payload = codificar(json.dumps(claims, separators=(',', ':')).encode())
    mensaje = f'{header}.{payload}'
    firma = codificar(hmac.new(settings.SSO_SECRET.encode(), mensaje.encode(), hashlib.sha256).digest())
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return {'action': f'{destino}/api/auth/sso', 'token': f'{mensaje}.{firma}'}


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
