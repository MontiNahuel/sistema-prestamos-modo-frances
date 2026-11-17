from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, computed_field
from app.domain.enums import (
    ConvencionTasa,
    BaseDias,
    ModalidadIva,
    AjusteResidual,
    RedondeoCuota,
    TipoCostoOperativo,
)
from app.domain.calculadoras.cft import calcular_cft_flujos
from app.domain.calculadoras.tasas import calcular_tasa_periodica, calcular_tasas_resumen
from app.domain.calculadoras.romi import CuotaRomiExacta, TotalesRomiExactos, calcular_romi


def round_cents(val: Decimal) -> int:
    """Redondea a entero de centavos exacto usando ROUND_HALF_UP."""
    return int(val.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class CuotaItem(BaseModel):
    numero_cuota: int
    fecha_vencimiento: Optional[date] = None
    dias_periodo: int = 30
    saldo_inicial_centavos: int
    capital_centavos: int
    interes_centavos: int
    iva_interes_centavos: int
    costo_operativo_centavos: int = 0
    cuota_pura_centavos: int
    cuota_total_centavos: int
    saldo_final_centavos: int
    calculo_exacto: Optional[CuotaRomiExacta] = None


class PlanAmortizacion(BaseModel):
    monto_solicitado_centavos: int
    plazo_meses: int
    tasa_anual: Decimal
    convencion_tasa: ConvencionTasa
    base_dias: BaseDias
    modalidad_iva: ModalidadIva
    alicuota_iva: Decimal
    redondeo_cuota: RedondeoCuota = RedondeoCuota.CON_CENTAVOS
    costo_operativo_tipo: TipoCostoOperativo = TipoCostoOperativo.FIJO
    costo_operativo_centavos: int = 0
    costo_operativo_porcentaje: Decimal = Decimal("0")
    cuota_pura_teorica_centavos: int
    total_capital_centavos: int
    total_interes_centavos: int
    total_iva_centavos: int
    total_costo_operativo_centavos: int = 0
    total_a_pagar_centavos: int
    cft_tna: Decimal = Decimal("0")
    cft_tea: Decimal = Decimal("0")
    cronograma: List[CuotaItem]
    calculo_exacto: Optional[TotalesRomiExactos] = None

    @computed_field
    @property
    def tna(self) -> Decimal:
        return calcular_tasas_resumen(self.tasa_anual, self.convencion_tasa, self.base_dias, self.alicuota_iva)[0]

    @computed_field
    @property
    def tem(self) -> Decimal:
        return calcular_tasas_resumen(self.tasa_anual, self.convencion_tasa, self.base_dias, self.alicuota_iva)[1]

    @computed_field
    @property
    def tea(self) -> Decimal:
        return calcular_tasas_resumen(self.tasa_anual, self.convencion_tasa, self.base_dias, self.alicuota_iva)[2]


class MotorConfig(BaseModel):
    convencion_tasa: ConvencionTasa = ConvencionTasa.TNA_PROPORCIONAL
    base_dias: BaseDias = BaseDias.COMERCIAL_30_360
    modalidad_iva: ModalidadIva = ModalidadIva.IVA_DECRECIENTE
    ajuste_residual: AjusteResidual = AjusteResidual.ULTIMA_CUOTA
    redondeo_cuota: RedondeoCuota = RedondeoCuota.CON_CENTAVOS


class CalculadoraFrances:
    """
    Motor financiero modular para el Sistema de Amortización Francés.
    Soporta múltiples convenciones de tasas, bases de días, modalidades de IVA
    y absorción del centavo residual. Todos los importes en centavos enteros.
    """

    @staticmethod
    def calcular(
        monto_centavos: int,
        plazo_meses: int,
        tasa_anual: Decimal,
        alicuota_iva: Decimal = Decimal("0.21"),
        config: Optional[MotorConfig] = None,
        fecha_primer_vencimiento: Optional[date] = None,
        fecha_otorgamiento: Optional[date] = None,
        costo_operativo_tipo: TipoCostoOperativo = TipoCostoOperativo.FIJO,
        costo_operativo_centavos: int = 0,
        costo_operativo_porcentaje: Decimal = Decimal("0"),
    ) -> PlanAmortizacion:
        if monto_centavos <= 0:
            raise ValueError("El monto del préstamo en centavos debe ser mayor a cero.")
        if plazo_meses <= 0:
            raise ValueError("El plazo en meses debe ser mayor a cero.")
        if tasa_anual < Decimal("0"):
            raise ValueError("La tasa anual no puede ser negativa.")
        if alicuota_iva < Decimal("0"):
            raise ValueError("La alícuota de IVA no puede ser negativa.")
        if costo_operativo_centavos < 0 or costo_operativo_porcentaje < Decimal("0"):
            raise ValueError("El costo operativo no puede ser negativo.")

        if costo_operativo_tipo == TipoCostoOperativo.PORCENTAJE:
            costo_op_cuota_cents = round_cents(Decimal(monto_centavos) * costo_operativo_porcentaje)
        else:
            costo_op_cuota_cents = int(costo_operativo_centavos)

        cfg = config or MotorConfig()
        es_romi = cfg.convencion_tasa in (
            ConvencionTasa.TASA_ESTILO_ROMI,
            ConvencionTasa.TASA_ROMI_COMERCIAL_365,
        )
        if es_romi:
            # Romi define una cuota final plana por períodos mensuales, como Excel.
            cfg = cfg.model_copy(update={
                "base_dias": BaseDias.COMERCIAL_30_360,
                "modalidad_iva": (ModalidadIva.EXENTO if cfg.modalidad_iva == ModalidadIva.EXENTO
                                  else ModalidadIva.CUOTA_TOTAL_PLANA),
            })

        if cfg.modalidad_iva == ModalidadIva.EXENTO:
            alicuota_iva_efectiva = Decimal("0.00")
        else:
            alicuota_iva_efectiva = alicuota_iva

        monto_dec = Decimal(monto_centavos)

        # 1. Tasa periódica base
        tasa_mensual_base = calcular_tasa_periodica(
            tasa_anual=tasa_anual,
            convencion=cfg.convencion_tasa,
            dias_periodo=30,
            base_dias=cfg.base_dias,
            alicuota_iva=alicuota_iva_efectiva,
        )

        es_pesos_enteros = cfg.redondeo_cuota == RedondeoCuota.PESOS_ENTEROS
        cuotas_exactas = None
        totales_exactos = None
        if es_romi:
            cuotas_exactas, totales_exactos = calcular_romi(
                monto_centavos, plazo_meses, tasa_mensual_base, alicuota_iva_efectiva,
                redondear_pesos_enteros=es_pesos_enteros,
            )

        # 2. Cálculo de cuota teórica según modalidad de IVA
        if tasa_mensual_base == Decimal("0"):
            cuota_pura_teorica_centavos = round_cents(monto_dec / Decimal(plazo_meses))
            cuota_plana_con_iva_centavos = cuota_pura_teorica_centavos
        else:
            # Cuota pura teórica clásica
            factor = (Decimal("1") + tasa_mensual_base) ** plazo_meses
            cuota_pura_teorica_centavos = round_cents(monto_dec * (tasa_mensual_base * factor) / (factor - Decimal("1")))

            # Si la modalidad es Cuota Total Plana con IVA, calculamos con tasa gravada
            if cfg.modalidad_iva == ModalidadIva.CUOTA_TOTAL_PLANA:
                tasa_gravada = tasa_mensual_base * (Decimal("1") + alicuota_iva_efectiva)
                factor_iva = (Decimal("1") + tasa_gravada) ** plazo_meses
                cuota_plana_con_iva_centavos = round_cents(monto_dec * (tasa_gravada * factor_iva) / (factor_iva - Decimal("1")))
            else:
                cuota_plana_con_iva_centavos = cuota_pura_teorica_centavos

        if es_pesos_enteros:
            cuota_pura_teorica_centavos = round_cents(Decimal(cuota_pura_teorica_centavos) / Decimal("100")) * 100
            cuota_plana_con_iva_centavos = round_cents(Decimal(cuota_plana_con_iva_centavos) / Decimal("100")) * 100

        cronograma: List[CuotaItem] = []
        saldo_actual_centavos = monto_centavos
        total_capital_centavos = 0
        total_interes_centavos = 0
        total_iva_centavos = 0
        total_costo_operativo_centavos = 0

        # Control de fechas
        fecha_ant = fecha_otorgamiento or date.today()

        for k in range(1, plazo_meses + 1):
            saldo_inicial = saldo_actual_centavos

            # Calcular fecha de vencimiento y días transcurridos
            fecha_venc: Optional[date] = None
            dias_periodo = 30
            if fecha_primer_vencimiento:
                anio = fecha_primer_vencimiento.year + (fecha_primer_vencimiento.month + (k - 1) - 1) // 12
                mes = (fecha_primer_vencimiento.month + (k - 1) - 1) % 12 + 1
                dia = min(fecha_primer_vencimiento.day, 28)
                fecha_venc = date(anio, mes, dia)

                if cfg.base_dias in (BaseDias.ACTUAL_365, BaseDias.ACTUAL_360):
                    dias_periodo = (fecha_venc - fecha_ant).days
                    fecha_ant = fecha_venc

            # Determinar tasa periódica para este período específico
            tasa_periodo = calcular_tasa_periodica(
                tasa_anual=tasa_anual,
                convencion=cfg.convencion_tasa,
                dias_periodo=dias_periodo,
                base_dias=cfg.base_dias
            )

            interes_cents = round_cents(Decimal(saldo_inicial) * tasa_periodo)
            iva_cents = round_cents(Decimal(interes_cents) * alicuota_iva_efectiva)

            es_ultima = (k == plazo_meses)
            es_primera = (k == 1)

            # Cálculo de Capital y Cuotas
            exacta = cuotas_exactas[k - 1] if cuotas_exactas is not None else None
            if exacta is not None:
                capital_excel = round_cents(exacta.capital_pesos * 100)
                capital_cents = (saldo_inicial if es_ultima
                                 else min(capital_excel, saldo_inicial))
                interes_excel = round_cents(exacta.interes_pesos * 100)
                interes_cents = interes_excel
                iva_cents = round_cents(exacta.iva_interes_pesos * 100)
                cuota_excel = round_cents(exacta.cuota_total_pesos * 100)
                ajuste = cuota_excel - capital_cents - interes_cents - iva_cents
                # La proyección en centavos concilia el asiento sin alterar el IVA
                # ni realimentar el cronograma exacto. Nunca crea interés a tasa cero.
                if tasa_mensual_base and interes_cents + ajuste >= 0:
                    interes_cents += ajuste
                cuota_pura = capital_cents + interes_cents
                cuota_total = cuota_pura + iva_cents
                saldo_final = saldo_inicial - capital_cents
                exacta = exacta.model_copy(update={
                    "ajuste_capital_centavos": capital_cents - capital_excel,
                    "ajuste_interes_centavos": interes_cents - interes_excel,
                    "ajuste_cuota_centavos": cuota_total - cuota_excel,
                })
            elif es_ultima and cfg.ajuste_residual == AjusteResidual.ULTIMA_CUOTA:
                capital_cents = saldo_inicial
                saldo_final = 0
                cuota_pura = capital_cents + interes_cents
                cuota_total = capital_cents + interes_cents + iva_cents
            else:
                if cfg.modalidad_iva == ModalidadIva.CUOTA_TOTAL_PLANA:
                    # En cuota plana: Capital = CuotaTotalFija - (Interés + IVA)
                    capital_cents = cuota_plana_con_iva_centavos - (interes_cents + iva_cents)
                    if capital_cents > saldo_inicial:
                        capital_cents = saldo_inicial
                    saldo_final = saldo_inicial - capital_cents
                    cuota_pura = capital_cents + interes_cents
                    cuota_total = cuota_plana_con_iva_centavos
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
            total_costo_operativo_centavos += costo_op_cuota_cents
            cuota_total_con_costo = cuota_total + costo_op_cuota_cents
            saldo_actual_centavos = saldo_final

            cronograma.append(
                CuotaItem(
                    numero_cuota=k,
                    fecha_vencimiento=fecha_venc,
                    dias_periodo=dias_periodo,
                    saldo_inicial_centavos=saldo_inicial,
                    capital_centavos=capital_cents,
                    interes_centavos=interes_cents,
                    iva_interes_centavos=iva_cents,
                    costo_operativo_centavos=costo_op_cuota_cents,
                    cuota_pura_centavos=cuota_pura,
                    cuota_total_centavos=cuota_total_con_costo,
                    saldo_final_centavos=saldo_final,
                    calculo_exacto=exacta,
                )
            )

        total_a_pagar_centavos = (
            total_capital_centavos
            + total_interes_centavos
            + total_iva_centavos
            + total_costo_operativo_centavos
        )
        cft_tna, cft_tea = calcular_cft_flujos(
            monto_centavos,
            [item.cuota_total_centavos for item in cronograma],
        )

        return PlanAmortizacion(
            monto_solicitado_centavos=monto_centavos,
            plazo_meses=plazo_meses,
            tasa_anual=tasa_anual,
            convencion_tasa=cfg.convencion_tasa,
            base_dias=cfg.base_dias,
            modalidad_iva=cfg.modalidad_iva,
            alicuota_iva=alicuota_iva_efectiva,
            redondeo_cuota=cfg.redondeo_cuota,
            costo_operativo_tipo=costo_operativo_tipo,
            costo_operativo_centavos=costo_operativo_centavos,
            costo_operativo_porcentaje=costo_operativo_porcentaje,
            cuota_pura_teorica_centavos=cuota_pura_teorica_centavos,
            total_capital_centavos=total_capital_centavos,
            total_interes_centavos=total_interes_centavos,
            total_iva_centavos=total_iva_centavos,
            total_costo_operativo_centavos=total_costo_operativo_centavos,
            total_a_pagar_centavos=total_a_pagar_centavos,
            cft_tna=cft_tna,
            cft_tea=cft_tea,
            cronograma=cronograma,
            calculo_exacto=totales_exactos,
        )

    @classmethod
    def calcular_simulacion(
        cls,
        monto_centavos: int,
        plazo_meses: int,
        tna: Decimal,
        alicuota_iva: Decimal = Decimal("0.21"),
        fecha_primer_vencimiento: Optional[date] = None
    ) -> PlanAmortizacion:
        """Método de conveniencia retrocompatible con el simulador clásico."""
        return cls.calcular(
            monto_centavos=monto_centavos,
            plazo_meses=plazo_meses,
            tasa_anual=tna,
            alicuota_iva=alicuota_iva,
            config=MotorConfig(
                convencion_tasa=ConvencionTasa.TNA_PROPORCIONAL,
                base_dias=BaseDias.COMERCIAL_30_360,
                modalidad_iva=ModalidadIva.IVA_DECRECIENTE,
                ajuste_residual=AjusteResidual.ULTIMA_CUOTA
            ),
            fecha_primer_vencimiento=fecha_primer_vencimiento
        )
