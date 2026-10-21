from fastapi import APIRouter, HTTPException, Query, Header, Depends
from typing import Optional, List, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.simulacion import SimulacionRequest, PersonaBusquedaRequest, LoginRequest
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, PlanAmortizacion, MotorConfig
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual
from app.integrations.coopya_client import coopya_client
from app.models.motor_calculo import MotorCalculo
from app.models.linea_prestamo import LineaPrestamo
from app.api.v1.motores import router as motores_router
from app.api.v1.lineas import router as lineas_router
from app.api.v1.prestamos import router as prestamos_router

router = APIRouter()

# Incluir sub-routers granulares
router.include_router(motores_router)
router.include_router(lineas_router)
router.include_router(prestamos_router)


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


@router.post("/simulaciones", response_model=PlanAmortizacion, summary="Simular préstamo en Sistema Francés")
def simular_prestamo(req: SimulacionRequest, db: Session = Depends(get_db)):
    """
    Calcula la tabla de amortización completa bajo el Sistema Francés con IVA y ajuste de centavos.
    Permite asociar dinámicamente un motor de fórmula o una línea de crédito configurada en el ABM.
    """
    try:
        cfg = MotorConfig()

        # Si se especificó una línea de préstamo, obtenemos su motor
        if req.linea_id:
            linea = db.query(LineaPrestamo).filter(LineaPrestamo.id == req.linea_id).first()
            if linea and linea.motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(linea.motor.convencion_tasa),
                    base_dias=BaseDias(linea.motor.base_dias),
                    modalidad_iva=ModalidadIva(linea.motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(linea.motor.ajuste_residual)
                )

        # Si se especificó un motor puntual, tiene precedencia
        elif req.motor_id:
            motor = db.query(MotorCalculo).filter(MotorCalculo.id == req.motor_id).first()
            if motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(motor.convencion_tasa),
                    base_dias=BaseDias(motor.base_dias),
                    modalidad_iva=ModalidadIva(motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(motor.ajuste_residual)
                )

        return CalculadoraFrances.calcular(
            monto_centavos=req.monto_centavos,
            plazo_meses=req.plazo_meses,
            tasa_anual=req.tna,
            alicuota_iva=req.alicuota_iva,
            config=cfg,
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
