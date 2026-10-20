from decimal import Decimal
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig


def test_motor_frances_cuota_total_plana():
    # En cuota total plana con IVA, cada mes la cuota total a pagar (capital + interes + iva)
    # debe ser constante
    monto_centavos = 10000000 # $100.000,00
    plazo = 6
    tna = Decimal("0.60")
    iva = Decimal("0.21")

    cfg = MotorConfig(
        convencion_tasa=ConvencionTasa.TNA_PROPORCIONAL,
        base_dias=BaseDias.COMERCIAL_30_360,
        modalidad_iva=ModalidadIva.CUOTA_TOTAL_PLANA,
        ajuste_residual=AjusteResidual.ULTIMA_CUOTA
    )

    plan = CalculadoraFrances.calcular(
        monto_centavos=monto_centavos,
        plazo_meses=plazo,
        tasa_anual=tna,
        alicuota_iva=iva,
        config=cfg
    )

    # El capital amortizado debe ser exactamente el solicitado
    assert plan.total_capital_centavos == monto_centavos
    assert plan.cronograma[-1].saldo_final_centavos == 0

    # Las cuotas intermedias deben tener exactamente la misma cuota total
    primera_cuota_total = plan.cronograma[0].cuota_total_centavos
    for c in plan.cronograma[:-1]:
        assert c.cuota_total_centavos == primera_cuota_total


def test_motor_frances_tea_compuesta():
    monto_centavos = 5000000 # $50.000,00
    plazo = 12
    tea = Decimal("0.80") # 80% TEA
    iva = Decimal("0.21")

    cfg = MotorConfig(
        convencion_tasa=ConvencionTasa.TEA_COMPUESTA,
        base_dias=BaseDias.COMERCIAL_30_360,
        modalidad_iva=ModalidadIva.IVA_DECRECIENTE,
        ajuste_residual=AjusteResidual.ULTIMA_CUOTA
    )

    plan = CalculadoraFrances.calcular(
        monto_centavos=monto_centavos,
        plazo_meses=plazo,
        tasa_anual=tea,
        alicuota_iva=iva,
        config=cfg
    )

    assert plan.total_capital_centavos == monto_centavos
    assert plan.cronograma[-1].saldo_final_centavos == 0
