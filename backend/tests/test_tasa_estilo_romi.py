"""Referencias extraídas de Excel: no requieren Excel instalado al ejecutar pytest."""
import importlib.util
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig, round_cents
from app.domain.enums import AjusteResidual, BaseDias, ConvencionTasa, ModalidadIva


FIXTURES = Path(__file__).parent / "fixtures"
EXCEL = json.loads((FIXTURES / "romi_con_funcion_excel.json").read_text(encoding="utf-8"))
CASOS = json.loads((FIXTURES / "romi_excel_financieras.json").read_text(encoding="utf-8"))["cases"]
ROMI = MotorConfig(convencion_tasa=ConvencionTasa.TASA_ESTILO_ROMI,
                   modalidad_iva=ModalidadIva.CUOTA_TOTAL_PLANA)


def plan_excel(**kwargs):
    datos = dict(monto_centavos=2000000, plazo_meses=9, tasa_anual=Decimal("3.288"),
                 alicuota_iva=Decimal("0.21"), config=ROMI)
    datos.update(kwargs)
    return CalculadoraFrances.calcular(**datos)


def verificar_asientos(plan):
    saldo = plan.monto_solicitado_centavos
    for c in plan.cronograma:
        assert c.saldo_inicial_centavos == saldo
        assert c.capital_centavos + c.interes_centavos + c.iva_interes_centavos == c.cuota_total_centavos
        assert c.cuota_pura_centavos == c.capital_centavos + c.interes_centavos
        assert min(c.capital_centavos, c.interes_centavos, c.iva_interes_centavos, c.saldo_final_centavos) >= 0
        saldo -= c.capital_centavos
        assert c.saldo_final_centavos == saldo
        exacta = c.calculo_exacto
        assert c.capital_centavos == round_cents(exacta.capital_pesos * 100) + exacta.ajuste_capital_centavos
        assert c.interes_centavos == round_cents(exacta.interes_pesos * 100) + exacta.ajuste_interes_centavos
        assert c.iva_interes_centavos == round_cents(exacta.iva_interes_pesos * 100)
        assert c.cuota_total_centavos == round_cents(exacta.cuota_total_pesos * 100) + exacta.ajuste_cuota_centavos
    assert saldo == 0
    assert sum(c.capital_centavos for c in plan.cronograma) == plan.total_capital_centavos == plan.monto_solicitado_centavos
    assert sum(c.interes_centavos for c in plan.cronograma) == plan.total_interes_centavos
    assert sum(c.iva_interes_centavos for c in plan.cronograma) == plan.total_iva_centavos
    assert sum(c.cuota_total_centavos for c in plan.cronograma) == plan.total_a_pagar_centavos


@pytest.mark.parametrize("referencia", EXCEL["rows"], ids=lambda r: f"Excel_fila_{r['row']}")
def test_cada_celda_del_archivo_excel(referencia):
    c = plan_excel().cronograma[referencia["row"] - 17]
    exacta = c.calculo_exacto
    comparaciones = {
        "C": exacta.capital_pesos,
        "D": exacta.interes_pesos + exacta.iva_interes_pesos,
        "E": exacta.interes_pesos,
        "F": exacta.iva_interes_pesos,
        "G": exacta.cuota_total_pesos,
    }
    for columna, obtenido in comparaciones.items():
        esperado = Decimal(referencia[columna]["value"])
        # Excel almacena Double; exigimos igualdad a centavos y error < 1e-9 pesos.
        assert abs(obtenido - esperado) < Decimal("1e-9"), (columna, obtenido, esperado)
        assert round_cents(obtenido * 100) == round_cents(esperado * 100)


def test_cuotas_y_totales_excel_sin_drift_del_motor_anterior():
    plan = plan_excel()
    verificar_asientos(plan)
    assert [c.cuota_total_centavos for c in plan.cronograma] == [717619] * 9
    assert plan.cronograma[-1].capital_centavos == 538939
    assert plan.total_a_pagar_centavos == 6458571  # Suma de las nueve cuotas cobrables.
    total_excel = sum(Decimal(r["G"]["value"]) for r in EXCEL["rows"])
    assert abs(plan.calculo_exacto.total_a_pagar_pesos - total_excel) < Decimal("1e-9")
    assert round_cents(plan.calculo_exacto.total_a_pagar_pesos * 100) == 6458570
    assert abs(plan.calculo_exacto.total_capital_pesos - sum(c.calculo_exacto.capital_pesos for c in plan.cronograma)) < Decimal("1e-40")
    # La fila 19 del Excel demuestra por qué hay una conciliación explícita.
    tercera = plan.cronograma[2]
    assert tercera.calculo_exacto.ajuste_interes_centavos == 1
    assert tercera.interes_centavos == 513159
    assert round_cents(tercera.calculo_exacto.interes_pesos * 100) == 513158


@pytest.mark.parametrize("caso", CASOS, ids=lambda c: f"Excel_{c['input']['meses']}m_TEM_{c['input']['tem']}_IVA_{c['input']['iva']}")
def test_funciones_financieras_excel_191_cuotas(caso):
    entrada = caso["input"]
    plan = plan_excel(
        monto_centavos=int(Decimal(entrada["capital"]) * 100),
        plazo_meses=entrada["meses"],
        tasa_anual=Decimal(entrada["tem"]) * 12,
        alicuota_iva=Decimal(entrada["iva"]),
    )
    for c, referencia in zip(plan.cronograma, caso["rows"], strict=True):
        exacta = c.calculo_exacto
        for valor, esperado in zip(
            [exacta.capital_pesos, exacta.interes_pesos, exacta.iva_interes_pesos, exacta.cuota_total_pesos],
            referencia, strict=True,
        ):
            assert abs(valor - Decimal(esperado)) < Decimal("1e-7")
            assert round_cents(valor * 100) == round_cents(Decimal(esperado) * 100)
    verificar_asientos(plan)


@pytest.mark.parametrize("monto,plazo,tna", [(1, 120, "0"), (1, 120, "0.6"), (100, 120, "0"),
                                                (100, 120, "0.000001"), (10001, 7, "0"),
                                                (2000000, 120, "60")])
def test_bordes_monetarios_sin_importes_negativos(monto, plazo, tna):
    plan = plan_excel(monto_centavos=monto, plazo_meses=plazo, tasa_anual=Decimal(tna))
    verificar_asientos(plan)
    if Decimal(tna) == 0:
        assert plan.total_interes_centavos == plan.total_iva_centavos == 0


def test_fechas_iva_exento_y_reglas_romi_en_backend():
    cfg = MotorConfig(convencion_tasa=ConvencionTasa.TASA_ESTILO_ROMI,
                      modalidad_iva=ModalidadIva.EXENTO, base_dias=BaseDias.ACTUAL_365,
                      ajuste_residual=AjusteResidual.PRIMERA_CUOTA)
    plan = plan_excel(config=cfg, fecha_primer_vencimiento=date(2026, 11, 10))
    assert plan.base_dias == BaseDias.COMERCIAL_30_360
    assert plan.alicuota_iva == 0
    assert plan.total_iva_centavos == 0
    assert plan.cronograma[1].fecha_vencimiento == date(2026, 12, 10)
    assert plan.cronograma[-1].fecha_vencimiento == date(2027, 7, 10)
    verificar_asientos(plan)


def test_iva_negativo_no_genera_un_cronograma_invalido():
    with pytest.raises(ValueError, match="IVA"):
        plan_excel(alicuota_iva=Decimal("-1"))


def test_migracion_preserva_cuotas_existentes(monkeypatch):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, inspect, text

    archivo = Path(__file__).parents[1] / "alembic/versions/e28a7d19b604_calculo_exacto_romi.py"
    spec = importlib.util.spec_from_file_location("migracion_romi", archivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE cuotas (id INTEGER PRIMARY KEY, capital_centavos BIGINT NOT NULL)"))
        conn.execute(text("INSERT INTO cuotas (id, capital_centavos) VALUES (1, 2000000)"))
        monkeypatch.setattr(modulo, "op", Operations(MigrationContext.configure(conn)))
        modulo.upgrade()
        assert "calculo_exacto" in {c["name"] for c in inspect(conn).get_columns("cuotas")}
        assert conn.execute(text("SELECT capital_centavos, calculo_exacto FROM cuotas")).one() == (2000000, None)
        modulo.downgrade()
        assert "calculo_exacto" not in {c["name"] for c in inspect(conn).get_columns("cuotas")}
        assert conn.execute(text("SELECT capital_centavos FROM cuotas")).scalar_one() == 2000000
    engine.dispose()
