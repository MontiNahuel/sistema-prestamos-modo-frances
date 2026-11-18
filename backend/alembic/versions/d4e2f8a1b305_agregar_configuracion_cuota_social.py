"""agregar configuracion global de cuota social

Revision ID: d4e2f8a1b305
Revises: c8f1a3b2d904
Create Date: 2026-11-18 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e2f8a1b305"
down_revision: Union[str, Sequence[str], None] = "c8f1a3b2d904"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "mssql":
        inspector = sa.inspect(bind)
        if not inspector.has_table("cuotas_sociales_config"):
            op.create_table(
                "cuotas_sociales_config",
                sa.Column("id", sa.Integer(), primary_key=True),
                sa.Column("valor_default_centavos", sa.BigInteger(), nullable=False, server_default="550000"),
                sa.Column("fecha_actualizacion", sa.DateTime(), nullable=False),
                sa.Column("actualizado_por", sa.String(100), nullable=True),
            )
            op.execute(
                "INSERT INTO cuotas_sociales_config (id, valor_default_centavos, fecha_actualizacion, actualizado_por) "
                "VALUES (1, 550000, CURRENT_TIMESTAMP, 'SISTEMA')"
            )
        return

    op.execute("""
        IF OBJECT_ID('dbo.cuotas_sociales_config', 'U') IS NULL
        CREATE TABLE dbo.cuotas_sociales_config (
            id INT NOT NULL PRIMARY KEY,
            valor_default_centavos BIGINT NOT NULL CONSTRAINT DF_cuotas_soc_cfg_valor DEFAULT 550000,
            fecha_actualizacion DATETIME NOT NULL CONSTRAINT DF_cuotas_soc_cfg_fecha DEFAULT GETDATE(),
            actualizado_por VARCHAR(100) NULL
        );
        IF NOT EXISTS (SELECT 1 FROM dbo.cuotas_sociales_config WHERE id = 1)
            INSERT INTO dbo.cuotas_sociales_config (id, valor_default_centavos, fecha_actualizacion, actualizado_por)
            VALUES (1, 550000, GETDATE(), 'SISTEMA');
    """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "mssql":
        inspector = sa.inspect(bind)
        if inspector.has_table("cuotas_sociales_config"):
            op.drop_table("cuotas_sociales_config")
        return

    op.execute("""
        IF OBJECT_ID('dbo.cuotas_sociales_config', 'U') IS NOT NULL
            DROP TABLE dbo.cuotas_sociales_config;
    """)
