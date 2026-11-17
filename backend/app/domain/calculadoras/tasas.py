from decimal import Decimal
from typing import Tuple
from app.domain.enums import ConvencionTasa, BaseDias


def calcular_tasa_periodica(
    tasa_anual: Decimal,
    convencion: ConvencionTasa,
    dias_periodo: int = 30,
    base_dias: BaseDias = BaseDias.COMERCIAL_30_360,
    alicuota_iva: Decimal = Decimal("0.21"),
) -> Decimal:
    """
    Calcula la tasa de interés periódica (i) según la convención configurada.
    Retorna un Decimal de alta precisión para cálculos intermedios.
    """
    if tasa_anual <= Decimal("0"):
        return Decimal("0")

    if convencion == ConvencionTasa.TASA_ROMI_COMERCIAL_365:
        tasa_mensual_gravada = (tasa_anual * Decimal(dias_periodo)) / Decimal("365")
        divisor = Decimal("1") + alicuota_iva
        return tasa_mensual_gravada / divisor if divisor > Decimal("0") else tasa_mensual_gravada

    if convencion == ConvencionTasa.TASA_ESTILO_ROMI:
        return tasa_anual / Decimal("12")

    if convencion == ConvencionTasa.TNA_PROPORCIONAL:
        # Tasa nominal anual proporcional a 12 meses
        return tasa_anual / Decimal("12")

    elif convencion == ConvencionTasa.TEA_COMPUESTA:
        # Tasa efectiva equivalente mensual: i = (1 + TEA)^(1/12) - 1
        base = float(Decimal("1") + tasa_anual)
        resultado_float = (base ** (1.0 / 12.0)) - 1.0
        return Decimal(str(round(resultado_float, 10)))

    elif convencion == ConvencionTasa.TNA_DIAS_REALES:
        divisor = Decimal("365") if base_dias == BaseDias.ACTUAL_365 else Decimal("360")
        return (tasa_anual * Decimal(dias_periodo)) / divisor

    # Fallback por defecto: TNA proporcional
    return tasa_anual / Decimal("12")


def calcular_tasas_resumen(
    tasa_anual: Decimal,
    convencion: ConvencionTasa,
    base_dias: BaseDias = BaseDias.COMERCIAL_30_360,
    alicuota_iva: Decimal = Decimal("0.21"),
) -> Tuple[Decimal, Decimal, Decimal]:
    """Retorna (tna, tem, tea) consistentes entre sí, acotadas a 6 decimales."""
    if tasa_anual <= Decimal("0"):
        cero = Decimal("0")
        return cero, cero, cero

    tem_raw = calcular_tasa_periodica(
        tasa_anual=tasa_anual,
        convencion=convencion,
        dias_periodo=30,
        base_dias=base_dias,
        alicuota_iva=alicuota_iva,
    )
    tem = round(tem_raw, 6)

    if convencion in (ConvencionTasa.TEA_COMPUESTA, ConvencionTasa.TASA_ROMI_COMERCIAL_365):
        tna = round(tem_raw * Decimal("12"), 6)
    else:
        tna = round(tasa_anual, 6)

    if convencion == ConvencionTasa.TEA_COMPUESTA:
        tea = round(tasa_anual, 6)
    elif convencion == ConvencionTasa.TNA_DIAS_REALES and base_dias == BaseDias.ACTUAL_365:
        tea_float = ((1.0 + float(tem_raw)) ** (365.0 / 30.0)) - 1.0
        tea = Decimal(str(round(tea_float, 6)))
    else:
        tea_float = ((1.0 + float(tem_raw)) ** 12.0) - 1.0
        tea = Decimal(str(round(tea_float, 6)))

    return tna, tem, tea
