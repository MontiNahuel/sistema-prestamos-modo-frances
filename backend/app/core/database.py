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
        """,
        # numero_prestamo (migración b7d4c2e91a10). Se replica acá porque el
        # arranque solo advierte si Alembic falla y la columna quedaría ausente.
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'prestamos')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'numero_prestamo')
                ALTER TABLE prestamos ADD numero_prestamo INT NULL;
        END
        """,
        """
        DECLARE @base INT = ISNULL((SELECT MAX(numero_prestamo) FROM prestamos), 0);
        ;WITH pendientes AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY fecha_alta, id) AS rn
            FROM prestamos
            WHERE numero_prestamo IS NULL
        )
        UPDATE p
           SET numero_prestamo = @base + pen.rn
          FROM prestamos p
          JOIN pendientes pen ON pen.id = p.id;
        """,
        """
        IF EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('prestamos')
              AND name = 'numero_prestamo'
              AND is_nullable = 1
        )
            ALTER TABLE prestamos ALTER COLUMN numero_prestamo INT NOT NULL;
        """,
        """
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE object_id = OBJECT_ID('prestamos')
              AND name = 'ix_prestamos_numero_prestamo'
        )
            CREATE UNIQUE INDEX ix_prestamos_numero_prestamo ON prestamos (numero_prestamo);
        """,
        """
        IF NOT EXISTS (
            SELECT 1 FROM sys.sequences
            WHERE name = 'prestamos_numero_seq' AND schema_id = SCHEMA_ID('dbo')
        )
        BEGIN
            DECLARE @max_num INT = ISNULL((SELECT MAX(numero_prestamo) FROM prestamos), 0);
            DECLARE @sql NVARCHAR(MAX) =
                N'CREATE SEQUENCE dbo.prestamos_numero_seq AS INT START WITH '
                + CAST(@max_num + 1 AS NVARCHAR(20)) + N' INCREMENT BY 1;';
            EXEC sp_executesql @sql;
        END
        """,
        # Costo Operativo, CFT y Cuotas Sociales
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'socios')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_activa')
                ALTER TABLE socios ADD cuota_social_activa BIT NOT NULL CONSTRAINT DF_socios_cuota_social_activa DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_valor_centavos')
                ALTER TABLE socios ADD cuota_social_valor_centavos BIGINT NOT NULL CONSTRAINT DF_socios_cuota_social_valor DEFAULT 550000;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_prestamo_id')
                ALTER TABLE socios ADD cuota_social_prestamo_id VARCHAR(36) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_fecha_alta')
                ALTER TABLE socios ADD cuota_social_fecha_alta DATETIME NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_fecha_baja')
                ALTER TABLE socios ADD cuota_social_fecha_baja DATETIME NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('socios') AND name = 'cuota_social_ultimo_vencimiento_dia')
                ALTER TABLE socios ADD cuota_social_ultimo_vencimiento_dia INT NOT NULL CONSTRAINT DF_socios_cuota_social_dia DEFAULT 10;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'prestamos')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'costo_operativo_tipo')
                ALTER TABLE prestamos ADD costo_operativo_tipo VARCHAR(20) NOT NULL CONSTRAINT DF_prestamos_costo_op_tipo DEFAULT 'FIJO';
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'costo_operativo_centavos')
                ALTER TABLE prestamos ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_prestamos_costo_op_centavos DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'costo_operativo_porcentaje')
                ALTER TABLE prestamos ADD costo_operativo_porcentaje NUMERIC(10, 6) NOT NULL CONSTRAINT DF_prestamos_costo_op_pct DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'total_costo_operativo_centavos')
                ALTER TABLE prestamos ADD total_costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_prestamos_total_costo_op DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'cft_tna')
                ALTER TABLE prestamos ADD cft_tna NUMERIC(12, 6) NOT NULL CONSTRAINT DF_prestamos_cft_tna DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'cft_tea')
                ALTER TABLE prestamos ADD cft_tea NUMERIC(12, 6) NOT NULL CONSTRAINT DF_prestamos_cft_tea DEFAULT 0;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cuotas')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cuotas') AND name = 'costo_operativo_centavos')
                ALTER TABLE cuotas ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_cuotas_costo_op_centavos DEFAULT 0;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'presentaciones_bapro_auditoria')
           AND EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cuotas_sociales')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('presentaciones_bapro_auditoria') AND name = 'cuota_social_id')
                ALTER TABLE presentaciones_bapro_auditoria ADD cuota_social_id VARCHAR(36) NULL;
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'presentaciones_bna_auditoria')
           AND EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cuotas_sociales')
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('presentaciones_bna_auditoria') AND name = 'cuota_social_id')
                ALTER TABLE presentaciones_bna_auditoria ADD cuota_social_id VARCHAR(36) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('presentaciones_bna_auditoria') AND name = 'tipo_importe')
                ALTER TABLE presentaciones_bna_auditoria ADD tipo_importe VARCHAR(50) NOT NULL CONSTRAINT DF_bna_auditoria_tipo_importe DEFAULT 'Prestamo';
        END
        """,
        """
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'respuestas_bancarias_detalle')
        BEGIN
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('respuestas_bancarias_detalle') AND name = 'cuota_id' AND is_nullable = 0)
                ALTER TABLE respuestas_bancarias_detalle ALTER COLUMN cuota_id VARCHAR(36) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('respuestas_bancarias_detalle') AND name = 'cuota_social_id')
                ALTER TABLE respuestas_bancarias_detalle ADD cuota_social_id VARCHAR(36) NULL;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('respuestas_bancarias_detalle') AND name = 'costo_operativo_centavos')
                ALTER TABLE respuestas_bancarias_detalle ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_resp_det_costo_op DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('respuestas_bancarias_detalle') AND name = 'cuota_social_centavos')
                ALTER TABLE respuestas_bancarias_detalle ADD cuota_social_centavos BIGINT NOT NULL CONSTRAINT DF_resp_det_cuota_social DEFAULT 0;
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
    except Exception:
        logger.exception(
            "No se pudieron aplicar migraciones Alembic automáticamente; "
            "se continúa con los parches defensivos de init_db."
        )


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
