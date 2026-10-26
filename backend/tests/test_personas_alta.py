import os
import sys
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.core.database import SessionLocal
from app.features.socios.model import Socio, MedioDePago

client = TestClient(app)


def test_alta_persona_flujo_exitoso_con_medios_de_pago():
    dni_test = f"{uuid.uuid4().int % 90000000 + 10000000}"
    payload = {
        "documento": dni_test,
        "cuil": f"20{dni_test}8",
        "nombre": "Nahuel",
        "apellido": "Monti",
        "email": "nmonti@ejemplo.com",
        "telefono": "1123456789",
        "domicilio": "Calle Falsa 123",
        "cbu": "0140000000000000000012",
        "alias_cbu": "NAHUEL.TEST.CBU",
        "banco_nombre": "BAPRO"
    }

    headers = {"X-Usuario-Operador": "test_operator"}
    with patch(
        "app.integrations.oracle_client.oracle_client.insertar_persona",
        return_value={"oracle_id": 166489, "tabla": "PRESTAPROD.PERSONA", "estado": "MOCK_OK", "mock": True}
    ):
        with patch(
            "app.integrations.coopya_client.coopya_client.crear_persona",
            return_value={"idPersona": int(dni_test[-6:]), "success": True, "mock": True}
        ):
            resp = client.post("/api/v1/personas", json=payload, headers=headers)

    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["documento"] == dni_test
    assert data["oracle_ok"] is True
    assert data["coopya_ok"] is True
    assert data["oracle_id"] == 166489
    assert data["cbu"] == "0140000000000000000012"
    assert data["banco_id"] == 5  # BAPRO tiene ID 5 en tipo_bancos

    # Verificar que en la base local se creó el Socio y el registro en medios_de_pago
    db = SessionLocal()
    try:
        socio_id = int(data["coopya_id"])
        socio = db.query(Socio).filter(Socio.id == socio_id).first()
        assert socio is not None
        assert socio.documento == dni_test

        medio = db.query(MedioDePago).filter(MedioDePago.socio_id == socio_id).first()
        assert medio is not None
        assert medio.valor == "0140000000000000000012"
        assert medio.banco_id == 5
        assert medio.predeterminado is True
        assert medio.titular_verificado is True
    finally:
        db.close()

    # Verificar registro en historial_cambios (auditoría)
    audit = client.get(f"/api/v1/auditoria?entidad_nombre=personas&entidad_id={dni_test}")
    assert audit.status_code == 200
    logs = audit.json()
    assert len(logs) >= 1
    assert logs[0]["accion"] == "CREATE"
    assert logs[0]["usuario_operador"] == "test_operator"


def test_alta_persona_falla_oracle_aborta_y_no_llama_coopya():
    dni_test = f"{uuid.uuid4().int % 90000000 + 10000000}"
    payload = {
        "documento": dni_test,
        "nombre": "Carlos",
        "apellido": "Fallo",
        "email": "carlos@ejemplo.com"
    }

    with patch(
        "app.integrations.oracle_client.oracle_client.insertar_persona",
        side_effect=RuntimeError("ORA-00001: Unique constraint violated")
    ) as mock_ora:
        with patch("app.integrations.coopya_client.coopya_client.crear_persona") as mock_coopya:
            resp = client.post("/api/v1/personas", json=payload)
            assert resp.status_code == 502
            assert "base legacy Oracle" in resp.json()["detail"]

            # Verificamos que Oracle FUE llamado
            mock_ora.assert_called_once()
            # Verificamos que CoopYa NUNCA fue llamado
            mock_coopya.assert_not_called()

    # Verificar que el error quedó auditado
    audit = client.get(f"/api/v1/auditoria?entidad_nombre=personas&entidad_id={dni_test}")
    assert audit.status_code == 200
    logs = audit.json()
    assert len(logs) >= 1
    assert logs[0]["accion"] == "ERROR_ORACLE"


def test_alta_persona_oracle_ok_falla_coopya_alerta_desinc():
    dni_test = f"{uuid.uuid4().int % 90000000 + 10000000}"
    payload = {
        "documento": dni_test,
        "nombre": "Laura",
        "apellido": "Desinc",
        "email": "laura@ejemplo.com"
    }

    with patch(
        "app.integrations.oracle_client.oracle_client.insertar_persona",
        return_value={"oracle_id": 166490, "tabla": "PRESTAPROD.PERSONA", "mock": True}
    ):
        with patch(
            "app.integrations.coopya_client.coopya_client.crear_persona",
            side_effect=RuntimeError("500 Internal Server Error CoopYa")
        ):
            resp = client.post("/api/v1/personas", json=payload)
            assert resp.status_code == 502
            assert "falló el alta en CoopYa" in resp.json()["detail"]

    # Verificar que se auditó la desincronización
    audit = client.get(f"/api/v1/auditoria?entidad_nombre=personas&entidad_id={dni_test}")
    assert audit.status_code == 200
    logs = audit.json()
    assert len(logs) >= 1
    assert logs[0]["accion"] == "DESINC_COOPYA"
