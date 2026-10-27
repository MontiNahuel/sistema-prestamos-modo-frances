"""Imputación acumulativa en centavos. Las partes se prorratean y cierran exactas."""
def desglose_cobrado(cuota, pagado=None):
    pagado = min(cuota.cuota_total_centavos, max(0, cuota.monto_pagado_centavos if pagado is None else pagado))
    total = cuota.cuota_total_centavos
    if total <= 0:
        return (0, 0, 0)
    capital = pagado * cuota.capital_centavos // total
    cargos = cuota.interes_centavos + cuota.iva_interes_centavos
    interes = (pagado - capital) * cuota.interes_centavos // cargos if cargos else 0
    return capital, interes, pagado - capital - interes


def recalcular_saldo(prestamo):
    prestamo.saldo_deudor_actual_centavos = sum(
        max(0, c.capital_centavos - desglose_cobrado(c)[0]) for c in prestamo.cuotas
    )
    if all(c.estado == 'PAGADA' for c in prestamo.cuotas):
        prestamo.estado = 'FINALIZADO'
