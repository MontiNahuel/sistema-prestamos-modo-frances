from contextlib import contextmanager
from datetime import datetime
from decimal import Decimal
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.features.personas.controller import router
from app.features.respuestas_bancarias.controller import operador
from app.integrations.coopya_db_client import coopya_db_client


def test_reporte_sin_limite_con_estado_persona_y_orden_sql(monkeypatch):
    class Cursor:
        description = [('Id',), ('EstadoNombre',), ('FechaAlta',), ('CapitalSocial',)]

        def execute(self, sql, params):
            assert 'JOIN dbo.TipoEstados' in sql
            assert 'e.Id = p.Estado' in sql
            assert 'ORDER BY p.FechaAlta DESC, p.Id DESC' in sql
            assert 'TOP ' not in sql and 'OFFSET' not in sql
            assert params == ('Inactivo', 'No Activo')

        def __iter__(self):
            return iter([(i, 'Inactivo', datetime(2026, 11, 25, 10, 30), Decimal('12.34')) for i in range(125, 0, -1)])

    @contextmanager
    def connection():
        class Conn:
            def cursor(self):
                return Cursor()
        yield Conn()

    monkeypatch.setattr(coopya_db_client, '_connection', connection)
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    app.dependency_overrides[operador] = lambda: 'operador_verificado'
    response = TestClient(app).get('/api/v1/personas/no-activas')
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 125
    assert rows[0]['Id'] == 125 and rows[-1]['Id'] == 1
    assert rows[0]['FechaAlta'] == '2026-11-25T10:30:00'
    assert rows[0]['CapitalSocial'] == 12.34


def test_reporte_exige_autenticacion():
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    assert TestClient(app).get('/api/v1/personas/no-activas').status_code == 401


def test_reporte_error_sql_no_expone_detalles(monkeypatch):
    @contextmanager
    def connection():
        raise RuntimeError('detalle de conexión privado')
        yield

    monkeypatch.setattr(coopya_db_client, '_connection', connection)
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    app.dependency_overrides[operador] = lambda: 'operador_verificado'
    response = TestClient(app).get('/api/v1/personas/no-activas')
    assert response.status_code == 503
    assert 'privado' not in response.text
