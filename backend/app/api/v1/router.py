from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional, List, Any
from app.schemas.simulacion import SimulacionRequest, PersonaBusquedaRequest, LoginRequest
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, PlanAmortizacion
from app.integrations.coopya_client import coopya_client

router = APIRouter()


@router.post("/auth/login", summary="Iniciar sesión delegando al Monolito CoopYa")
async def login(req: LoginRequest):
    """
    Autentica al operador contra el sistema central CoopYa.
    Retorna el token oficial de sesión de CoopYa para navegar y operar.
    """
    try:
        res = await coopya_client.validar_login(usuario=req.usuario, contrasena=req.contrasena)
        if not res.get("success"):
            mensaje = res.get("message") or "Usuario o contraseña incorrectos en el sistema central."
            raise HTTPException(status_code=401, detail=mensaje)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar con el servicio de autenticación: {str(e)}")


@router.post("/simulaciones", response_model=PlanAmortizacion, summary="Simular préstamo en Sistema Francés (Centavos)")
def simular_prestamo(req: SimulacionRequest):
    try:
        return CalculadoraFrances.calcular_simulacion(
            monto_centavos=req.monto_centavos,
            plazo_meses=req.plazo_meses,
            tna=req.tna,
            alicuota_iva=req.alicuota_iva,
            fecha_primer_vencimiento=req.fecha_primer_vencimiento
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/personas/buscar", summary="Buscar personas/socios en el Monolito CoopYa")
async def buscar_personas(
    req: PersonaBusquedaRequest,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None)
):
    """
    Busca socios en tiempo real en CoopYa.
    El token se puede enviar como query param (?token=...) o como Bearer header.
    """
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    try:
        resultados = await coopya_client.buscar_personas(
            nombre_apellido=req.nombreApellido or "",
            documento=req.documento or "",
            id_persona=req.idPersona,
            token=auth_token
        )
        return resultados
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error consultando al sistema central: {str(e)}")


@router.get("/personas/{id_persona}/cuenta-corriente", summary="Consultar saldo y mora de la persona")
async def consultar_cuenta_corriente(
    id_persona: int,
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None)
):
    auth_token = token
    if not auth_token and authorization:
        auth_token = authorization.replace("Bearer ", "").strip()

    try:
        return await coopya_client.obtener_cuenta_corriente_resumen(id_persona=id_persona, token=auth_token)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error consultando cuenta corriente: {str(e)}")
