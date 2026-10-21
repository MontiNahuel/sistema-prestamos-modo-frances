from fastapi import APIRouter
from app.features.auth.controller import router as auth_router
from app.features.personas.controller import router as personas_router
from app.features.simulaciones.controller import router as simulaciones_router
from app.features.motores.controller import router as motores_router
from app.features.lineas.controller import router as lineas_router
from app.features.prestamos.controller import router as prestamos_router
from app.features.auditoria.controller import router as auditoria_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(personas_router)
router.include_router(simulaciones_router)
router.include_router(motores_router)
router.include_router(lineas_router)
router.include_router(prestamos_router)
router.include_router(auditoria_router)
