"""Ledger de respuestas BAPRO/BNA y exclusión de operaciones duplicadas."""
from alembic import op
import sqlalchemy as sa

revision = 'c19e62a4b230'
down_revision = 'e95464d3cd39'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('respuestas_bancarias',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('banco', sa.String(10), nullable=False),
        sa.Column('lote', sa.Integer(), nullable=False),
        sa.Column('nombre_archivo', sa.String(200), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('fecha_cobro', sa.Date(), nullable=False),
        sa.Column('fecha_carga', sa.DateTime(), nullable=False),
        sa.Column('operador', sa.String(100), nullable=False),
        sa.Column('resumen', sa.JSON(), nullable=False))
    op.create_index('ix_respuestas_bancarias_sha256', 'respuestas_bancarias', ['sha256'])
    op.create_table('respuestas_bancarias_detalle',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('carga_id', sa.String(36), sa.ForeignKey('respuestas_bancarias.id'), nullable=False),
        sa.Column('banco', sa.String(10), nullable=False),
        sa.Column('clave_operacion', sa.String(64), nullable=False),
        sa.Column('huella_respuesta', sa.String(64), nullable=False),
        sa.Column('linea', sa.Integer(), nullable=False),
        sa.Column('cuota_id', sa.String(36), sa.ForeignKey('cuotas.id'), nullable=False),
        sa.Column('referencia', sa.String(100), nullable=False),
        sa.Column('codigo', sa.String(10), nullable=False),
        sa.Column('descripcion', sa.String(250), nullable=False),
        sa.Column('importe_centavos', sa.BigInteger(), nullable=False),
        sa.Column('cobrado_centavos', sa.BigInteger(), nullable=False),
        sa.Column('capital_centavos', sa.BigInteger(), nullable=False),
        sa.Column('interes_centavos', sa.BigInteger(), nullable=False),
        sa.Column('iva_centavos', sa.BigInteger(), nullable=False),
        sa.Column('saldo_cuota_centavos', sa.BigInteger(), nullable=False),
        sa.Column('estado_cuota', sa.String(20), nullable=False),
        sa.UniqueConstraint('banco', 'clave_operacion', name='uq_respuesta_operacion'))
    op.create_index('ix_respuestas_bancarias_detalle_carga_id', 'respuestas_bancarias_detalle', ['carga_id'])
    op.create_index('ix_respuestas_bancarias_detalle_cuota_id', 'respuestas_bancarias_detalle', ['cuota_id'])


def downgrade():
    op.drop_table('respuestas_bancarias_detalle')
    op.drop_table('respuestas_bancarias')
