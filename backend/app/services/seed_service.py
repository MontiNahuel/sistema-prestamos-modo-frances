from decimal import Decimal
from sqlalchemy.orm import Session
from app.features.motores.model import MotorCalculo
from app.features.lineas.model import LineaPrestamo
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual, RedondeoCuota


def seed_motores_y_lineas(db: Session):
    """Crea los motores y líneas iniciales del sistema si no existen."""
    motores_data = [
        {
            "codigo": "TASA_ROMI_COMERCIAL_365",
            "nombre": "Romi Tasa Comercial con IVA (Base 365/30)",
            "descripcion": "Calcula cuota plana Romi recibiendo la TNA comercial con IVA (ej: 414,59%). Desgrava internamente a TEM neta.",
            "convencion_tasa": ConvencionTasa.TASA_ROMI_COMERCIAL_365.value,
            "base_dias": BaseDias.COMERCIAL_30_360.value,
            "modalidad_iva": ModalidadIva.CUOTA_TOTAL_PLANA.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "redondeo_cuota": RedondeoCuota.PESOS_ENTEROS.value,
            "es_sistema": True,
            "activo": True,
        },
        {
            "codigo": "TASA_ESTILO_ROMI",
            "nombre": "tasa estilo-romi",
            "descripcion": "PAGO/PAGOPRIN/PAGOINT con acarreo de decimales como Excel. TNA/12, cuota total plana e IVA incluido; conciliación de centavos separada.",
            "convencion_tasa": ConvencionTasa.TASA_ESTILO_ROMI.value,
            "base_dias": BaseDias.COMERCIAL_30_360.value,
            "modalidad_iva": ModalidadIva.CUOTA_TOTAL_PLANA.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "es_sistema": True,
            "activo": True,
        },
        {
            "codigo": "FRANCES_CLASICO",
            "nombre": "Francés Tradicional (TNA Proporcional 30/360)",
            "descripcion": "Cuota pura fija, IVA sobre interés decreciente mes a mes. Estándar bancario habitual.",
            "convencion_tasa": ConvencionTasa.TNA_PROPORCIONAL.value,
            "base_dias": BaseDias.COMERCIAL_30_360.value,
            "modalidad_iva": ModalidadIva.IVA_DECRECIENTE.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "es_sistema": True,
            "activo": True
        },
        {
            "codigo": "FRANCES_CUOTA_PLANA",
            "nombre": "Francés Cuota Total Plana (IVA Incluido)",
            "descripcion": "La cuota total de bolsillo a pagar por el cliente es 100% fija. El IVA se prorratea internamente.",
            "convencion_tasa": ConvencionTasa.TNA_PROPORCIONAL.value,
            "base_dias": BaseDias.COMERCIAL_30_360.value,
            "modalidad_iva": ModalidadIva.CUOTA_TOTAL_PLANA.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "es_sistema": True,
            "activo": True
        },
        {
            "codigo": "FRANCES_TEA",
            "nombre": "Francés con TEA Compuesta Equivalente",
            "descripcion": "Cálculo de tasa mensual con fórmula exponencial (1 + TEA)^(1/12) - 1.",
            "convencion_tasa": ConvencionTasa.TEA_COMPUESTA.value,
            "base_dias": BaseDias.COMERCIAL_30_360.value,
            "modalidad_iva": ModalidadIva.IVA_DECRECIENTE.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "es_sistema": True,
            "activo": True
        },
        {
            "codigo": "FRANCES_DIAS_REALES",
            "nombre": "Francés Días Reales (Actual/365)",
            "descripcion": "Cálculo de intereses computando los días exactos de calendario entre vencimientos.",
            "convencion_tasa": ConvencionTasa.TNA_DIAS_REALES.value,
            "base_dias": BaseDias.ACTUAL_365.value,
            "modalidad_iva": ModalidadIva.IVA_DECRECIENTE.value,
            "ajuste_residual": AjusteResidual.ULTIMA_CUOTA.value,
            "es_sistema": True,
            "activo": True
        }
    ]

    motores_creados = {}
    for m in motores_data:
        existente = db.query(MotorCalculo).filter_by(codigo=m["codigo"]).first()
        if not existente:
            nuevo = MotorCalculo(**m)
            db.add(nuevo)
            db.flush()
            motores_creados[m["codigo"]] = nuevo
        else:
            if hasattr(existente, "redondeo_cuota") and "redondeo_cuota" in m:
                existente.redondeo_cuota = m["redondeo_cuota"]
            motores_creados[m["codigo"]] = existente

    db.commit()

    # Sembrar líneas de préstamo si no existen
    lineas_data = [
        {
            "codigo": "ROMI_COMERCIAL_414",
            "nombre": "Crédito Comercial Romi (414,59% con IVA)",
            "descripcion": "Línea con cuota total plana e ingreso de tasa anual comercial con IVA de la planilla central.",
            "motor_id": motores_creados["TASA_ROMI_COMERCIAL_365"].id,
            "tasa_default": Decimal("4.1459"),
            "alicuota_iva": Decimal("0.2100"),
            "permite_override_tasa": True,
            "monto_minimo_centavos": 1000000,
            "monto_maximo_centavos": 50000000,
            "monto_paso_centavos": 100000,
            "plazo_minimo_meses": 1,
            "plazo_maximo_meses": 24,
            "requiere_socio_al_dia": True,
            "gasto_otorgamiento_pct": Decimal("0.0000"),
            "seguro_vida_mensual_pct": Decimal("0.0000"),
            "activo": True
        },
        {
            "codigo": "PERS_TRADICIONAL",
            "nombre": "Préstamo Personal Tradicional",
            "descripcion": "Línea general en cuotas decrecientes con TNA fija.",
            "motor_id": motores_creados["FRANCES_CLASICO"].id,
            "tasa_default": Decimal("0.6000"), # 60%
            "alicuota_iva": Decimal("0.2100"), # 21%
            "permite_override_tasa": True,
            "monto_minimo_centavos": 1000000,    # $10.000,00
            "monto_maximo_centavos": 200000000,  # $2.000.000,00
            "monto_paso_centavos": 100000,       # $1.000,00
            "plazo_minimo_meses": 3,
            "plazo_maximo_meses": 36,
            "requiere_socio_al_dia": True,
            "gasto_otorgamiento_pct": Decimal("0.0000"),
            "seguro_vida_mensual_pct": Decimal("0.0000"),
            "activo": True
        },
        {
            "codigo": "CUOTA_PLANA",
            "nombre": "Préstamo Comercial Cuota Fija",
            "descripcion": "El socio paga siempre el mismo valor final todos los meses con IVA incluido.",
            "motor_id": motores_creados["FRANCES_CUOTA_PLANA"].id,
            "tasa_default": Decimal("0.7000"), # 70%
            "alicuota_iva": Decimal("0.2100"),
            "permite_override_tasa": True,
            "monto_minimo_centavos": 500000,     # $5.000,00
            "monto_maximo_centavos": 100000000,  # $1.000.000,00
            "monto_paso_centavos": 50000,        # $500,00
            "plazo_minimo_meses": 2,
            "plazo_maximo_meses": 12,
            "requiere_socio_al_dia": True,
            "gasto_otorgamiento_pct": Decimal("0.0000"),
            "seguro_vida_mensual_pct": Decimal("0.0000"),
            "activo": True
        }
    ]

    for l in lineas_data:
        existente = db.query(LineaPrestamo).filter_by(codigo=l["codigo"]).first()
        if not existente:
            nuevo = LineaPrestamo(**l)
            db.add(nuevo)

    db.commit()
