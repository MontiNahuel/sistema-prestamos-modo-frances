from decimal import Decimal
from typing import Sequence, Tuple


def calcular_cft_flujos(
    monto_centavos: int,
    flujos_centavos: Sequence[int],
    max_iter: int = 80,
) -> Tuple[Decimal, Decimal]:
    """
    Calcula el Costo Financiero Total (CFT) mensual por TIR sobre los flujos de cuotas
    y devuelve ``(cft_tna, cft_tea)`` en tanto por uno con 6 decimales.
    """
    if monto_centavos <= 0 or not flujos_centavos:
        cero = Decimal("0")
        return cero, cero

    total_pagado = sum(flujos_centavos)
    if total_pagado <= monto_centavos:
        cero = Decimal("0")
        return cero, cero

    monto = float(monto_centavos)

    def vpn(r: float) -> float:
        factor = 1.0 + r
        if factor <= 0.0:
            return float("inf")
        acum = 0.0
        potencia = factor
        for flujo in flujos_centavos:
            acum += flujo / potencia
            potencia *= factor
        return acum - monto

    low = 0.0
    high = 1.0
    while vpn(high) > 0.0 and high < 128.0:
        high *= 2.0

    # Bisección robusta (siempre converge en un intervalo monótono decreciente)
    for _ in range(max_iter):
        mid = 0.5 * (low + high)
        val = vpn(mid)
        if abs(val) < 1e-9 or (high - low) < 1e-12:
            low = high = mid
            break
        if val > 0.0:
            low = mid
        else:
            high = mid

    r_mensual = 0.5 * (low + high)
    cft_tna = Decimal(str(round(r_mensual * 12.0, 6)))
    tea_val = ((1.0 + r_mensual) ** 12.0) - 1.0
    cft_tea = Decimal(str(round(tea_val, 6)))
    return cft_tna, cft_tea
