"""historial_cambios, prestamo_linea_snapshot y limpieza tipo_tasa

Revision ID: d0d9a291fdfa
Revises: 09e02e496674
Create Date: 2026-10-21 11:43:04.890974

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision: str = 'd0d9a291fdfa'
down_revision: Union[str, Sequence[str], None] = '09e02e496674'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crear tabla historial_cambios si no existe
    op.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'historial_cambios')
        BEGIN
            CREATE TABLE historial_cambios (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                entidad_nombre VARCHAR(50) NOT NULL,
                entidad_id VARCHAR(50) NOT NULL,
                accion VARCHAR(20) NOT NULL,
                usuario_operador VARCHAR(100) NULL,
                datos_anteriores NVARCHAR(MAX) NULL,
                datos_nuevos NVARCHAR(MAX) NOT NULL,
                motivo VARCHAR(255) NULL,
                fecha_registro DATETIME NOT NULL
            );
            CREATE INDEX ix_historial_cambios_entidad ON historial_cambios (entidad_nombre, entidad_id);
            CREATE INDEX ix_historial_cambios_fecha ON historial_cambios (fecha_registro);
        END
    """)

    # 2. Crear tabla prestamo_linea_snapshot si no existe
    op.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'prestamo_linea_snapshot')
        BEGIN
            CREATE TABLE prestamo_linea_snapshot (
                prestamo_id VARCHAR(36) NOT NULL PRIMARY KEY,
                linea_id INT NOT NULL,
                linea_codigo VARCHAR(50) NOT NULL,
                linea_nombre VARCHAR(100) NOT NULL,
                motor_id INT NOT NULL,
                motor_nombre VARCHAR(100) NOT NULL,
                tasa_catalogo_vigente NUMERIC(10, 4) NOT NULL,
                alicuota_iva NUMERIC(6, 4) NOT NULL,
                monto_minimo_centavos BIGINT NOT NULL,
                monto_maximo_centavos BIGINT NOT NULL,
                plazo_minimo_meses INT NOT NULL,
                plazo_maximo_meses INT NOT NULL,
                reglas_motor_json NVARCHAR(MAX) NOT NULL,
                fecha_snapshot DATETIME NOT NULL,
                CONSTRAINT fk_snapshot_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
                CONSTRAINT fk_snapshot_linea FOREIGN KEY (linea_id) REFERENCES lineas_prestamo(id),
                CONSTRAINT fk_snapshot_motor FOREIGN KEY (motor_id) REFERENCES motores_calculo(id)
            );
            CREATE INDEX ix_snapshot_linea_id ON prestamo_linea_snapshot (linea_id);
        END
    """)

    # 3. Eliminar columnas redundantes
    op.execute("""
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lineas_prestamo') AND name = 'tipo_tasa')
        BEGIN
            ALTER TABLE lineas_prestamo DROP COLUMN tipo_tasa;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'linea_id')
        BEGIN
            ALTER TABLE prestamos DROP COLUMN linea_id;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'motor_nombre')
        BEGIN
            ALTER TABLE prestamos DROP COLUMN motor_nombre;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('prestamos') AND name = 'linea_nombre')
        BEGIN
            ALTER TABLE prestamos DROP COLUMN linea_nombre;
        END
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lineas_prestamo') AND name = 'tipo_tasa')
        BEGIN
            ALTER TABLE lineas_prestamo ADD tipo_tasa VARCHAR(10) DEFAULT 'TNA' NOT NULL;
        END
    """)
    op.execute("""
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'prestamo_linea_snapshot')
        BEGIN
            DROP TABLE prestamo_linea_snapshot;
        END

        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'historial_cambios')
        BEGIN
            DROP TABLE historial_cambios;
        END
    """)
