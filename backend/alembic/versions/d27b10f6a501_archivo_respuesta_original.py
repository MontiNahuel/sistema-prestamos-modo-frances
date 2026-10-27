"""Conservar bytes originales de la respuesta, sin transformar historia."""
from alembic import op
import sqlalchemy as sa

revision = 'd27b10f6a501'
down_revision = 'c19e62a4b230'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('respuestas_bancarias', sa.Column('archivo_original', sa.LargeBinary(), nullable=True))


def downgrade():
    op.drop_column('respuestas_bancarias', 'archivo_original')
