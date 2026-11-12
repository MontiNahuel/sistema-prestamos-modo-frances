"""agregar numero_prestamo incremental a prestamos

Revision ID: b7d4c2e91a10
Revises: e28a7d19b604
Create Date: 2026-11-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d4c2e91a10'
down_revision: Union[str, Sequence[str], None] = 'e28a7d19b604'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "mssql":
        inspector = sa.inspect(bind)
        columnas = {c["name"] for c in inspector.get_columns("prestamos")}
        if "numero_prestamo" not in columnas:
            op.add_column("prestamos", sa.Column("numero_prestamo", sa.Integer(), nullable=True))
        op.execute("""
            UPDATE prestamos
               SET numero_prestamo = (
                   SELECT COUNT(*) FROM prestamos p2
                   WHERE p2.fecha_alta < prestamos.fecha_alta
                      OR (p2.fecha_alta = prestamos.fecha_alta AND p2.id <= prestamos.id)
               )
             WHERE numero_prestamo IS NULL
        """)
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_prestamos_numero_prestamo "
            "ON prestamos (numero_prestamo)"
        )
        return

    # 1. Columna nullable para poder backfillear filas existentes.
    op.execute("""
        IF COL_LENGTH('dbo.prestamos', 'numero_prestamo') IS NULL
            ALTER TABLE dbo.prestamos ADD numero_prestamo INT NULL;
    """)

    # 2. Numerar las filas históricas por fecha de alta. Si ya hubiera números
    #    asignados, continúa desde el máximo existente.
    op.execute("""
        DECLARE @base INT = ISNULL((SELECT MAX(numero_prestamo) FROM dbo.prestamos), 0);
        ;WITH pendientes AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY fecha_alta, id) AS rn
            FROM dbo.prestamos
            WHERE numero_prestamo IS NULL
        )
        UPDATE p
           SET numero_prestamo = @base + pen.rn
          FROM dbo.prestamos p
          JOIN pendientes pen ON pen.id = p.id;
    """)

    # 3. La columna pasa a NOT NULL.
    op.execute("""
        IF EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.prestamos')
              AND name = 'numero_prestamo'
              AND is_nullable = 1
        )
            ALTER TABLE dbo.prestamos ALTER COLUMN numero_prestamo INT NOT NULL;
    """)

    # 4. Unicidad del número de préstamo.
    op.execute("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE object_id = OBJECT_ID('dbo.prestamos')
              AND name = 'ix_prestamos_numero_prestamo'
        )
            CREATE UNIQUE INDEX ix_prestamos_numero_prestamo ON dbo.prestamos (numero_prestamo);
    """)

    # 5. Secuencia para los próximos otorgamientos, arrancando después del máximo.
    op.execute("""
        IF NOT EXISTS (
            SELECT 1 FROM sys.sequences
            WHERE name = 'prestamos_numero_seq' AND schema_id = SCHEMA_ID('dbo')
        )
        BEGIN
            DECLARE @max_num INT = ISNULL((SELECT MAX(numero_prestamo) FROM dbo.prestamos), 0);
            DECLARE @sql NVARCHAR(MAX) =
                N'CREATE SEQUENCE dbo.prestamos_numero_seq AS INT START WITH '
                + CAST(@max_num + 1 AS NVARCHAR(20)) + N' INCREMENT BY 1;';
            EXEC sp_executesql @sql;
        END
    """)


def downgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "mssql":
        op.execute("DROP INDEX IF EXISTS ix_prestamos_numero_prestamo")
        op.drop_column("prestamos", "numero_prestamo")
        return

    op.execute("""
        IF EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE object_id = OBJECT_ID('dbo.prestamos')
              AND name = 'ix_prestamos_numero_prestamo'
        )
            DROP INDEX ix_prestamos_numero_prestamo ON dbo.prestamos;
    """)
    op.execute("""
        IF EXISTS (
            SELECT 1 FROM sys.sequences
            WHERE name = 'prestamos_numero_seq' AND schema_id = SCHEMA_ID('dbo')
        )
            DROP SEQUENCE dbo.prestamos_numero_seq;
    """)
    op.execute("""
        IF COL_LENGTH('dbo.prestamos', 'numero_prestamo') IS NOT NULL
            ALTER TABLE dbo.prestamos DROP COLUMN numero_prestamo;
    """)
