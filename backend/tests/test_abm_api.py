from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_listar_motores():
    resp = client.get("/api/v1/motores")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 4
    codigos = [m["codigo"] for m in data]
    assert "FRANCES_CLASICO" in codigos
    assert "FRANCES_CUOTA_PLANA" in codigos


def test_listar_lineas():
    resp = client.get("/api/v1/lineas")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    codigos = [l["codigo"] for l in data]
    assert "PERS_TRADICIONAL" in codigos


def test_simulacion_con_linea():
    lineas = client.get("/api/v1/lineas").json()
    linea_plana = next(l for l in lineas if l["codigo"] == "CUOTA_PLANA")

    payload = {
        "monto_centavos": 10000000,
        "plazo_meses": 6,
        "tna": float(linea_plana["tasa_default"]),
        "alicuota_iva": float(linea_plana["alicuota_iva"]),
        "linea_id": linea_plana["id"]
    }
    resp = client.post("/api/v1/simulaciones", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["monto_solicitado_centavos"] == 10000000
    # Al ser cuota plana con IVA, las primeras cuotas totales son idénticas
    assert data["cronograma"][0]["cuota_total_centavos"] == data["cronograma"][1]["cuota_total_centavos"]
