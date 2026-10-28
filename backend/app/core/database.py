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


def _asegurar_columnas_criticas(db_engine):
    """Aplica DDL defensivo e idempotente para columnas agregadas recientemente."""
    if db_engine.dialect.name != "mssql":
        return
    sql_patches = [
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cuotas')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cuotas') AND name = 'movimiento_coopya_id')
                ALTER TABLE cuotas ADD movimiento_coopya_id INT NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cuotas') AND name = 'desglose_coopya_id')
                ALTER TABLE cuotas ADD desglose_coopya_id INT NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cuotas') AND name = 'calculo_exacto')
                ALTER TABLE cuotas ADD calculo_exacto NVARCHAR(MAX) NULL;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'socios')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cbu')
                ALTER TABLE socios ADD cbu VARCHAR(22) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'alias_cbu')
                ALTER TABLE socios ADD alias_cbu VARCHAR(50) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'banco_nombre')
                ALTER TABLE socios ADD banco_nombre VARCHAR(100) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'titular_verificado')
                ALTER TABLE socios ADD titular_verificado BIT NOT NULL CONSTRAINT DF_socios_titular_verificado DEFAULT 0;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'respuestas_bancarias_archivos')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('respuestas_bancarias_archivos') AND name = 'archivo_original')
                ALTER TABLE respuestas_bancarias_archivos ADD archivo_original VARBINARY(MAX) NULL;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'motores_calculo')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('motores_calculo') AND name = 'redondeo_cuota')
                ALTER TABLE motores_calculo ADD redondeo_cuota VARCHAR(50) NULL;
        END
        """,
        # SQL Server compila cada lote antes de ejecutarlo. El UPDATE debe
        # compilarse después del ALTER, cuando la columna ya existe.
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'motores_calculo')
        BEGIN
            UPDATE motores_calculo SET redondeo_cuota = 'CON_CENTAVOS' WHERE redondeo_cuota IS NULL;
        END
        """
    ]
    try:
        with db_engine.begin() as conn:
            for patch in sql_patches:
                conn.execute(text(patch))
        logger.info("Verificación de columnas críticas completada con éxito.")
    except Exception:
        logger.exception("No se pudieron verificar las columnas críticas de SQL Server.")
        raise


def _ejecutar_migraciones_alembic():
    """Ejecuta programáticamente las migraciones de Alembic si existen."""
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        command.upgrade(alembic_cfg, "head")
        logger.info("Migraciones de Alembic aplicadas exitosamente.")
    except Exception as e:
        logger.warning(f"Aviso al correr migraciones Alembic automáticamente: {e}")


def init_db(base, db_engine, retries: int = 10, delay: int = 2):
    """Espera a que SQL Server esté listo y crea todas las tablas declaradas."""
    ensure_sqlserver_db_exists(settings.DATABASE_URL)

    for attempt in range(1, retries + 1):
        try:
            base.metadata.create_all(bind=db_engine)
            _asegurar_columnas_criticas(db_engine)
            _ejecutar_migraciones_alembic()
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
