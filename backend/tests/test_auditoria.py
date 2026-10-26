import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


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
