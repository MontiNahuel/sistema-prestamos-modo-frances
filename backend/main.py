from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.router import router as api_v1_router
# Importar modelos para que Base.metadata los reconozca
import app.models.prestamo
import app.models.motor_calculo
import app.models.linea_prestamo
from app.services.seed_service import seed_motores_y_lineas


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de tablas y semillas al arrancar
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_motores_y_lineas(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Permitir CORS para desarrollo con el Frontend de Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "ok", "service": "microservicio-prestamos-frances"}
