"""crear_tabla_empresas_originantes

Revision ID: e95464d3cd39
Revises: f9ab8be46e0e
Create Date: 2026-10-26 15:28:15.930617

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e95464d3cd39'
down_revision: Union[str, Sequence[str], None] = 'f9ab8be46e0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        IF OBJECT_ID('empresas_originantes', 'U') IS NULL
        BEGIN
            CREATE TABLE empresas_originantes (
                id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                cuit VARCHAR(11) NOT NULL,
                razon_social VARCHAR(100) NOT NULL,
                nombre_fantasia VARCHAR(50) NULL,
                prefijo_archivo VARCHAR(50) NOT NULL CONSTRAINT DF_empresas_originantes_prefijo DEFAULT 'EBT_COOPCREDITOYALTDA',
                descripcion_transaccion VARCHAR(10) NOT NULL CONSTRAINT DF_empresas_originantes_desc DEFAULT 'SERVICI014',
                activo BIT NOT NULL CONSTRAINT DF_empresas_originantes_activo DEFAULT 1,
                predeterminado BIT NOT NULL CONSTRAINT DF_empresas_originantes_pred DEFAULT 0,
                fecha_creacion DATETIME NOT NULL CONSTRAINT DF_empresas_originantes_fecha DEFAULT GETDATE()
            );
        END
        """
    )
    op.execute(
        """
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_empresas_originantes_cuit' AND object_id = OBJECT_ID('empresas_originantes'))
        BEGIN
            CREATE UNIQUE NONCLUSTERED INDEX ix_empresas_originantes_cuit ON empresas_originantes(cuit);
        END
        """
    )

    # Seed inicial de la empresa oficial
    op.execute(
        """
        IF NOT EXISTS (SELECT 1 FROM empresas_originantes WHERE cuit = '30690754386')
        BEGIN
            INSERT INTO empresas_originantes (cuit, razon_social, nombre_fantasia, prefijo_archivo, descripcion_transaccion, activo, predeterminado, fecha_creacion)
            VALUES ('30690754386', 'COOPCREDITOYALTD', 'CoopYa', 'EBT_COOPCREDITOYALTDA', 'SERVICI014', 1, 1, GETDATE());
        END
        """
    )


def downgrade() -> None:
    op.execute(
        """
        IF OBJECT_ID('empresas_originantes', 'U') IS NOT NULL
        BEGIN
            DROP TABLE empresas_originantes;
        END
        """
    )
