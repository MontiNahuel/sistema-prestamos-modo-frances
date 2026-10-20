from decimal import Decimal
import pytest
from app.domain.calculadoras.sistema_frances import CalculadoraFrances


def test_calculo_frances_exactitud_capital_centavos():
    # $100.000,00 = 10.000.000 centavos
    monto_centavos = 10000000
    plazo = 12
    tna = Decimal("0.60")  # 60% anual (5% mensual)
    iva = Decimal("0.21")

    plan = CalculadoraFrances.calcular_simulacion(
        monto_centavos=monto_centavos,
        plazo_meses=plazo,
        tna=tna,
        alicuota_iva=iva
    )

    assert len(plan.cronograma) == plazo
    # La suma de capitales en centavos debe coincidir EXACTO sin perder 1 centavo
    assert plan.total_capital_centavos == monto_centavos
    assert plan.cronograma[-1].saldo_final_centavos == 0

    for cuota in plan.cronograma:
        assert cuota.cuota_total_centavos == cuota.capital_centavos + cuota.interes_centavos + cuota.iva_interes_centavos
        assert cuota.saldo_final_centavos == cuota.saldo_inicial_centavos - cuota.capital_centavos


def test_tasa_cero_centavos():
    # $60.000,00 = 6.000.000 centavos
    monto_centavos = 6000000
    plazo = 6
    tna = Decimal("0.00")

    plan = CalculadoraFrances.calcular_simulacion(
        monto_centavos=monto_centavos,
        plazo_meses=plazo,
        tna=tna
    )

    assert plan.total_capital_centavos == monto_centavos
    assert plan.total_interes_centavos == 0
    assert plan.total_iva_centavos == 0
    assert plan.cronograma[0].cuota_pura_centavos == 1000000  # $10.000 por mes
    assert plan.cronograma[-1].saldo_final_centavos == 0
