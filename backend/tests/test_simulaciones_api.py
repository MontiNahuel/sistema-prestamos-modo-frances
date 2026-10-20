from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_simulacion_centavos():
    payload = {
        "monto_centavos": 10000000, # $100.000,00
        "plazo_meses": 3,
        "tna": 0.60,
        "alicuota_iva": 0.21
    }
    response = client.post("/api/v1/simulaciones", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["monto_solicitado_centavos"] == 10000000
    assert len(data["cronograma"]) == 3
    assert data["total_capital_centavos"] == 10000000
    assert data["cronograma"][-1]["saldo_final_centavos"] == 0
