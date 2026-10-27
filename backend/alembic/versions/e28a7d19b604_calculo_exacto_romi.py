"""Preservar el acarreo decimal Romi en las cuotas otorgadas."""
from alembic import op
import sqlalchemy as sa

revision = 'e28a7d19b604'
down_revision = 'd27b10f6a501'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cuotas', sa.Column('calculo_exacto', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('cuotas', 'calculo_exacto')
