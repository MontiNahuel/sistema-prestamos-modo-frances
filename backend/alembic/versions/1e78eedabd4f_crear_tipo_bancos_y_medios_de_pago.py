"""crear_tipo_bancos_y_medios_de_pago

Revision ID: 1e78eedabd4f
Revises: e90f71b23831
Create Date: 2026-10-26 10:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '1e78eedabd4f'
down_revision: Union[str, Sequence[str], None] = 'e90f71b23831'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BANCOS_SEED = [
    {"id": 1, "nombre": "FRANCES", "codigo": "00017", "activo": True},
    {"id": 2, "nombre": "PATAGONIA", "codigo": "00034", "activo": True},
    {"id": 3, "nombre": "NACION", "codigo": "00011", "activo": True},
    {"id": 4, "nombre": "COLUMBIA", "codigo": "00389", "activo": True},
    {"id": 5, "nombre": "BAPRO", "codigo": "00014", "activo": True},
    {"id": 6, "nombre": "CHUBUT", "codigo": "00083", "activo": True},
    {"id": 7, "nombre": "DE LA RIOJA", "codigo": "00309", "activo": True},
    {"id": 8, "nombre": "HSBC", "codigo": "00150", "activo": True},
    {"id": 9, "nombre": "CORRIENTES", "codigo": "00094", "activo": True},
    {"id": 10, "nombre": "CIUDAD", "codigo": "00029", "activo": True},
    {"id": 11, "nombre": "SANTANDER RIO", "codigo": "00072", "activo": True},
    {"id": 12, "nombre": "PCIA NEUQUEN", "codigo": "00097", "activo": True},
    {"id": 13, "nombre": "MACRO", "codigo": "00285", "activo": True},
    {"id": 14, "nombre": "ICBC", "codigo": "00015", "activo": True},
    {"id": 15, "nombre": "GALICIA", "codigo": "00007", "activo": True},
    {"id": 16, "nombre": "INDUSTRIAL", "codigo": "00322", "activo": True},
    {"id": 17, "nombre": "HIPOTECARIO", "codigo": "00044", "activo": True},
    {"id": 18, "nombre": "SANTA FE", "codigo": "00330", "activo": True},
    {"id": 19, "nombre": "ENTRE RIOS", "codigo": "00386", "activo": True},
    {"id": 20, "nombre": "SUPERVIELLE", "codigo": "00027", "activo": True},
    {"id": 21, "nombre": "COMAFI", "codigo": "00299", "activo": True},
    {"id": 22, "nombre": "CREDICOOP", "codigo": "00191", "activo": True},
    {"id": 23, "nombre": "CITIBANK", "codigo": "00016", "activo": True},
    {"id": 24, "nombre": "SAN JUAN", "codigo": "00045", "activo": True},
    {"id": 25, "nombre": "B.S.T.", "codigo": "00338", "activo": True},
    {"id": 26, "nombre": "BBVA", "codigo": "00017", "activo": True},
    {"id": 27, "nombre": "SANTA CRUZ", "codigo": "00086", "activo": True},
    {"id": 28, "nombre": "CORDOBA", "codigo": "00020", "activo": True},
    {"id": 29, "nombre": "TUCUMAN", "codigo": "00060", "activo": True},
    {"id": 30, "nombre": "STGO DEL ESTERO", "codigo": "00321", "activo": True},
    {"id": 31, "nombre": "PIANO S.A", "codigo": "00301", "activo": True},
    {"id": 32, "nombre": "LA PAMPA", "codigo": "00093", "activo": True},
    {"id": 33, "nombre": "ITAU", "codigo": "00259", "activo": True},
    {"id": 34, "nombre": "COMERCIO", "codigo": "00432", "activo": True},
    {"id": 35, "nombre": "COMPANIA FINANCIERA ARG", "codigo": "44077", "activo": True},
    {"id": 36, "nombre": "BANCO MUNICIPAL DE ROSARIO", "codigo": "00065", "activo": True},
    {"id": 37, "nombre": "BANCO MUNICIPAL DE ROSARIO 2", "codigo": "00065", "activo": True},
    {"id": 38, "nombre": "EFECTIVO SI", "codigo": "44077", "activo": True},
    {"id": 39, "nombre": "BANCO SUPERVIELLE CATALINAS", "codigo": "00027", "activo": True},
]


def upgrade() -> None:
    # 1. Crear tabla tipo_bancos
    tipo_bancos = op.create_table(
        'tipo_bancos',
        sa.Column('id', sa.Integer(), autoincrement=False, primary_key=True),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('1')),
    )

    # 2. Poblar tipo_bancos con catálogo oficial del monolito
    op.bulk_insert(tipo_bancos, BANCOS_SEED)

    # 3. Crear tabla medios_de_pago (relación 1 a N con socios)
    op.create_table(
        'medios_de_pago',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('socio_id', sa.Integer(), sa.ForeignKey('socios.id'), nullable=False),
        sa.Column('tipo', sa.Integer(), nullable=False, server_default=sa.text('2')),  # 2 = CBU
        sa.Column('valor', sa.String(length=100), nullable=False),
        sa.Column('banco_id', sa.Integer(), sa.ForeignKey('tipo_bancos.id'), nullable=True),
        sa.Column('predeterminado', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('titular_verificado', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('fecha_alta', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_medios_de_pago_socio_id'), 'medios_de_pago', ['socio_id'], unique=False)
    op.create_index(op.f('ix_medios_de_pago_valor'), 'medios_de_pago', ['valor'], unique=False)

    # 4. Limpiar columnas transitorias aplanadas en socios
    op.drop_index(op.f('ix_socios_cbu'), table_name='socios')
    
    # En SQL Server, quitar el default constraint antes de dropear la columna
    op.execute("""
        DECLARE @c_name NVARCHAR(200);
        SELECT @c_name = d.name
        FROM sys.default_constraints d
        JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
        WHERE d.parent_object_id = OBJECT_ID('socios') AND c.name = 'titular_verificado';
        IF @c_name IS NOT NULL
            EXEC('ALTER TABLE socios DROP CONSTRAINT ' + @c_name);
    """)
    op.drop_column('socios', 'titular_verificado')
    op.drop_column('socios', 'banco_nombre')
    op.drop_column('socios', 'alias_cbu')
    op.drop_column('socios', 'cbu')


def downgrade() -> None:
    # 1. Restaurar columnas aplanadas en socios
    op.add_column('socios', sa.Column('cbu', sa.String(length=22), nullable=True))
    op.add_column('socios', sa.Column('alias_cbu', sa.String(length=50), nullable=True))
    op.add_column('socios', sa.Column('banco_nombre', sa.String(length=100), nullable=True))
    op.add_column('socios', sa.Column('titular_verificado', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.create_index(op.f('ix_socios_cbu'), 'socios', ['cbu'], unique=False)

    # 2. Eliminar medios_de_pago y tipo_bancos
    op.drop_index(op.f('ix_medios_de_pago_valor'), table_name='medios_de_pago')
    op.drop_index(op.f('ix_medios_de_pago_socio_id'), table_name='medios_de_pago')
    op.drop_table('medios_de_pago')
    op.drop_table('tipo_bancos')
