"""Pruebas para TASA_ROMI_COMERCIAL_365: ingreso de TNA comercial con IVA (base 365/30) y redondeo de cuota."""
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import ConvencionTasa, ModalidadIva, RedondeoCuota
from app.features.lineas.model import LineaPrestamo
from app.features.motores.model import MotorCalculo
from app.services.seed_service import seed_motores_y_lineas


def test_romi_comercial_calculo_directo():
    cfg = MotorConfig(
        convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365,
        modalidad_iva=ModalidadIva.CUOTA_TOTAL_PLANA,
        redondeo_cuota=RedondeoCuota.PESOS_ENTEROS,
    )
    # Préstamo de $150.000 a 9 cuotas con TNA comercial con IVA 414.586395%
    plan = CalculadoraFrances.calcular(
        monto_centavos=15000000,
        plazo_meses=9,
        tasa_anual=Decimal("4.14586395"),
        alicuota_iva=Decimal("0.21"),
        config=cfg,
    )
    assert plan.convencion_tasa == ConvencionTasa.TASA_ROMI_COMERCIAL_365
    assert plan.modalidad_iva == ModalidadIva.CUOTA_TOTAL_PLANA
    assert plan.redondeo_cuota == RedondeoCuota.PESOS_ENTEROS
    # Todas las cuotas deben dar exactamente $55.045,00
    for c in plan.cronograma:
        assert c.cuota_total_centavos == 5504500
    assert sum(c.capital_centavos for c in plan.cronograma) == 15000000
    assert plan.cronograma[-1].saldo_final_centavos == 0


def test_romi_con_tasa_corta_414_59_redondea_a_pesos_enteros():
    """Al ingresar 414.59% (4.1459) con PESOS_ENTEROS, la cuota da exactamente $55.045,00."""
    cfg = MotorConfig(
        convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365,
        modalidad_iva=ModalidadIva.CUOTA_TOTAL_PLANA,
        redondeo_cuota=RedondeoCuota.PESOS_ENTEROS,
    )
    plan = CalculadoraFrances.calcular(
        monto_centavos=15000000,
        plazo_meses=9,
        tasa_anual=Decimal("4.1459"),
        alicuota_iva=Decimal("0.21"),
        config=cfg,
    )
    for c in plan.cronograma:
        assert c.cuota_total_centavos == 5504500
    assert sum(c.capital_centavos for c in plan.cronograma) == 15000000
    assert plan.cronograma[-1].saldo_final_centavos == 0


def test_romi_con_centavos_mantiene_fraccion():
    """Con CON_CENTAVOS, la cuota conserva los decimales ($55.045,39)."""
    cfg = MotorConfig(
        convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365,
        modalidad_iva=ModalidadIva.CUOTA_TOTAL_PLANA,
        redondeo_cuota=RedondeoCuota.CON_CENTAVOS,
    )
    plan = CalculadoraFrances.calcular(
        monto_centavos=15000000,
        plazo_meses=9,
        tasa_anual=Decimal("4.1459"),
        alicuota_iva=Decimal("0.21"),
        config=cfg,
    )
    for c in plan.cronograma:
        assert c.cuota_total_centavos == 5504539
    assert sum(c.capital_centavos for c in plan.cronograma) == 15000000
    assert plan.cronograma[-1].saldo_final_centavos == 0


def test_romi_comercial_catalogo_y_simulacion_api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_motores_y_lineas(db)
        motor = db.query(MotorCalculo).filter_by(codigo="TASA_ROMI_COMERCIAL_365").one()
        assert motor.redondeo_cuota == "PESOS_ENTEROS"
        linea = db.query(LineaPrestamo).filter_by(codigo="ROMI_COMERCIAL_414").one()
        assert linea.motor_id == motor.id

        anteriores = app.dependency_overrides.copy()
        app.dependency_overrides[get_db] = lambda: db
        try:
            client = TestClient(app)
            resp = client.get("/api/v1/motores")
            assert resp.status_code == 200
            motores = [m for m in resp.json() if m["codigo"] == "TASA_ROMI_COMERCIAL_365"]
            assert len(motores) == 1
            assert motores[0]["convencion_tasa"] == "TASA_ROMI_COMERCIAL_365"
            assert motores[0]["redondeo_cuota"] == "PESOS_ENTEROS"

            payload = {
                "monto_centavos": 15000000,
                "plazo_meses": 9,
                "tna": "4.1459",
                "alicuota_iva": "0.21",
                "motor_id": motor.id,
            }
            sim = client.post("/api/v1/simulaciones", json=payload)
            assert sim.status_code == 200
            data = sim.json()
            assert data["convencion_tasa"] == "TASA_ROMI_COMERCIAL_365"
            assert [c["cuota_total_centavos"] for c in data["cronograma"]] == [5504500] * 9
            assert data["cronograma"][0]["calculo_exacto"] is not None
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(anteriores)
    engine.dispose()


def test_romi_comercial_otorgar_prestamo_sin_overflow_tem():
    """Valida que tem_pactada y tna_pactada se guarden con escala acotada al crear el préstamo."""
    client = TestClient(app)
    lineas = client.get("/api/v1/lineas").json()
    linea = next((l for l in lineas if l["codigo"] == "ROMI_COMERCIAL_414"), None)
    assert linea is not None, "La línea ROMI_COMERCIAL_414 debe existir"

    payload = {
        "persona_id": 9999,
        "persona_nombre": "PETRUCELLI ROSA BLANCA",
        "persona_doc": "997873",
        "monto_solicitado_centavos": 15000000,
        "plazo_meses": 9,
        "linea_id": linea["id"],
        "tna_pactada": float(linea["tasa_default"]),
        "alicuota_iva": float(linea["alicuota_iva"]),
    }
    resp = client.post("/api/v1/prestamos", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["monto_solicitado_centavos"] == 15000000
    assert len(data["cuotas"]) == 9
    assert data["cuotas"][0]["cuota_total_centavos"] == 5504500
    assert data["cuotas"][-1]["cuota_total_centavos"] == 5504500
    tem_str = str(data["tem_pactada"])
    partes = tem_str.split(".")
    if len(partes) > 1:
        assert len(partes[1]) <= 6
