"""agregar cft, costo operativo y cuotas sociales

Revision ID: c8f1a3b2d904
Revises: b7d4c2e91a10
Create Date: 2026-11-16 22:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8f1a3b2d904"
down_revision: Union[str, Sequence[str], None] = "b7d4c2e91a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ensure_column_non_mssql(inspector, table: str, column: sa.Column) -> None:
    cols = {c["name"] for c in inspector.get_columns(table)}
    if column.name not in cols:
        op.add_column(table, column)


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "mssql":
        inspector = sa.inspect(bind)
        if not inspector.has_table("cuotas_sociales"):
            op.create_table(
                "cuotas_sociales",
                sa.Column("id", sa.String(36), primary_key=True),
                sa.Column("socio_id", sa.Integer(), sa.ForeignKey("socios.id"), nullable=False),
                sa.Column("prestamo_id", sa.String(36), sa.ForeignKey("prestamos.id"), nullable=True),
                sa.Column("periodo", sa.String(7), nullable=False),
                sa.Column("fecha_vencimiento", sa.Date(), nullable=False),
                sa.Column("valor_centavos", sa.BigInteger(), nullable=False),
                sa.Column("monto_pagado_centavos", sa.BigInteger(), nullable=False, server_default="0"),
                sa.Column("estado", sa.String(20), nullable=False, server_default="PENDIENTE"),
                sa.Column("fecha_pago", sa.DateTime(), nullable=True),
                sa.Column("fecha_alta", sa.DateTime(), nullable=False),
                sa.UniqueConstraint("socio_id", "periodo", name="uq_cuotas_sociales_socio_periodo"),
            )

        for col in [
            sa.Column("cuota_social_activa", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("cuota_social_valor_centavos", sa.BigInteger(), nullable=False, server_default="550000"),
            sa.Column("cuota_social_prestamo_id", sa.String(36), nullable=True),
            sa.Column("cuota_social_fecha_alta", sa.DateTime(), nullable=True),
            sa.Column("cuota_social_fecha_baja", sa.DateTime(), nullable=True),
            sa.Column("cuota_social_ultimo_vencimiento_dia", sa.Integer(), nullable=False, server_default="10"),
        ]:
            _ensure_column_non_mssql(inspector, "socios", col)

        for col in [
            sa.Column("costo_operativo_tipo", sa.String(20), nullable=False, server_default="FIJO"),
            sa.Column("costo_operativo_centavos", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("costo_operativo_porcentaje", sa.Numeric(10, 6), nullable=False, server_default="0"),
            sa.Column("total_costo_operativo_centavos", sa.BigInteger(), nullable=False, server_default="0"),
            sa.Column("cft_tna", sa.Numeric(12, 6), nullable=False, server_default="0"),
            sa.Column("cft_tea", sa.Numeric(12, 6), nullable=False, server_default="0"),
        ]:
            _ensure_column_non_mssql(inspector, "prestamos", col)

        _ensure_column_non_mssql(
            inspector,
            "cuotas",
            sa.Column("costo_operativo_centavos", sa.BigInteger(), nullable=False, server_default="0"),
        )
        _ensure_column_non_mssql(
            inspector,
            "presentaciones_bapro_auditoria",
            sa.Column("cuota_social_id", sa.String(36), nullable=True),
        )
        for col in [
            sa.Column("cuota_social_id", sa.String(36), nullable=True),
            sa.Column("tipo_importe", sa.String(50), nullable=False, server_default="Prestamo"),
        ]:
            _ensure_column_non_mssql(inspector, "presentaciones_bna_auditoria", col)

        resp_cols = {c["name"]: c for c in inspector.get_columns("respuestas_bancarias_detalle")}
        with op.batch_alter_table("respuestas_bancarias_detalle") as batch_op:
            if resp_cols.get("cuota_id") and not resp_cols["cuota_id"]["nullable"]:
                batch_op.alter_column("cuota_id", existing_type=sa.String(36), nullable=True)
            if "cuota_social_id" not in resp_cols:
                batch_op.add_column(sa.Column("cuota_social_id", sa.String(36), nullable=True))
            if "costo_operativo_centavos" not in resp_cols:
                batch_op.add_column(sa.Column("costo_operativo_centavos", sa.BigInteger(), nullable=False, server_default="0"))
            if "cuota_social_centavos" not in resp_cols:
                batch_op.add_column(sa.Column("cuota_social_centavos", sa.BigInteger(), nullable=False, server_default="0"))
        return

    # SQL Server idempotente
    op.execute("""
        IF OBJECT_ID('dbo.cuotas_sociales', 'U') IS NULL
        CREATE TABLE dbo.cuotas_sociales (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            socio_id INT NOT NULL FOREIGN KEY REFERENCES dbo.socios(id),
            prestamo_id VARCHAR(36) NULL FOREIGN KEY REFERENCES dbo.prestamos(id),
            periodo VARCHAR(7) NOT NULL,
            fecha_vencimiento DATE NOT NULL,
            valor_centavos BIGINT NOT NULL,
            monto_pagado_centavos BIGINT NOT NULL CONSTRAINT DF_cuotas_sociales_pagado DEFAULT 0,
            estado VARCHAR(20) NOT NULL CONSTRAINT DF_cuotas_sociales_estado DEFAULT 'PENDIENTE',
            fecha_pago DATETIME NULL,
            fecha_alta DATETIME NOT NULL CONSTRAINT DF_cuotas_sociales_alta DEFAULT GETDATE(),
            CONSTRAINT uq_cuotas_sociales_socio_periodo UNIQUE (socio_id, periodo)
        );
    """)
    op.execute("""
        IF COL_LENGTH('dbo.socios', 'cuota_social_activa') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_activa BIT NOT NULL CONSTRAINT DF_socios_cuota_social_activa DEFAULT 0;
        IF COL_LENGTH('dbo.socios', 'cuota_social_valor_centavos') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_valor_centavos BIGINT NOT NULL CONSTRAINT DF_socios_cuota_social_valor DEFAULT 550000;
        IF COL_LENGTH('dbo.socios', 'cuota_social_prestamo_id') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_prestamo_id VARCHAR(36) NULL;
        IF COL_LENGTH('dbo.socios', 'cuota_social_fecha_alta') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_fecha_alta DATETIME NULL;
        IF COL_LENGTH('dbo.socios', 'cuota_social_fecha_baja') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_fecha_baja DATETIME NULL;
        IF COL_LENGTH('dbo.socios', 'cuota_social_ultimo_vencimiento_dia') IS NULL
            ALTER TABLE dbo.socios ADD cuota_social_ultimo_vencimiento_dia INT NOT NULL CONSTRAINT DF_socios_cuota_social_dia DEFAULT 10;
    """)
    op.execute("""
        IF COL_LENGTH('dbo.prestamos', 'costo_operativo_tipo') IS NULL
            ALTER TABLE dbo.prestamos ADD costo_operativo_tipo VARCHAR(20) NOT NULL CONSTRAINT DF_prestamos_costo_op_tipo DEFAULT 'FIJO';
        IF COL_LENGTH('dbo.prestamos', 'costo_operativo_centavos') IS NULL
            ALTER TABLE dbo.prestamos ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_prestamos_costo_op_centavos DEFAULT 0;
        IF COL_LENGTH('dbo.prestamos', 'costo_operativo_porcentaje') IS NULL
            ALTER TABLE dbo.prestamos ADD costo_operativo_porcentaje NUMERIC(10, 6) NOT NULL CONSTRAINT DF_prestamos_costo_op_pct DEFAULT 0;
        IF COL_LENGTH('dbo.prestamos', 'total_costo_operativo_centavos') IS NULL
            ALTER TABLE dbo.prestamos ADD total_costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_prestamos_total_costo_op DEFAULT 0;
        IF COL_LENGTH('dbo.prestamos', 'cft_tna') IS NULL
            ALTER TABLE dbo.prestamos ADD cft_tna NUMERIC(12, 6) NOT NULL CONSTRAINT DF_prestamos_cft_tna DEFAULT 0;
        IF COL_LENGTH('dbo.prestamos', 'cft_tea') IS NULL
            ALTER TABLE dbo.prestamos ADD cft_tea NUMERIC(12, 6) NOT NULL CONSTRAINT DF_prestamos_cft_tea DEFAULT 0;
    """)
    op.execute("""
        IF COL_LENGTH('dbo.cuotas', 'costo_operativo_centavos') IS NULL
            ALTER TABLE dbo.cuotas ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_cuotas_costo_op_centavos DEFAULT 0;
    """)
    op.execute("""
        IF COL_LENGTH('dbo.presentaciones_bapro_auditoria', 'cuota_social_id') IS NULL
            ALTER TABLE dbo.presentaciones_bapro_auditoria ADD cuota_social_id VARCHAR(36) NULL;
    """)
    op.execute("""
        IF COL_LENGTH('dbo.presentaciones_bna_auditoria', 'cuota_social_id') IS NULL
            ALTER TABLE dbo.presentaciones_bna_auditoria ADD cuota_social_id VARCHAR(36) NULL;
        IF COL_LENGTH('dbo.presentaciones_bna_auditoria', 'tipo_importe') IS NULL
            ALTER TABLE dbo.presentaciones_bna_auditoria ADD tipo_importe VARCHAR(50) NOT NULL CONSTRAINT DF_bna_auditoria_tipo_importe DEFAULT 'Prestamo';
    """)
    op.execute("""
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.respuestas_bancarias_detalle') AND name = 'cuota_id' AND is_nullable = 0)
            ALTER TABLE dbo.respuestas_bancarias_detalle ALTER COLUMN cuota_id VARCHAR(36) NULL;
        IF COL_LENGTH('dbo.respuestas_bancarias_detalle', 'cuota_social_id') IS NULL
            ALTER TABLE dbo.respuestas_bancarias_detalle ADD cuota_social_id VARCHAR(36) NULL;
        IF COL_LENGTH('dbo.respuestas_bancarias_detalle', 'costo_operativo_centavos') IS NULL
            ALTER TABLE dbo.respuestas_bancarias_detalle ADD costo_operativo_centavos BIGINT NOT NULL CONSTRAINT DF_resp_det_costo_op DEFAULT 0;
        IF COL_LENGTH('dbo.respuestas_bancarias_detalle', 'cuota_social_centavos') IS NULL
            ALTER TABLE dbo.respuestas_bancarias_detalle ADD cuota_social_centavos BIGINT NOT NULL CONSTRAINT DF_resp_det_cuota_social DEFAULT 0;
    """)


def downgrade() -> None:
    pass
