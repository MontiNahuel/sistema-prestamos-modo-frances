"""agregar_datos_bancarios_a_socios

Revision ID: e90f71b23831
Revises: d0d9a291fdfa
Create Date: 2026-10-26 09:36:55.277255

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision: str = 'e90f71b23831'
down_revision: Union[str, Sequence[str], None] = 'd0d9a291fdfa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('socios', sa.Column('cbu', sa.String(length=22), nullable=True))
    op.add_column('socios', sa.Column('alias_cbu', sa.String(length=50), nullable=True))
    op.add_column('socios', sa.Column('banco_nombre', sa.String(length=100), nullable=True))
    op.add_column('socios', sa.Column('titular_verificado', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.create_index(op.f('ix_socios_cbu'), 'socios', ['cbu'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_socios_cbu'), table_name='socios')
    op.drop_column('socios', 'titular_verificado')
    op.drop_column('socios', 'banco_nombre')
    op.drop_column('socios', 'alias_cbu')
    op.drop_column('socios', 'cbu')
