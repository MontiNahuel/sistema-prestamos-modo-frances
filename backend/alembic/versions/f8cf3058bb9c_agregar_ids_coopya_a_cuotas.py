"""agregar_ids_coopya_a_cuotas

Revision ID: f8cf3058bb9c
Revises: 1e78eedabd4f
Create Date: 2026-10-26 11:56:44.469223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8cf3058bb9c'
down_revision: Union[str, Sequence[str], None] = '1e78eedabd4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: agregar IDs de sincronización con CoopYa a la tabla cuotas."""
    op.add_column('cuotas', sa.Column('movimiento_coopya_id', sa.Integer(), nullable=True))
    op.add_column('cuotas', sa.Column('desglose_coopya_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('cuotas', 'desglose_coopya_id')
    op.drop_column('cuotas', 'movimiento_coopya_id')
