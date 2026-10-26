from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.features.socios.model import Socio
from app.features.prestamos.model import Prestamo, Cuota


def construir_cuenta_corriente_local(
    socio: Socio,
    prestamos: List[Prestamo]
) -> Dict[str, Any]:
    """
    Construye el payload de Cuenta Corriente espejo del Monolito CoopYa
    a partir de los préstamos franceses y cuotas locales del socio.
    """
    totales_obligaciones = 0.0
    totales_cobrado = 0.0
    totales_saldo = 0.0
    cuotas_totales_count = 0
    cuotas_cobradas_count = 0
    cuotas_pendientes_count = 0
    alguna_con_mora = False
    proxima_obligacion_mensual = 0.0

    conceptos = []
    periodos_dict: Dict[str, Dict[str, Any]] = {}
    movimientos = []
    desglose = []
    advertencias = []
    hoy = date.today()

    for p in prestamos:
        total_p = p.total_a_pagar_centavos / 100.0
        saldo_p = p.saldo_deudor_actual_centavos / 100.0
        cobrado_p = (p.total_a_pagar_centavos - p.saldo_deudor_actual_centavos) / 100.0

        totales_obligaciones += total_p
        totales_saldo += saldo_p
        totales_cobrado += cobrado_p

        # Concepto del préstamo
        nombre_linea = p.linea_snapshot.linea_nombre if p.linea_snapshot else "Préstamo Sistema Francés"
        cuotas_cubiertas = sum(1 for c in p.cuotas if c.estado == "PAGADA")
        cuotas_vencidas = sum(
            1 for c in p.cuotas 
            if c.estado != "PAGADA" and c.fecha_vencimiento and c.fecha_vencimiento < hoy
        )

        # Próxima cuota pendiente
        prox_cuota = next((c for c in p.cuotas if c.estado != "PAGADA"), None)
        valor_mensual = (prox_cuota.cuota_total_centavos / 100.0) if prox_cuota else (
            (p.cuotas[0].cuota_total_centavos / 100.0) if p.cuotas else 0.0
        )
        if prox_cuota and proxima_obligacion_mensual == 0.0:
            proxima_obligacion_mensual = valor_mensual

        conceptos.append({
            "concepto": "PRESTAMO_FRANCES",
            "etiqueta": f"Préstamo #{p.id[:8]}",
            "planId": p.linea_snapshot.linea_id if p.linea_snapshot else 1,
            "planNombre": f"{nombre_linea} ({p.plazo_meses} meses)",
            "valorMensual": valor_mensual,
            "fechaInicio": p.fecha_alta.isoformat() if p.fecha_alta else None,
            "cuotasDelPlan": p.plazo_meses,
            "cuotasCubiertas": cuotas_cubiertas,
            "cuotasVencidas": cuotas_vencidas,
            "proximoPeriodo": prox_cuota.fecha_vencimiento.isoformat() if prox_cuota and prox_cuota.fecha_vencimiento else None,
            "importeProximaCuota": valor_mensual if prox_cuota else 0.0,
            "deudaDelConcepto": saldo_p,
            "coberturaDelConcepto": cobrado_p
        })

        for c in p.cuotas:
            cuotas_totales_count += 1
            cuota_monto = c.cuota_total_centavos / 100.0
            monto_pagado = c.monto_pagado_centavos / 100.0
            es_pagada = (c.estado == "PAGADA")
            esta_vencida = (not es_pagada and c.fecha_vencimiento and c.fecha_vencimiento < hoy)

            if es_pagada:
                cuotas_cobradas_count += 1
            else:
                cuotas_pendientes_count += 1
                if esta_vencida:
                    alguna_con_mora = True

            # Clave de periodo mensual: YYYY-MM-01
            venc_str = c.fecha_vencimiento.strftime("%Y-%m-01T00:00:00") if c.fecha_vencimiento else "SIN_FECHA"
            if venc_str not in periodos_dict:
                periodos_dict[venc_str] = {
                    "mes": venc_str,
                    "esperado": 0.0,
                    "cubierto": 0.0,
                    "movimientos": 0,
                    "cobrados": 0,
                    "rechazados": 0,
                    "pendientes": 0,
                    "esParcial": False
                }
            periodos_dict[venc_str]["esperado"] += cuota_monto
            periodos_dict[venc_str]["cubierto"] += monto_pagado
            if es_pagada:
                periodos_dict[venc_str]["cobrados"] += 1
                periodos_dict[venc_str]["movimientos"] += 1
            else:
                periodos_dict[venc_str]["pendientes"] += 1

            # Desglose cuota por cuota
            desglose.append({
                "numeroCuota": c.numero_cuota,
                "cantidadCuotas": p.plazo_meses,
                "periodoObligacion": c.fecha_vencimiento.isoformat() if c.fecha_vencimiento else None,
                "concepto": "PRESTAMO_FRANCES",
                "planNombre": nombre_linea,
                "importePresentado": cuota_monto,
                "importeCobrado": monto_pagado if es_pagada else 0.0,
                "importeRechazado": 0.0,
                "importePendiente": 0.0 if es_pagada else cuota_monto,
                "estado": "COBRADO" if es_pagada else ("EN_MORA" if esta_vencida else "PENDIENTE"),
                "origen": "SISTEMA_FRANCES"
            })

            # Movimientos registrados
            if c.fecha_pago and monto_pagado > 0:
                movimientos.append({
                    "id": c.id,
                    "fechaImpacto": c.fecha_pago.isoformat(),
                    "origen": "MICROSERVICIO",
                    "archivo": "-",
                    "concepto": f"Cuota {c.numero_cuota}/{p.plazo_meses} Préstamo",
                    "montoPesos": monto_pagado,
                    "estado": "COBRADO",
                    "explicacion": "Pago de cuota francesa registrado",
                    "esManual": False
                })

    if alguna_con_mora:
        advertencias.append("El socio registra cuotas de préstamo vencidas en mora.")

    return {
        "persona": {
            "id": socio.id,
            "nroSocio": socio.id,
            "nombre": socio.nombre_completo.split(",")[1].strip() if "," in socio.nombre_completo else socio.nombre_completo,
            "apellido": socio.nombre_completo.split(",")[0].strip() if "," in socio.nombre_completo else "",
            "numeroDoc": socio.documento or "",
            "cuil": "",
            "estado": 1
        },
        "totales": {
            "saldo": round(totales_saldo, 2),
            "obligacionMensual": round(proxima_obligacion_mensual, 2),
            "totalObligaciones": round(totales_obligaciones, 2),
            "importeCobrado": round(totales_cobrado, 2),
            "importeRechazado": 0.0,
            "importePendiente": round(totales_saldo, 2),
            "movimientos": len(movimientos),
            "cobrados": cuotas_cobradas_count,
            "rechazados": 0,
            "pendientes": cuotas_pendientes_count,
            "manuales": 0,
            "algunaConMora": alguna_con_mora
        },
        "conceptos": conceptos,
        "periodos": sorted(list(periodos_dict.values()), key=lambda x: x["mes"]),
        "movimientos": movimientos,
        "desglose": desglose,
        "advertencias": advertencias
    }


def fusionar_cuenta_corriente(
    coopya_cc: Dict[str, Any],
    local_cc: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Fusiona la cuenta corriente central de CoopYa con los préstamos franceses locales.
    """
    if not coopya_cc or not coopya_cc.get("totales"):
        return local_cc

    tot_coop = coopya_cc.get("totales", {})
    tot_loc = local_cc.get("totales", {})

    merged_totales = {
        "saldo": round(float(tot_coop.get("saldo", 0)) + float(tot_loc.get("saldo", 0)), 2),
        "obligacionMensual": round(float(tot_coop.get("obligacionMensual", 0)) + float(tot_loc.get("obligacionMensual", 0)), 2),
        "totalObligaciones": round(float(tot_coop.get("totalObligaciones", 0)) + float(tot_loc.get("totalObligaciones", 0)), 2),
        "importeCobrado": round(float(tot_coop.get("importeCobrado", 0)) + float(tot_loc.get("importeCobrado", 0)), 2),
        "importeRechazado": round(float(tot_coop.get("importeRechazado", 0)) + float(tot_loc.get("importeRechazado", 0)), 2),
        "importePendiente": round(float(tot_coop.get("importePendiente", 0)) + float(tot_loc.get("importePendiente", 0)), 2),
        "movimientos": int(tot_coop.get("movimientos", 0)) + int(tot_loc.get("movimientos", 0)),
        "cobrados": int(tot_coop.get("cobrados", 0)) + int(tot_loc.get("cobrados", 0)),
        "rechazados": int(tot_coop.get("rechazados", 0)) + int(tot_loc.get("rechazados", 0)),
        "pendientes": int(tot_coop.get("pendientes", 0)) + int(tot_loc.get("pendientes", 0)),
        "manuales": int(tot_coop.get("manuales", 0)) + int(tot_loc.get("manuales", 0)),
        "algunaConMora": bool(tot_coop.get("algunaConMora", False) or tot_loc.get("algunaConMora", False))
    }

    merged_conceptos = list(coopya_cc.get("conceptos", [])) + list(local_cc.get("conceptos", []))
    merged_desglose = list(coopya_cc.get("desglose", [])) + list(local_cc.get("desglose", []))
    merged_movimientos = list(coopya_cc.get("movimientos", [])) + list(local_cc.get("movimientos", []))
    merged_advertencias = list(coopya_cc.get("advertencias", [])) + list(local_cc.get("advertencias", []))

    # Fusionar periodos por fecha
    periodos_map = {p["mes"]: dict(p) for p in coopya_cc.get("periodos", []) if "mes" in p}
    for loc_p in local_cc.get("periodos", []):
        m = loc_p["mes"]
        if m in periodos_map:
            periodos_map[m]["esperado"] = round(float(periodos_map[m].get("esperado", 0)) + float(loc_p.get("esperado", 0)), 2)
            periodos_map[m]["cubierto"] = round(float(periodos_map[m].get("cubierto", 0)) + float(loc_p.get("cubierto", 0)), 2)
            periodos_map[m]["movimientos"] = int(periodos_map[m].get("movimientos", 0)) + int(loc_p.get("movimientos", 0))
            periodos_map[m]["cobrados"] = int(periodos_map[m].get("cobrados", 0)) + int(loc_p.get("cobrados", 0))
            periodos_map[m]["pendientes"] = int(periodos_map[m].get("pendientes", 0)) + int(loc_p.get("pendientes", 0))
        else:
            periodos_map[m] = dict(loc_p)

    return {
        "persona": coopya_cc.get("persona") or local_cc.get("persona"),
        "totales": merged_totales,
        "conceptos": merged_conceptos,
        "periodos": sorted(list(periodos_map.values()), key=lambda x: str(x.get("mes", ""))),
        "movimientos": merged_movimientos,
        "desglose": merged_desglose,
        "advertencias": merged_advertencias
    }
