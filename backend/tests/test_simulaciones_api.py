from decimal import Decimal
from fastapi.testclient import TestClient
from main import app
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import BaseDias, ConvencionTasa, ModalidadIva

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
    assert float(data["tna"]) == 0.60
    assert float(data["tem"]) == 0.05
    assert abs(float(data["tea"]) - 0.795856) < 1e-6


def test_calculo_tasas_resumen_en_todas_las_convenciones():
    plan_tea = CalculadoraFrances.calcular(
        monto_centavos=10000000,
        plazo_meses=12,
        tasa_anual=Decimal("0.60"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TEA_COMPUESTA),
    )
    assert plan_tea.tea == Decimal("0.60")
    assert plan_tea.tem == Decimal("0.039944")
    assert plan_tea.tna == Decimal("0.479329")

    plan_real = CalculadoraFrances.calcular(
        monto_centavos=10000000,
        plazo_meses=12,
        tasa_anual=Decimal("0.60"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TNA_DIAS_REALES, base_dias=BaseDias.ACTUAL_365),
    )
    assert plan_real.tna == Decimal("0.60")
    assert plan_real.tem == Decimal("0.049315")
    esperado_tea_real = ((1.0 + (0.60 * 30.0 / 365.0)) ** (365.0 / 30.0)) - 1.0
    assert abs(float(plan_real.tea) - esperado_tea_real) < 1e-6

    plan_romi = CalculadoraFrances.calcular(
        monto_centavos=15000000,
        plazo_meses=9,
        tasa_anual=Decimal("4.1459"),
        alicuota_iva=Decimal("0.21"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365),
    )
    assert plan_romi.tem == Decimal("0.281619")
    assert plan_romi.tna == round(Decimal("0.28161892901618929016") * Decimal("12"), 6)
    assert float(plan_romi.tea) > 18.0

    plan_cero = CalculadoraFrances.calcular(
        monto_centavos=10000000,
        plazo_meses=6,
        tasa_anual=Decimal("0"),
        config=MotorConfig(modalidad_iva=ModalidadIva.IVA_DECRECIENTE),
    )
    assert plan_cero.tna == Decimal("0")
    assert plan_cero.tem == Decimal("0")
    assert plan_cero.tea == Decimal("0")
