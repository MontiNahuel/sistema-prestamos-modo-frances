from datetime import datetime
from decimal import Decimal
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.features.revisar_cobrados.controller import router
from app.features.respuestas_bancarias.controller import operador
from app.integrations.oracle_client import oracle_client


def client(autenticado=True):
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    if autenticado:
        app.dependency_overrides[operador] = lambda: 'operador_verificado'
    return TestClient(app)


def test_consulta_parametrizada_y_centavos_exactos(monkeypatch):
    def ejecutar(sql, params):
        assert params['fecha_desde'] == datetime(2026, 11, 3)
        assert params['fecha_hasta'] == datetime(2026, 11, 5)
        assert params['tipo_prestamo'] == "Tipo ' especial"
        assert "Tipo ' especial" not in sql
        assert 'mv_prestamos_mora_completa' in sql.lower()
        return ['fuente_cobro', 'lista_cobro', 'importe_cobrado'], [('BNA', 'BNA / BNA - 1', Decimal('100.27'))]
    monkeypatch.setattr(oracle_client, 'ejecutar_consulta', ejecutar)
    r = client().post('/api/v1/reportes/revisar-cobrados', json={
        'fecha_desde': '2026-11-03', 'fecha_hasta': '2026-11-05',
        'periodo_haber': '202610', 'tipo_prestamo': "Tipo ' especial",
    })
    assert r.status_code == 200
    assert r.json()['filas'][0]['importe_cobrado_centavos'] == 10027


def test_validaciones_y_autenticacion():
    payload = {'fecha_desde': '2026-11-05', 'fecha_hasta': '2026-11-03'}
    assert client().post('/api/v1/reportes/revisar-cobrados', json=payload).status_code == 422
    payload.update(fecha_hasta='2026-11-05', periodo_haber='202613')
    assert client().post('/api/v1/reportes/revisar-cobrados', json=payload).status_code == 422
    assert client(False).get('/api/v1/reportes/revisar-cobrados/tipos').status_code == 401


def test_error_oracle_no_expone_conexion(monkeypatch):
    def falla(*args):
        raise RuntimeError('detalles privados')
    monkeypatch.setattr(oracle_client, 'ejecutar_consulta', falla)
    r = client().get('/api/v1/reportes/revisar-cobrados/tipos')
    assert r.status_code == 503
    assert 'privados' not in r.text


def test_sin_importe_no_inventa_cero(monkeypatch):
    monkeypatch.setattr(oracle_client, 'ejecutar_consulta', lambda *a: (['importe_cobrado'], [(None,)]))
    r = client().post('/api/v1/reportes/revisar-cobrados', json={'fecha_desde': '2026-11-01', 'fecha_hasta': '2026-11-05'})
    assert r.status_code == 502
