from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, init_db
from app.api.v1.router import router as api_v1_router
# Importar modelos para que Base.metadata los reconozca
import app.features.socios.model
import app.features.prestamos.model
import app.features.motores.model
import app.features.lineas.model
import app.features.auditoria.model
import app.features.presentaciones_bapro.model
import app.features.empresas.model
import app.features.respuestas_bancarias.model
from app.services.seed_service import seed_motores_y_lineas


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de tablas y semillas al arrancar con espera resiliente
    init_db(Base, engine)
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

# Permitir CORS para desarrollo y acceso desde cualquier IP de la red local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Salud"], include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "ok", "service": "microservicio-prestamos-frances"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

