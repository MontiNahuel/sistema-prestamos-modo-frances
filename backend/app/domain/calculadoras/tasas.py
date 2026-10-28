from decimal import Decimal, localcontext
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
        # Usamos exponente en float con conversión a Decimal para conservar precisión
        uno = Decimal("1")
        base = float(uno + tasa_anual)
        expo = 1.0 / 12.0
        resultado_float = (base ** expo) - 1.0
        return Decimal(str(round(resultado_float, 10)))

    elif convencion == ConvencionTasa.TNA_DIAS_REALES:
        divisor = Decimal("365") if base_dias == BaseDias.ACTUAL_365 else Decimal("360")
        return (tasa_anual * Decimal(dias_periodo)) / divisor

    # Fallback por defecto: TNA proporcional
    return tasa_anual / Decimal("12")
