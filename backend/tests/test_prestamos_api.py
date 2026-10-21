from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_otorgar_prestamo_y_flujo_completo():
    # 1. Obtener una línea existente
    lineas = client.get("/api/v1/lineas").json()
    assert len(lineas) > 0
    linea = lineas[0]

    # 2. Otorgar un préstamo formal
    payload = {
        "persona_id": 9999,
        "persona_nombre": "JUAN PEREZ",
        "persona_doc": "30111222",
        "linea_id": linea["id"],
        "monto_solicitado_centavos": 5000000, # $50.000,00
        "plazo_meses": 6,
        "tna_pactada": float(linea["tasa_default"]),
        "alicuota_iva": float(linea["alicuota_iva"]),
        "observaciones": "Préstamo de prueba automatizada"
    }

    resp = client.post("/api/v1/prestamos", json=payload)
    assert resp.status_code == 201, resp.text
    prestamo = resp.json()

    assert prestamo["id"] is not None
    assert prestamo["persona_id"] == 9999
    assert prestamo["persona_nombre"] == "JUAN PEREZ"
    assert prestamo["monto_solicitado_centavos"] == 5000000
    assert prestamo["plazo_meses"] == 6
    assert prestamo["estado"] == "ACTIVO"
    assert len(prestamo["cuotas"]) == 6
    assert prestamo["linea_snapshot"] is not None
    assert prestamo["linea_snapshot"]["linea_id"] == linea["id"]
    assert prestamo["linea_snapshot"]["linea_nombre"] == linea["nombre"]
    assert prestamo["linea_snapshot"]["motor_nombre"] is not None

    prestamo_id = prestamo["id"]

    # 3. Listar préstamos y verificar que aparece
    resp_list = client.get("/api/v1/prestamos?persona_id=9999")
    assert resp_list.status_code == 200
    lista = resp_list.json()
    assert any(p["id"] == prestamo_id for p in lista)

    # 4. Obtener detalle puntual
    resp_get = client.get(f"/api/v1/prestamos/{prestamo_id}")
    assert resp_get.status_code == 200
    detalle = resp_get.json()
    assert len(detalle["cuotas"]) == 6
    assert detalle["cuotas"][0]["estado"] == "PENDIENTE"

    # 5. Pagar cuota 1
    resp_pagar = client.post(f"/api/v1/prestamos/{prestamo_id}/cuotas/1/pagar")
    assert resp_pagar.status_code == 200
    pagado = resp_pagar.json()
    cuota_1 = next(c for c in pagado["cuotas"] if c["numero_cuota"] == 1)
    assert cuota_1["estado"] == "PAGADA"
    assert pagado["saldo_deudor_actual_centavos"] < prestamo["saldo_deudor_actual_centavos"]

    # 6. Cancelar el préstamo
    resp_cancel = client.post(f"/api/v1/prestamos/{prestamo_id}/cancelar")
    assert resp_cancel.status_code == 200
    assert resp_cancel.json()["estado"] == "CANCELADO"
