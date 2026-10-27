from fastapi import APIRouter
from app.features.auth.controller import router as auth_router
from app.features.personas.controller import router as personas_router
from app.features.simulaciones.controller import router as simulaciones_router
from app.features.motores.controller import router as motores_router
from app.features.lineas.controller import router as lineas_router
from app.features.prestamos.controller import router as prestamos_router
from app.features.auditoria.controller import router as auditoria_router
from app.features.presentaciones_bapro.controller import router as presentaciones_bapro_router
from app.features.presentaciones_bna.controller import router as presentaciones_bna_router
from app.features.empresas.controller import router as empresas_router
from app.features.respuestas_bancarias.controller import router as respuestas_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(personas_router)
router.include_router(simulaciones_router)
router.include_router(motores_router)
router.include_router(lineas_router)
router.include_router(prestamos_router)
router.include_router(auditoria_router)
router.include_router(presentaciones_bapro_router)
router.include_router(presentaciones_bna_router)
router.include_router(empresas_router)
router.include_router(respuestas_router)
