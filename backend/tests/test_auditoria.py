import uuid
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app
from app.features.auth.controller import get_auth_service
from app.features.auth.schemas import UserProfileResponse
from app.features.auth.service import AuthService

client = TestClient(app)


class FakeAuthService(AuthService):
    def __init__(self, usuario: str = "operador_real", user_id: int = 42):
        super().__init__(db_client=None)
        self._usuario = usuario
        self._user_id = user_id

    def obtener_perfil_por_token(self, token):
        if token in ("token-valido", "Bearer token-valido"):
            return UserProfileResponse(
                id=self._user_id,
                usuario=self._usuario,
                mail=f"{self._usuario}@coopya.com.ar",
                roles=["Acceso Completo"],
                es_acceso_completo=True,
            )
        raise HTTPException(status_code=401, detail="Token inválido")


def test_auditoria_en_creacion_y_soft_delete_linea():
    # 1. Crear una línea con operador X-User-Name
    motores = client.get("/api/v1/motores").json()
    assert len(motores) > 0
    motor_id = motores[0]["id"]

    codigo_random = f"AUD_{uuid.uuid4().hex[:6].upper()}"
    linea_payload = {
        "codigo": codigo_random,
        "nombre": "Línea para Test Auditoría",
        "descripcion": "Verificación de tablas dedicadas",
        "motor_id": motor_id,
        "tasa_default": 0.55,
        "alicuota_iva": 0.21,
        "monto_minimo_centavos": 100000,
        "monto_maximo_centavos": 5000000,
        "monto_paso_centavos": 10000,
        "plazo_minimo_meses": 1,
        "plazo_maximo_meses": 24,
        "requiere_socio_al_dia": True,
        "activo": True,
    }

    headers = {"X-User-Name": "operador_test@coopya.com"}
    resp_create = client.post("/api/v1/lineas", json=linea_payload, headers=headers)
    assert resp_create.status_code == 201
    linea_creada = resp_create.json()
    linea_id = linea_creada["id"]

    # 2. Verificar que se grabó en la tabla dedicada auditoria_configuracion_creditos
    resp_audit = client.get(
        f"/api/v1/auditoria/configuracion-creditos?tipo_entidad=LINEA&entidad_id={linea_id}"
    )
    assert resp_audit.status_code == 200
    res = resp_audit.json()
    assert res["total"] >= 1
    items = res["items"]
    assert items[0]["accion"] == "CREATE"
    assert items[0]["usuario_operador"] == "operador_test@coopya.com"
    assert items[0]["codigo"] == codigo_random

    # 3. Aplicar Soft-Delete
    resp_delete = client.delete(f"/api/v1/lineas/{linea_id}", headers=headers)
    assert resp_delete.status_code == 204

    # 4. Verificar que sigue existiendo en la DB pero inactiva (Soft-Delete)
    resp_get = client.get(f"/api/v1/lineas/{linea_id}")
    assert resp_get.status_code == 200
    assert resp_get.json()["activo"] is False

    # 5. Verificar evento SOFT_DELETE en auditoría dedicada
    resp_audit_after = client.get(
        f"/api/v1/auditoria/configuracion-creditos?tipo_entidad=LINEA&entidad_id={linea_id}"
    )
    res_after = resp_audit_after.json()
    assert res_after["total"] >= 2
    items_after = res_after["items"]
    assert items_after[0]["accion"] == "SOFT_DELETE"


def test_auditoria_resuelve_operador_desde_token_bearer_en_lineas_y_prestamos():
    fake_auth = FakeAuthService(usuario="nmonti", user_id=77)
    app.dependency_overrides[get_auth_service] = lambda: fake_auth
    try:
        headers = {
            "Authorization": "Bearer token-valido",
            "X-User-Name": "usuario_spoofed",
        }
        motores = client.get("/api/v1/motores").json()
        motor_id = motores[0]["id"]
        codigo = f"TOK_{uuid.uuid4().hex[:6].upper()}"
        resp_linea = client.post(
            "/api/v1/lineas",
            json={
                "codigo": codigo,
                "nombre": "Línea Token Bearer",
                "descripcion": "Test atribución operador desde Bearer",
                "motor_id": motor_id,
                "tasa_default": 0.55,
                "alicuota_iva": 0.21,
                "monto_minimo_centavos": 100000,
                "monto_maximo_centavos": 5000000,
                "monto_paso_centavos": 10000,
                "plazo_minimo_meses": 1,
                "plazo_maximo_meses": 24,
                "requiere_socio_al_dia": True,
                "activo": True,
            },
            headers=headers,
        )
        assert resp_linea.status_code == 201, resp_linea.text
        linea_id = resp_linea.json()["id"]

        audit_conf = client.get(
            f"/api/v1/auditoria/configuracion-creditos?tipo_entidad=LINEA&entidad_id={linea_id}",
            headers=headers,
        ).json()
        assert audit_conf["total"] >= 1
        assert audit_conf["items"][0]["usuario_operador"] == "nmonti"

        resp_prestamo = client.post(
            "/api/v1/prestamos",
            json={
                "persona_id": 9998,
                "persona_nombre": "ANA AUDITORIA",
                "persona_doc": "31222333",
                "linea_id": linea_id,
                "monto_solicitado_centavos": 1000000,
                "plazo_meses": 3,
                "tna_pactada": 0.55,
                "alicuota_iva": 0.21,
            },
            headers=headers,
        )
        assert resp_prestamo.status_code == 201, resp_prestamo.text
        prestamo_id = resp_prestamo.json()["id"]

        resp_pagar = client.post(
            f"/api/v1/prestamos/{prestamo_id}/cuotas/1/pagar",
            headers=headers,
        )
        assert resp_pagar.status_code == 200, resp_pagar.text

        audit_prest = client.get(
            f"/api/v1/auditoria/prestamos?prestamo_id={prestamo_id}",
            headers=headers,
        ).json()
        assert audit_prest["total"] >= 2
        assert all(it["usuario_operador"] == "nmonti" for it in audit_prest["items"])
    finally:
        app.dependency_overrides.clear()


def test_auditoria_bapro_usa_usuario_y_id_desde_token():
    fake_auth = FakeAuthService(usuario="operador_bapro", user_id=88)
    app.dependency_overrides[get_auth_service] = lambda: fake_auth
    try:
        from app.features.presentaciones_bapro.controller import get_service as get_bapro_service
        from app.features.presentaciones_bapro.schemas import GenerarPresentacionBaproResponse

        llamadas = {}

        class StubBaproService:
            def generar_presentacion_bapro(
                self, req, usuario_id=None, usuario_operador=None
            ):
                llamadas["usuario_id"] = usuario_id
                llamadas["usuario_operador"] = usuario_operador
                return (
                    GenerarPresentacionBaproResponse(
                        nro_archivo=req.nro_lista or 99001,
                        nombre_archivo="test.txt",
                        total_registros=1,
                        total_monto=100.0,
                        ruta="presentaciones/bapro/99001/test.txt",
                        fecha_generacion="2026-11-16T00:00:00",
                    ),
                    b"",
                )

        app.dependency_overrides[get_bapro_service] = lambda: StubBaproService()
        resp = client.post(
            "/api/v1/presentaciones-bapro/generar",
            json={
                "nro_lista": 99001,
                "cuota_ids": ["c-1"],
            },
            headers={"Authorization": "Bearer token-valido"},
        )
        assert resp.status_code == 200, resp.text
        assert llamadas == {"usuario_id": 88, "usuario_operador": "operador_bapro"}
    finally:
        app.dependency_overrides.clear()


def test_resolver_operador_sin_token_y_token_invalido():
    srv = FakeAuthService(usuario="nmonti", user_id=77)
    res_vacio = srv.resolver_operador(token=None, fallback_usuario=None)
    assert res_vacio.id is None
    assert res_vacio.usuario is None

    res_header = srv.resolver_operador(token=None, fallback_usuario="script_externo")
    assert res_header.id is None
    assert res_header.usuario == "script_externo"

    res_invalido = srv.resolver_operador(token="Bearer token-expirado", fallback_usuario="respaldo")
    assert res_invalido.id is None
    assert res_invalido.usuario == "respaldo"
