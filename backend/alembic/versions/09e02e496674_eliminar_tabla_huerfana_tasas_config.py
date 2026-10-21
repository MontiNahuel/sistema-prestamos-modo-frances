"""eliminar tabla huerfana tasas_config

Revision ID: 09e02e496674
Revises: 7c3269ab3e96
Create Date: 2026-10-21 10:39:03.994245

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision: str = '09e02e496674'
down_revision: Union[str, Sequence[str], None] = '7c3269ab3e96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('tasas_config')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('tasas_config',
    sa.Column('id', sa.INTEGER(), sa.Identity(always=False, start=1, increment=1), autoincrement=True, nullable=False),
    sa.Column('nombre', sa.VARCHAR(length=100, collation='SQL_Latin1_General_CP1_CI_AS'), autoincrement=False, nullable=False),
    sa.Column('tna_default', sa.NUMERIC(precision=10, scale=4), autoincrement=False, nullable=False),
    sa.Column('alicuota_iva_default', sa.NUMERIC(precision=6, scale=4), autoincrement=False, nullable=False),
    sa.Column('plazo_min_meses', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('plazo_max_meses', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('activa', mssql.BIT(), autoincrement=False, nullable=False),
    sa.Column('fecha_creacion', sa.DATETIME(), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('PK__tasas_co__3213E83F0309A3B3'))
    )
