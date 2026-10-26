from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_proximo_numero_lista_y_validacion():
    resp = client.get("/api/v1/presentaciones-bapro/proximo-nro-lista")
    assert resp.status_code == 200
    data = resp.json()
    assert "nro_lista_propuesto" in data
    assert data["nro_lista_propuesto"] >= 15000
    assert data["disponible"] is True

    # Validar un número no utilizado
    resp_val = client.get(f"/api/v1/presentaciones-bapro/validar-nro-lista/{data['nro_lista_propuesto']}")
    assert resp_val.status_code == 200
    assert resp_val.json()["disponible"] is True


def test_buscar_cuotas_con_nuevos_filtros_fechas_y_dni():
    # Buscar con rango de fechas y filtro de último dígito DNI
    payload = {
        "fecha_desde": "2026-01-01",
        "fecha_hasta": "2027-12-31",
        "dni_desde": 0,
        "dni_hasta": 9,
        "incluir_presentadas": True,
    }
    resp = client.post("/api/v1/presentaciones-bapro/buscar-cuotas", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "presentables" in data
    assert "excluidas" in data

    # Si filtramos por un último dígito puntual (ej: sólo DNI terminado en 9)
    payload_9 = {
        "fecha_desde": "2026-01-01",
        "fecha_hasta": "2027-12-31",
        "dni_desde": 9,
        "dni_hasta": 9,
        "incluir_presentadas": True,
    }
    resp_9 = client.post("/api/v1/presentaciones-bapro/buscar-cuotas", json=payload_9)
    assert resp_9.status_code == 200
    data_9 = resp_9.json()
    for item in data_9["presentables"]:
        doc = item["socio_documento"].strip()
        last_digit = next((c for c in reversed(doc) if c.isdigit()), None)
        assert last_digit == "9"
