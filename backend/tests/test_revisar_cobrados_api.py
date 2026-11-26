from contextlib import contextmanager
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from time import monotonic, sleep
from types import SimpleNamespace
from zipfile import ZipFile
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.features.revisar_cobrados.controller import router
from app.features.revisar_cobrados import historico
from app.features.auth.controller import get_auth_service, obtener_perfil_verificado
from app.features.auth.schemas import UserProfileResponse
from app.features.auth.service import AuthService
from app.core.config import settings
from app.integrations.oracle_client import oracle_client


URL = '/api/v1/reportes/revisar-cobrados'


@pytest.fixture(autouse=True)
def consultas_aisladas(monkeypatch, tmp_path):
    monkeypatch.setattr(historico, '_consultas', {})
    monkeypatch.setattr(historico, '_directorio', SimpleNamespace(name=str(tmp_path)))


def client(autenticado=True, operador=7):
    app = FastAPI()
    app.include_router(router, prefix='/api/v1')
    if autenticado:
        app.dependency_overrides[obtener_perfil_verificado] = lambda: UserProfileResponse(id=operador, usuario='operador_verificado')
    return TestClient(app)


def esperar(http, url):
    fin = monotonic() + 5
    while monotonic() < fin:
        respuesta = http.get(url)
        if respuesta.status_code != 200 or respuesta.json()['estado'] != 'procesando':
            return respuesta
        sleep(0.01)
    pytest.fail('La consulta no terminó a tiempo')


def fila(importe, lista='BNA / BNA - 1'):
    return ('BNA', 'BNA', lista, 1, importe, 2, 3, 4, 5, '202610', datetime(2026, 11, 3), 'BAPRO')


def test_consulta_parametrizada_y_centavos_exactos(monkeypatch):
    @contextmanager
    def ejecutar(sql, params, *, lote):
        assert params['fecha_desde'] == datetime(2026, 11, 3)
        assert params['fecha_hasta'] == datetime(2026, 11, 5)
        assert params['tipo_prestamo'] == "Tipo ' especial"
        assert "Tipo ' especial" not in sql
        assert 'mv_prestamos_mora_completa' in sql.lower()
        lotes = iter([[fila(Decimal('100.27'))] * 50 + [fila(Decimal('12.51'), 'Otra lista')], []])
        yield SimpleNamespace(fetchmany=lambda size: next(lotes))
    monkeypatch.setattr(oracle_client, 'cursor_consulta', ejecutar)
    http = client()
    r = http.post(URL, json={
        'fecha_desde': '2026-11-03', 'fecha_hasta': '2026-11-05',
        'periodo_haber': '202610', 'tipo_prestamo': "Tipo ' especial",
    })
    assert r.status_code == 202
    ruta = f"{URL}/consultas/{r.json()['id']}"
    resultado = esperar(http, ruta + '?incluir_listas=true').json()
    assert len(resultado['filas']) == 50
    assert resultado['filas'][0]['importe_cobrado_centavos'] == 10027
    assert resultado['registros'] == 51
    assert resultado['cobrado'] == 502601
    assert len(resultado['listas']) == 2
    assert len(http.get(ruta, params={'pagina': 2}).json()['filas']) == 1
    assert http.get(ruta, params={'lista': 'Otra lista'}).json()['cobrado'] == 1251
    assert client(operador=8).get(ruta).status_code == 404

    monkeypatch.setattr(historico, 'FILAS_EXCEL', 50)
    excel = ruta + '/excel'
    assert http.post(excel).status_code == 202
    assert esperar(http, excel).json()['estado'] == 'lista'
    archivo = http.get(excel, params={'descargar': True})
    with ZipFile(BytesIO(archivo.content)) as libro:
        assert b'Detalle 2' in libro.read('xl/workbook.xml')


def test_validaciones_y_autenticacion():
    payload = {'fecha_desde': '2026-11-05', 'fecha_hasta': '2026-11-03'}
    assert client().post('/api/v1/reportes/revisar-cobrados', json=payload).status_code == 422
    payload.update(fecha_hasta='2026-11-05', periodo_haber='202613')
    assert client().post('/api/v1/reportes/revisar-cobrados', json=payload).status_code == 422
    assert client(False).get('/api/v1/reportes/revisar-cobrados/tipos').status_code == 401


@pytest.mark.parametrize(('filtros', 'esperados'), [
    ({}, (None, None, None, None)),
    ({'periodo_haber': '202611'}, ('202611', None, None, None)),
    ({'fecha_desde': '2026-11-03'}, (None, datetime(2026, 11, 3), None, None)),
    ({'fecha_hasta': '2026-11-26'}, (None, None, datetime(2026, 11, 26), None)),
    ({'tipo_prestamo': 'BAPRO'}, (None, None, None, 'BAPRO')),
])
def test_filtros_independientes_y_opcionales(monkeypatch, filtros, esperados):
    def iniciar(operador_id, sql, filtros, params):
        assert tuple(params[k] for k in ('periodo_haber', 'fecha_desde', 'fecha_hasta', 'tipo_prestamo')) == esperados
        return SimpleNamespace(id='prueba')

    monkeypatch.setattr(historico, 'iniciar', iniciar)
    endpoint = '/api/v1/reportes/revisar-cobrados'
    assert client().post(endpoint, json=filtros).status_code == 202


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
    @contextmanager
    def ejecutar(*args, **kwargs):
        yield SimpleNamespace(fetchmany=lambda size: [fila(None)])
    monkeypatch.setattr(oracle_client, 'cursor_consulta', ejecutar)
    http = client()
    r = http.post(URL, json={})
    assert esperar(http, f"{URL}/consultas/{r.json()['id']}").status_code == 503
