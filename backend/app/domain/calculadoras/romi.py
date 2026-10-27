"""Equivalente a PAGO/PAGOPRIN/PAGOINT de la hoja 'Con Funcion'.

Los valores exactos están en pesos. Nunca se realimentan con los centavos
proyectados para la cuenta corriente. Decimal evita propagar errores binarios;
la equivalencia con Excel se verifica a centavos y con tolerancia subcentavo.
"""
from decimal import Decimal, localcontext

from pydantic import BaseModel


class CuotaRomiExacta(BaseModel):
    saldo_inicial_pesos: Decimal
    capital_pesos: Decimal
    interes_pesos: Decimal
    iva_interes_pesos: Decimal
    cuota_pura_pesos: Decimal
    cuota_total_pesos: Decimal
    saldo_final_pesos: Decimal
    # Diferencias entre el asiento monetario y el redondeo aislado de cada celda.
    ajuste_capital_centavos: int = 0
    ajuste_interes_centavos: int = 0
    ajuste_cuota_centavos: int = 0


class TotalesRomiExactos(BaseModel):
    total_capital_pesos: Decimal
    total_interes_pesos: Decimal
    total_iva_pesos: Decimal
    total_a_pagar_pesos: Decimal


def calcular_romi(
    monto_centavos: int, plazo_meses: int, tasa_mensual: Decimal, iva: Decimal
) -> tuple[list[CuotaRomiExacta], TotalesRomiExactos]:
    """Cuota total plana con IVA y precisión conservada durante todo el plan.

    La tasa recibida no incluye IVA. Equivale a las columnas C, E, F y G del
    Excel. La columna D es interés + IVA, no el interés neto de IVA.
    """
    with localcontext() as contexto:
        contexto.prec = 50
        monto = Decimal(monto_centavos) / 100
        tasa_gravada = tasa_mensual * (1 + iva)
        if tasa_gravada:
            factor = (1 + tasa_gravada) ** plazo_meses
            cuota = monto * tasa_gravada * factor / (factor - 1)
        else:
            cuota = monto / plazo_meses

        saldo = monto
        cronograma = []
        for numero in range(1, plazo_meses + 1):
            # PAGOPRIN = PAGO / (1 + tasa) ** períodos restantes.
            # Esta forma evita restar números casi iguales con tasas altas.
            capital = cuota / (1 + tasa_gravada) ** (plazo_meses - numero + 1)
            interes_gravado = cuota - capital
            interes = interes_gravado / (1 + iva)
            impuesto = interes * iva
            saldo_final = saldo - capital
            if numero == plazo_meses:
                # Solo se elimina el residuo de precisión Decimal (< 1e-40 pesos).
                saldo_final = Decimal(0)
            cronograma.append(CuotaRomiExacta(
                saldo_inicial_pesos=saldo,
                capital_pesos=capital,
                interes_pesos=interes,
                iva_interes_pesos=impuesto,
                cuota_pura_pesos=capital + interes,
                cuota_total_pesos=cuota,
                saldo_final_pesos=saldo_final,
            ))
            saldo = saldo_final

        totales = TotalesRomiExactos(
            total_capital_pesos=monto,
            total_interes_pesos=sum(c.interes_pesos for c in cronograma),
            total_iva_pesos=sum(c.iva_interes_pesos for c in cronograma),
            total_a_pagar_pesos=cuota * plazo_meses,
        )
        return cronograma, totales
