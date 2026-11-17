from contextlib import contextmanager
from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from main import app
from app.core.config import settings
from app.features.auth.service import AuthService

client = TestClient(app)


def test_auth_me_sin_token_incluye_sistema_central_url():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["usuario"] == "operador_dev"
    assert data["sistema_central_url"] == settings.COOPYA_BASE_URL


def test_auth_service_valida_token_sso_y_rechaza_invalido():
    class FakeCursor:
        def __init__(self, rows):
            self._rows = rows

        def execute(self, sql, params):
            self.sql = sql
            self.params = params

        def fetchall(self):
            return self._rows

    class FakeConn:
        def __init__(self, rows):
            self._rows = rows

        def cursor(self):
            return FakeCursor(self._rows)

    class FakeDbClient:
        def __init__(self, rows):
            self._rows = rows

        @contextmanager
        def _connection(self):
            yield FakeConn(self._rows)

    srv_ok = AuthService(db_client=FakeDbClient([(7, "nacho", "nacho@coopya.com.ar", 1, "Acceso Completo")]))
    perfil = srv_ok.obtener_perfil_por_token("Bearer sso-token-valido")
    assert perfil.id == 7
    assert perfil.usuario == "nacho"
    assert perfil.es_acceso_completo is True
    assert perfil.sistema_central_url == settings.COOPYA_BASE_URL

    srv_expirado = AuthService(db_client=FakeDbClient([]))
    with pytest.raises(HTTPException) as exc:
        srv_expirado.obtener_perfil_por_token("Bearer token-vencido")
    assert exc.value.status_code == 401
