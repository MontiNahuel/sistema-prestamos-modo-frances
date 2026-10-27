"""Contrato de lectura local; no ejecuta SP ni asigna IDs de CoopYa."""
from decimal import Decimal


def pesos(centavos):
    return format(Decimal(centavos) / 100, '.2f')


def exportar_obligaciones(prestamo):
    """El cronograma es fuente de deuda, independiente de sus presentaciones."""
    return {
        'version': 'frances-coopya-propuesta-1',
        'estado_integracion': 'PENDIENTE_HOMOLOGACION',
        'sistema_origen': 'SISTEMA_FRANCES',
        'prestamo_id': prestamo.id,
        'socio_id_local': prestamo.persona_id,  # INTEGER, no UUID.
        'id_persona_coopya': None,  # Requiere equivalencia verificada, no inferencia.
        'plan_id_coopya': None,
        'unidad': 'PESOS',
        'saldo_capital': pesos(prestamo.saldo_deudor_actual_centavos),
        'obligaciones': [
            {
                'cuota_id': c.id,
                'numero_cuota': c.numero_cuota,
                'vencimiento': c.fecha_vencimiento.isoformat() if c.fecha_vencimiento else None,
                'concepto_propuesto': 'PRESTAMO_CUOTA',
                'capital': pesos(c.capital_centavos),
                'interes': pesos(c.interes_centavos),
                'iva': pesos(c.iva_interes_centavos),
                'importe_total': pesos(c.cuota_total_centavos),
                'importe_pagado': pesos(c.monto_pagado_centavos),
                'saldo_total': pesos(c.cuota_total_centavos - c.monto_pagado_centavos),
                'estado': c.estado,
                'movimiento_coopya_id': c.movimiento_coopya_id,
                'desglose_coopya_id': c.desglose_coopya_id,
            }
            for c in sorted(prestamo.cuotas, key=lambda c: c.numero_cuota)
        ],
    }


def filas_tvp(banco, registros):
    """Traducción exacta de campos; solo evidencia, nunca ejecutar el lote aquí."""
    if banco == 'BAPRO':
        return [dict(Orden=i, ReferenciaDebito=r['referencia'],
                     IdentificadorCliente=r['identificador_cliente'],
                     CodigoRespuesta=r['codigo'], EsReversion=r['tipo'] != '72')
                for i, r in enumerate(registros, 1)]
    if banco in ('BNA', 'NACION'):
        return [dict(Det_SucursalCuentaCliente=r['sucursal'],
                     Det_SistemaCuenta=r['sistema'], Det_NroCuentaCliente=r['numero_cuenta'],
                     Det_Importe=r['importe_bancario'], CodigoRespuesta=r['codigo'])
                for r in registros]
    raise ValueError('Banco no admitido')
