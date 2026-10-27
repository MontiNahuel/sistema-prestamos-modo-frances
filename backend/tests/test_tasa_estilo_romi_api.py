"""API, alta y persistencia Romi contra SQLite aislado, sin CoopYa ni bancos."""
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.domain.calculadoras.romi import CuotaRomiExacta
from app.features.lineas.model import LineaPrestamo
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.model import MotorCalculo
from app.features.motores.repository import MotorCalculoRepository
from app.features.prestamos.controller import get_prestamo_service
from app.features.prestamos.repository import PrestamoRepository
from app.features.prestamos.service import PrestamoService
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService
from app.services.seed_service import seed_motores_y_lineas


@pytest.fixture
def romi_api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_motores_y_lineas(db)
        seed_motores_y_lineas(db)
        motor = db.query(MotorCalculo).filter_by(codigo="TASA_ESTILO_ROMI").one()
        linea = db.query(LineaPrestamo).filter_by(codigo="PERS_TRADICIONAL").one()
        linea.motor_id = motor.id
        db.commit()
        service = PrestamoService(
            PrestamoRepository(db), LineaPrestamoRepository(db), MotorCalculoRepository(db),
            SocioService(SocioRepository(db)), coopya_db=None,
        )
        anteriores = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_prestamo_service] = lambda: service
        try:
            # Sin lifespan: no se inicia ni se conecta la base configurada.
            yield TestClient(app), motor.id, linea.id
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(anteriores)
    engine.dispose()


def test_catalogo_y_simulacion_por_motor_y_linea(romi_api):
    client, motor_id, linea_id = romi_api
    resp = client.get("/api/v1/motores")
    assert resp.status_code == 200
    motores = [m for m in resp.json() if m["codigo"] == "TASA_ESTILO_ROMI"]
    assert len(motores) == 1
    assert motores[0]["nombre"] == "tasa estilo-romi"
    assert motores[0]["convencion_tasa"] == "TASA_ESTILO_ROMI"
    payload = {"monto_centavos": 2000000, "plazo_meses": 9, "tna": "3.288", "alicuota_iva": "0.21"}
    con_motor = client.post("/api/v1/simulaciones", json=dict(payload, motor_id=motor_id))
    con_linea = client.post("/api/v1/simulaciones", json=dict(payload, linea_id=linea_id))
    assert con_motor.status_code == con_linea.status_code == 200
    assert con_motor.json() == con_linea.json()
    data = con_motor.json()
    assert data["convencion_tasa"] == "TASA_ESTILO_ROMI"
    assert [c["cuota_total_centavos"] for c in data["cronograma"]] == [717619] * 9
    assert Decimal(data["cronograma"][-1]["calculo_exacto"]["capital_pesos"]).quantize(Decimal("0.01")) == Decimal("5389.39")


def test_otorgamiento_guarda_decimales_y_coincide_con_simulacion(romi_api):
    client, _, linea_id = romi_api
    simulacion = client.post("/api/v1/simulaciones", json={
        "monto_centavos": 2000000, "plazo_meses": 9, "tna": "3.288", "linea_id": linea_id,
    }).json()
    respuesta = client.post("/api/v1/prestamos", json={
        "persona_id": 123, "persona_nombre": "Prueba Romi", "persona_doc": "123",
        "monto_solicitado_centavos": 2000000, "plazo_meses": 9, "tna_pactada": "3.288",
        "linea_id": linea_id, "fecha_primer_vencimiento": "2026-11-10",
    })
    assert respuesta.status_code == 201, respuesta.text
    prestamo = respuesta.json()
    detalle = client.get(f"/api/v1/prestamos/{prestamo['id']}").json()
    assert detalle["linea_snapshot"]["reglas_motor_json"]["convencion_tasa"] == "TASA_ESTILO_ROMI"
    for c, s in zip(detalle["cuotas"], simulacion["cronograma"], strict=True):
        for campo in ("capital_centavos", "interes_centavos", "iva_interes_centavos", "cuota_total_centavos", "calculo_exacto"):
            if campo == "calculo_exacto":
                assert CuotaRomiExacta.model_validate(c[campo]) == CuotaRomiExacta.model_validate(s[campo])
            else:
                assert c[campo] == s[campo]
    assert detalle["total_a_pagar_centavos"] == simulacion["total_a_pagar_centavos"]
    assert detalle["cuotas"][-1]["saldo_final_centavos"] == 0
    pago = client.post(f"/api/v1/prestamos/{prestamo['id']}/cuotas/1/pagar")
    assert pago.status_code == 200, pago.text
    assert pago.json()["cuotas"][0]["monto_pagado_centavos"] == 717619
    assert pago.json()["cuotas"][0]["calculo_exacto"] == detalle["cuotas"][0]["calculo_exacto"]
