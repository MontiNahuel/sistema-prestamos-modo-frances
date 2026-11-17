"""Imputación acumulativa en centavos. Las partes se prorratean y cierran exactas."""


def desglose_cobrado_completo(cuota, pagado=None):
    """Retorna (capital, interes, iva, costo_operativo) prorrateado de forma monótona y exacta."""
    pagado = min(cuota.cuota_total_centavos, max(0, cuota.monto_pagado_centavos if pagado is None else pagado))
    total = cuota.cuota_total_centavos
    if total <= 0:
        return (0, 0, 0, 0)
    capital = pagado * cuota.capital_centavos // total
    resto_post_capital = pagado - capital
    costo_op_teorico = max(0, getattr(cuota, "costo_operativo_centavos", 0) or 0)
    cargos = cuota.interes_centavos + cuota.iva_interes_centavos + costo_op_teorico
    interes = resto_post_capital * cuota.interes_centavos // cargos if cargos else 0
    resto_post_interes = resto_post_capital - interes
    if costo_op_teorico == 0:
        return capital, interes, resto_post_interes, 0
    cargos_iva_costo = cuota.iva_interes_centavos + costo_op_teorico
    iva = resto_post_interes * cuota.iva_interes_centavos // cargos_iva_costo if cargos_iva_costo else 0
    costo_operativo = resto_post_interes - iva
    return capital, interes, iva, costo_operativo


def desglose_cobrado(cuota, pagado=None):
    """Compatibilidad: retorna (capital, interes, iva) cobrados."""
    capital, interes, iva, _ = desglose_cobrado_completo(cuota, pagado)
    return capital, interes, iva


def recalcular_saldo(prestamo):
    prestamo.saldo_deudor_actual_centavos = sum(
        max(0, c.capital_centavos - desglose_cobrado(c)[0]) for c in prestamo.cuotas
    )
    if all(c.estado == 'PAGADA' for c in prestamo.cuotas):
        prestamo.estado = 'FINALIZADO'
