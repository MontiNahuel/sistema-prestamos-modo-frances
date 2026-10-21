"""crear_tabla_socios_y_fk_prestamos

Revision ID: 7c3269ab3e96
Revises: 5a4b8e81f755
Create Date: 2026-10-21 10:10:08.536792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c3269ab3e96'
down_revision: Union[str, Sequence[str], None] = '5a4b8e81f755'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear tabla de socios si no existe
    op.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'socios')
        BEGIN
            CREATE TABLE socios (
                id INTEGER NOT NULL PRIMARY KEY,
                nombre_completo VARCHAR(200) NOT NULL,
                documento VARCHAR(20) NULL,
                fecha_alta DATETIME NOT NULL,
                fecha_ultima_actualizacion DATETIME NOT NULL
            );
            CREATE INDEX ix_socios_documento ON socios (documento);
        END
    """)

    # 2. Backfill de socios a partir de los préstamos ya existentes para preservar integridad referencial
    op.execute("""
        INSERT INTO socios (id, nombre_completo, documento, fecha_alta, fecha_ultima_actualizacion)
        SELECT DISTINCT
            persona_id,
            COALESCE(persona_nombre, 'Socio Desconocido'),
            persona_doc,
            GETDATE(),
            GETDATE()
        FROM prestamos
        WHERE persona_id IS NOT NULL 
          AND persona_id NOT IN (SELECT id FROM socios)
    """)

    # 3. Crear Foreign Key constraint en prestamos hacia socios si no existe
    op.execute("""
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_prestamos_persona_id_socios')
        BEGIN
            ALTER TABLE prestamos
            ADD CONSTRAINT fk_prestamos_persona_id_socios
            FOREIGN KEY (persona_id) REFERENCES socios(id);
        END
    """)


def downgrade() -> None:
    op.execute("""
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_prestamos_persona_id_socios')
        BEGIN
            ALTER TABLE prestamos DROP CONSTRAINT fk_prestamos_persona_id_socios;
        END
    """)
    op.execute("""
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'socios')
        BEGIN
            DROP TABLE socios;
        END
    """)
