from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


def round_cents(val: Decimal) -> int:
    """Redondea a entero de centavos exacto usando ROUND_HALF_UP."""
    return int(val.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class CuotaItem(BaseModel):
    numero_cuota: int
    fecha_vencimiento: Optional[date] = None
    saldo_inicial_centavos: int
    capital_centavos: int
    interes_centavos: int
    iva_interes_centavos: int
    cuota_pura_centavos: int
    cuota_total_centavos: int
    saldo_final_centavos: int


class PlanAmortizacion(BaseModel):
    monto_solicitado_centavos: int
    plazo_meses: int
    tna: Decimal
    tem: Decimal
    alicuota_iva: Decimal
    cuota_pura_teorica_centavos: int
    total_capital_centavos: int
    total_interes_centavos: int
    total_iva_centavos: int
    total_a_pagar_centavos: int
    cronograma: List[CuotaItem]


class CalculadoraFrances:
    """
    Motor financiero Sistema Francés con importes monetarios como enteros en centavos.
    Tasas en formato decimal (ej: TNA = 0.60 para 60%, IVA = 0.21 para 21%).
    """

    @staticmethod
    def calcular_simulacion(
        monto_centavos: int,
        plazo_meses: int,
        tna: Decimal,
        alicuota_iva: Decimal = Decimal("0.21"),
        fecha_primer_vencimiento: Optional[date] = None
    ) -> PlanAmortizacion:
        if monto_centavos <= 0:
            raise ValueError("El monto del préstamo en centavos debe ser mayor a cero.")
        if plazo_meses <= 0:
            raise ValueError("El plazo en meses debe ser mayor a cero.")
        if tna < Decimal("0"):
            raise ValueError("La TNA no puede ser negativa.")

        tem = tna / Decimal("12")
        monto_dec = Decimal(monto_centavos)

        if tem == Decimal("0"):
            cuota_pura_teorica_centavos = round_cents(monto_dec / Decimal(plazo_meses))
        else:
            factor = (Decimal("1") + tem) ** plazo_meses
            cuota_pura_teorica_centavos = round_cents(monto_dec * (tem * factor) / (factor - Decimal("1")))

        cronograma: List[CuotaItem] = []
        saldo_actual_centavos = monto_centavos
        total_capital_centavos = 0
        total_interes_centavos = 0
        total_iva_centavos = 0

        for k in range(1, plazo_meses + 1):
            saldo_inicial = saldo_actual_centavos
            interes_cents = round_cents(Decimal(saldo_inicial) * tem)
            iva_cents = round_cents(Decimal(interes_cents) * alicuota_iva)

            if k == plazo_meses:
                # Regla de oro de la última cuota: absorbe centavos residuales
                capital_cents = saldo_inicial
                saldo_final = 0
                cuota_pura = capital_cents + interes_cents
            else:
                capital_cents = cuota_pura_teorica_centavos - interes_cents
                if capital_cents > saldo_inicial:
                    capital_cents = saldo_inicial
                saldo_final = saldo_inicial - capital_cents
                cuota_pura = cuota_pura_teorica_centavos

            cuota_total = capital_cents + interes_cents + iva_cents

            total_capital_centavos += capital_cents
            total_interes_centavos += interes_cents
            total_iva_centavos += iva_cents
            saldo_actual_centavos = saldo_final

            fecha_venc: Optional[date] = None
            if fecha_primer_vencimiento:
                anio = fecha_primer_vencimiento.year + (fecha_primer_vencimiento.month + (k - 1) - 1) // 12
                mes = (fecha_primer_vencimiento.month + (k - 1) - 1) % 12 + 1
                dia = min(fecha_primer_vencimiento.day, 28)
                fecha_venc = date(anio, mes, dia)

            cronograma.append(
                CuotaItem(
                    numero_cuota=k,
                    fecha_vencimiento=fecha_venc,
                    saldo_inicial_centavos=saldo_inicial,
                    capital_centavos=capital_cents,
                    interes_centavos=interes_cents,
                    iva_interes_centavos=iva_cents,
                    cuota_pura_centavos=cuota_pura,
                    cuota_total_centavos=cuota_total,
                    saldo_final_centavos=saldo_final
                )
            )

        total_a_pagar_centavos = total_capital_centavos + total_interes_centavos + total_iva_centavos

        return PlanAmortizacion(
            monto_solicitado_centavos=monto_centavos,
            plazo_meses=plazo_meses,
            tna=tna,
            tem=tem,
            alicuota_iva=alicuota_iva,
            cuota_pura_teorica_centavos=cuota_pura_teorica_centavos,
            total_capital_centavos=total_capital_centavos,
            total_interes_centavos=total_interes_centavos,
            total_iva_centavos=total_iva_centavos,
            total_a_pagar_centavos=total_a_pagar_centavos,
            cronograma=cronograma
        )
