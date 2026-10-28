"""Regresión del arranque de una base SQL Server anterior al campo Romi."""
from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from app.core.database import _asegurar_columnas_criticas


class SqlServerAnterior:
    """Simula la resolución de columnas al compilar cada lote SQL Server."""

    dialect = SimpleNamespace(name="mssql")

    def __init__(self, existe_columna=False):
        self.existe_columna = existe_columna
        self.valores = [None, "PESOS_ENTEROS"]
        self.lotes = []

    @contextmanager
    def begin(self):
        yield self

    def execute(self, statement):
        sql = str(statement)
        self.lotes.append(sql)
        # SQL Server resuelve UPDATE antes de ejecutar el ALTER del mismo lote.
        if "UPDATE motores_calculo SET redondeo_cuota" in sql:
            if not self.existe_columna:
                raise RuntimeError("Invalid column name 'redondeo_cuota'")
            self.valores = [v if v is not None else "CON_CENTAVOS" for v in self.valores]
        if "ALTER TABLE motores_calculo ADD redondeo_cuota" in sql:
            self.existe_columna = True


def test_actualiza_base_anterior_y_puede_repetirse():
    engine = SqlServerAnterior()
    _asegurar_columnas_criticas(engine)
    assert engine.existe_columna
    assert engine.valores == ["CON_CENTAVOS", "PESOS_ENTEROS"]
    _asegurar_columnas_criticas(engine)
    assert engine.valores == ["CON_CENTAVOS", "PESOS_ENTEROS"]


def test_fallo_de_migracion_critica_no_se_oculta():
    engine = SqlServerAnterior()
    engine.execute = lambda _: (_ for _ in ()).throw(RuntimeError("DDL falló"))
    with pytest.raises(RuntimeError, match="DDL falló"):
        _asegurar_columnas_criticas(engine)


def test_otras_bases_no_reciben_sql_de_sql_server():
    engine = SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))
    _asegurar_columnas_criticas(engine)
