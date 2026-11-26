from datetime import datetime
from decimal import Decimal
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.features.revisar_cobrados.controller import router
from app.features.auth.controller import get_auth_service, obtener_perfil_verificado
from app.features.auth.schemas import UserProfileResponse
from app.features.auth.service import AuthService
from app.core.config import settings
from app.integrations.oracle_client import oracle_client


def client(autenticado=True):
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    if autenticado:
        app.dependency_overrides[obtener_perfil_verificado] = lambda: UserProfileResponse(id=7, usuario='operador_verificado')
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


def test_periodo_haber_permite_omitir_fechas(monkeypatch):
    def ejecutar(sql, params):
        assert params['periodo_haber'] == '202611'
        assert params['fecha_desde'] is None
        assert params['fecha_hasta'] is None
        return ['importe_cobrado'], []

    monkeypatch.setattr(oracle_client, 'ejecutar_consulta', ejecutar)
    endpoint = '/api/v1/reportes/revisar-cobrados'
    http = client()
    assert http.post(endpoint, json={'periodo_haber': '202611'}).status_code == 200
    assert http.post(endpoint, json={}).status_code == 422
    assert http.post(endpoint, json={'fecha_hasta': '2026-11-26'}).status_code == 422


def test_catalogo_usa_sesion_coopya_verificada(monkeypatch):
    token = '7cc6fb89-1d5f-4284-bcfb-3e7190c5dc61'
    monkeypatch.setattr(settings, 'COOPYA_DB_ENABLED', True)
    monkeypatch.setattr(oracle_client, 'ejecutar_consulta', lambda *args: (['tipo_prestamo'], [('BAPRO',)]))
    service = AuthService()

    def obtener_perfil(valor):
        assert AuthService.limpiar_token(valor) == token
        return UserProfileResponse(id=7, usuario='operador_verificado')

    monkeypatch.setattr(service, 'obtener_perfil_por_token', obtener_perfil)
    http = client(False)
    http.app.dependency_overrides[get_auth_service] = lambda: service
    endpoint = '/api/v1/reportes/revisar-cobrados/tipos'
    for headers in ({'Authorization': f'bearer {token}'}, {'X-Auth-Token': token}):
        response = http.get(endpoint, headers=headers)
        assert response.status_code == 200
        assert response.json() == ['BAPRO']

    monkeypatch.setattr(
        service, 'obtener_perfil_por_token',
        lambda valor: UserProfileResponse(id=1, usuario='test_operator'),
    )
    assert http.get(endpoint, headers={'Authorization': f'Bearer {token}'}).status_code == 401


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
