import re
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("Database")

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_sqlserver_db_exists(url: str, retries: int = 15, delay: int = 3):
    """
    Si se ejecuta contra SQL Server (Docker), espera a que el servicio esté listo
    y crea automáticamente la base de datos (ej: PrestamosDB) si aún no existe,
    conectándose inicialmente al catálogo del sistema 'master'.
    """
    if "mssql" not in url.lower() or "(localdb)" in url.lower():
        return

    # Extraer el nombre de la base de datos de la URL
    match = re.search(r"/([^/?]+)(\?|$)", url)
    if not match:
        return
    db_name = match.group(1)
    if db_name.lower() in ("master", "tempdb", "model", "msdb"):
        return

    # Construir URL apuntando a la base de datos del sistema 'master'
    master_url = re.sub(r"/([^/?]+)(\?|$)", r"/master\2", url, count=1)

    logger.info(f"Verificando disponibilidad de SQL Server y base de datos '{db_name}'...")
    master_engine = create_engine(master_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)

    for attempt in range(1, retries + 1):
        try:
            with master_engine.connect() as conn:
                conn.execute(
                    text(
                        f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{db_name}') "
                        f"CREATE DATABASE [{db_name}];"
                    )
                )
            logger.info(f"Base de datos '{db_name}' verificada/creada exitosamente en SQL Server.")
            master_engine.dispose()
            return
        except Exception as e:
            logger.warning(
                f"[Intento {attempt}/{retries}] Esperando a que SQL Server esté listo ({e}). "
                f"Reintentando en {delay}s..."
            )
            time.sleep(delay)

    master_engine.dispose()
    logger.error(f"No fue posible conectar con SQL Server tras {retries} intentos.")
    raise RuntimeError(f"Fallo de conexión a SQL Server tras {retries} intentos.")


def init_db(base, db_engine, retries: int = 10, delay: int = 2):
    """Espera a que SQL Server esté listo y crea todas las tablas declaradas."""
    ensure_sqlserver_db_exists(settings.DATABASE_URL)

    for attempt in range(1, retries + 1):
        try:
            base.metadata.create_all(bind=db_engine)
            logger.info("Tablas de la base de datos creadas/verificadas correctamente.")
            return
        except Exception as e:
            logger.warning(
                f"[Intento {attempt}/{retries}] Esperando para crear tablas ({e}). "
                f"Reintentando en {delay}s..."
            )
            time.sleep(delay)

    raise RuntimeError("No se pudieron crear las tablas de la base de datos.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
