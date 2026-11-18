from datetime import date
from typing import Dict, Any, List, Optional, Set
from app.features.socios.model import Socio
from app.features.prestamos.model import Prestamo


def es_desglose_frances(
    item: Dict[str, Any],
    desglose_ids_locales: Optional[Set[int]] = None,
    mov_ids_locales: Optional[Set[int]] = None,
) -> bool:
    """Detecta si una fila de desglose pertenece a un préstamo francés (local o espejo en CoopYa)."""
    origen = str(item.get("origen") or "").upper()
    concepto = str(item.get("concepto") or "").upper()
    if origen == "SISTEMA_FRANCES" or concepto == "PRESTAMO_FRANCES":
        return True
    if desglose_ids_locales and item.get("id") in desglose_ids_locales:
        return True
    if mov_ids_locales and item.get("idMovimiento") in mov_ids_locales:
        return True
    banco = str(item.get("banco") or "").upper()
    motivo = str(item.get("motivo") or "").lower()
    return (banco == "MANUAL" or origen == "MANUAL") and (
        "sistema francés" in motivo or "sistema frances" in motivo
    )


def es_movimiento_espejo_frances(
    item: Dict[str, Any],
    mov_ids_locales: Optional[Set[int]] = None,
) -> bool:
    """Detecta si un movimiento de CoopYa es un espejo insertado desde el Sistema Francés."""
    if mov_ids_locales and item.get("id") in mov_ids_locales:
        return True
    banco = str(item.get("banco") or item.get("origen") or "").upper()
    motivo = str(item.get("motivo") or item.get("explicacion") or "").lower()
    return banco == "MANUAL" and (
        "préstamo francés" in motivo or "prestamo frances" in motivo
    )


def normalizar_cuenta_corriente_central(
    coopya_cc: Dict[str, Any],
    default_cuota_social_centavos: int = 550000,
) -> Dict[str, Any]:
    """Separa desglose central y deja explícito desglosePrestamos vacío cuando no hay créditos locales."""
    desglose_central = [
        d for d in coopya_cc.get("desglose", []) if not es_desglose_frances(d)
    ]
    movs_central = [
        m for m in coopya_cc.get("movimientos", []) if not es_movimiento_espejo_frances(m)
    ]
    return {
        **coopya_cc,
        "movimientos": movs_central,
        "desglose": desglose_central,
        "desgloseCentral": desglose_central,
        "desglosePrestamos": [],
        "desgloseCuotasSociales": [],
        "cuotaSocial": {
            "activa": False,
            "valorCentavos": default_cuota_social_centavos,
            "fechaAlta": None,
            "fechaBaja": None,
        },
    }


def _estado_desglose_cuota(cuota: Any, cuota_monto: float, monto_pagado: float, hoy: date) -> str:
    if cuota.estado == "CANCELADA":
        return "CANCELADA"
    if cuota.estado == "PAGADA":
        return "COBRADO"
    if monto_pagado > 0:
        return "PARCIAL"
    if cuota.estado == "RECHAZADA":
        return "RECHAZADA"
    if cuota.fecha_vencimiento and cuota.fecha_vencimiento < hoy and cuota_monto > 0:
        return "EN_MORA"
    return "PENDIENTE"


def _registrar_periodo(periodos_dict: Dict[str, Dict[str, Any]], cuota: Any, cuota_monto: float, monto_pagado: float, eventos: List[Any]) -> None:
    venc_str = cuota.fecha_vencimiento.strftime("%Y-%m-01T00:00:00") if cuota.fecha_vencimiento else "SIN_FECHA"
    if venc_str not in periodos_dict:
        periodos_dict[venc_str] = {
            "mes": venc_str, "esperado": 0.0, "cubierto": 0.0,
            "movimientos": 0, "cobrados": 0, "rechazados": 0, "pendientes": 0, "esParcial": False
        }
    p = periodos_dict[venc_str]
    p["esperado"] += cuota_monto
    p["cubierto"] += monto_pagado
    p["rechazados"] += sum(not e.cobrado_centavos for e in eventos)
    p["movimientos"] += len(eventos) + int(
        bool(cuota.fecha_pago) and cuota.monto_pagado_centavos > sum(e.cobrado_centavos for e in eventos)
    )
    if 0 < monto_pagado < cuota_monto:
        p["esParcial"] = True
    if cuota.estado == "PAGADA":
        p["cobrados"] += 1
    elif cuota.estado != "CANCELADA":
        p["pendientes"] += 1


def construir_cuenta_corriente_local(
    socio: Socio,
    prestamos: List[Prestamo],
    default_cuota_social_centavos: int = 550000,
) -> Dict[str, Any]:
    """
    Construye el payload de Cuenta Corriente a partir de los préstamos franceses
    y cuotas locales del socio.
    """
    totales_obligaciones = totales_cobrado = totales_saldo = total_rechazado = proxima_obligacion_mensual = 0.0
    cuotas_cobradas_count = cuotas_pendientes_count = cantidad_rechazados = 0
    alguna_con_mora = False
    conceptos: List[Dict[str, Any]] = []
    periodos_dict: Dict[str, Dict[str, Any]] = {}
    movimientos: List[Dict[str, Any]] = []
    desglose: List[Dict[str, Any]] = []
    hoy = date.today()

    for p in prestamos:
        cuotas_ord = sorted(p.cuotas, key=lambda x: x.numero_cuota)
        total_p = sum(c.monto_pagado_centavos if c.estado == "CANCELADA" else c.cuota_total_centavos for c in cuotas_ord) / 100.0
        cobrado_p = sum(c.monto_pagado_centavos for c in cuotas_ord) / 100.0
        saldo_p = total_p - cobrado_p
        totales_obligaciones += total_p
        totales_saldo += saldo_p
        totales_cobrado += cobrado_p

        nombre_linea = p.linea_snapshot.linea_nombre if p.linea_snapshot else "Préstamo Sistema Francés"
        num_prestamo = getattr(p, "numero_prestamo", None)
        cuotas_cubiertas = sum(1 for c in cuotas_ord if c.estado == "PAGADA")
        cuotas_vencidas = sum(
            1 for c in cuotas_ord
            if c.estado not in ("PAGADA", "CANCELADA") and c.fecha_vencimiento and c.fecha_vencimiento < hoy
        )
        prox_cuota = next((c for c in cuotas_ord if c.estado not in ("PAGADA", "CANCELADA")), None)
        valor_mensual = ((prox_cuota.cuota_total_centavos - prox_cuota.monto_pagado_centavos) / 100.0) if prox_cuota else (
            (cuotas_ord[0].cuota_total_centavos / 100.0) if cuotas_ord else 0.0
        )
        if prox_cuota and proxima_obligacion_mensual == 0.0:
            proxima_obligacion_mensual = valor_mensual

        conceptos.append({
            "concepto": "PRESTAMO_FRANCES",
            "etiqueta": f"Préstamo N° {num_prestamo}" if num_prestamo else f"Préstamo #{p.id[:8]}",
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
            "coberturaDelConcepto": cobrado_p,
        })

        for c in cuotas_ord:
            cancelada = c.estado == "CANCELADA"
            monto_pagado = c.monto_pagado_centavos / 100.0
            cuota_monto = monto_pagado if cancelada else c.cuota_total_centavos / 100.0
            eventos = getattr(c, "respuestas_bancarias", [])
            rechazado = sum(e.importe_centavos for e in eventos if not e.cobrado_centavos) / 100.0
            total_rechazado += rechazado
            cantidad_rechazados += sum(not e.cobrado_centavos for e in eventos)

            if c.estado == "PAGADA":
                cuotas_cobradas_count += 1
            elif not cancelada:
                cuotas_pendientes_count += 1
                if c.fecha_vencimiento and c.fecha_vencimiento < hoy:
                    alguna_con_mora = True

            _registrar_periodo(periodos_dict, c, cuota_monto, monto_pagado, eventos)
            desglose.append({
                "prestamoId": p.id,
                "numeroPrestamo": num_prestamo,
                "numeroCuota": c.numero_cuota,
                "cantidadCuotas": p.plazo_meses,
                "periodoObligacion": c.fecha_vencimiento.isoformat() if c.fecha_vencimiento else None,
                "concepto": "PRESTAMO_FRANCES",
                "planNombre": nombre_linea,
                "capitalPesos": round(c.capital_centavos / 100.0, 2),
                "interesPesos": round(c.interes_centavos / 100.0, 2),
                "ivaPesos": round(c.iva_interes_centavos / 100.0, 2),
                "costoOperativoPesos": round((getattr(c, "costo_operativo_centavos", 0) or 0) / 100.0, 2),
                "importePresentado": cuota_monto,
                "importeCobrado": monto_pagado,
                "importeRechazado": rechazado,
                "importePendiente": max(0.0, cuota_monto - monto_pagado),
                "estado": _estado_desglose_cuota(c, cuota_monto, monto_pagado, hoy),
                "origen": "SISTEMA_FRANCES",
                "movimientoCoopyaId": c.movimiento_coopya_id,
                "desgloseCoopyaId": c.desglose_coopya_id,
            })

            cobro_bancario = sum(e.cobrado_centavos for e in eventos) / 100.0
            for e in eventos:
                movimientos.append({
                    "id": e.id, "fechaImpacto": e.carga.fecha_cobro.isoformat(),
                    "origen": e.banco, "archivo": e.carga.nombre_archivo,
                    "concepto": f"Cuota {c.numero_cuota}/{p.plazo_meses} · Préstamo {p.id[:8]}",
                    "montoPesos": e.importe_centavos / 100.0,
                    "estado": "COBRADO" if e.cobrado_centavos else "RECHAZADO",
                    "explicacion": f"{e.codigo}: {e.descripcion}", "esManual": False,
                })
            if c.fecha_pago and monto_pagado > cobro_bancario:
                movimientos.append({
                    "id": c.id, "fechaImpacto": c.fecha_pago.isoformat(),
                    "origen": "MICROSERVICIO", "archivo": "-",
                    "concepto": f"Cuota {c.numero_cuota}/{p.plazo_meses} Préstamo",
                    "montoPesos": monto_pagado - cobro_bancario,
                    "estado": "COBRADO", "explicacion": "Pago de cuota francesa registrado", "esManual": False,
                })

    desglose_cs: List[Dict[str, Any]] = []
    cuotas_soc_activas = sorted(
        [cs for cs in getattr(socio, "cuotas_sociales", []) if cs.estado != "ANULADA"],
        key=lambda x: x.periodo,
    )
    if cuotas_soc_activas:
        cs_total = sum(cs.valor_centavos for cs in cuotas_soc_activas) / 100.0
        cs_cobrado = sum(cs.monto_pagado_centavos for cs in cuotas_soc_activas) / 100.0
        cs_saldo = max(0.0, cs_total - cs_cobrado)
        totales_obligaciones += cs_total
        totales_cobrado += cs_cobrado
        totales_saldo += cs_saldo
        prox_cs = next((cs for cs in cuotas_soc_activas if cs.estado != "PAGADA"), None)
        valor_cs = ((getattr(socio, "cuota_social_valor_centavos", default_cuota_social_centavos) or default_cuota_social_centavos) / 100.0)
        conceptos.append({
            "concepto": "CUOTA_SOCIAL",
            "etiqueta": "Cuota Social",
            "planId": 0,
            "planNombre": "Cuota Social Cooperativa",
            "valorMensual": valor_cs,
            "fechaInicio": socio.cuota_social_fecha_alta.isoformat() if getattr(socio, "cuota_social_fecha_alta", None) else None,
            "cuotasDelPlan": len(cuotas_soc_activas),
            "cuotasCubiertas": sum(1 for cs in cuotas_soc_activas if cs.estado == "PAGADA"),
            "cuotasVencidas": sum(
                1 for cs in cuotas_soc_activas
                if cs.estado != "PAGADA" and cs.fecha_vencimiento and cs.fecha_vencimiento < hoy
            ),
            "proximoPeriodo": prox_cs.fecha_vencimiento.isoformat() if prox_cs and prox_cs.fecha_vencimiento else None,
            "importeProximaCuota": ((prox_cs.valor_centavos - prox_cs.monto_pagado_centavos) / 100.0) if prox_cs else 0.0,
            "deudaDelConcepto": cs_saldo,
            "coberturaDelConcepto": cs_cobrado,
        })
        for cs in cuotas_soc_activas:
            cs_monto = cs.valor_centavos / 100.0
            cs_pagado = cs.monto_pagado_centavos / 100.0
            eventos = getattr(cs, "respuestas_bancarias", [])
            cs_rechazado = sum(e.importe_centavos for e in eventos if not e.cobrado_centavos) / 100.0
            total_rechazado += cs_rechazado
            cantidad_rechazados += sum(not e.cobrado_centavos for e in eventos)
            if cs.estado == "PAGADA":
                cuotas_cobradas_count += 1
            else:
                cuotas_pendientes_count += 1
                if cs.fecha_vencimiento and cs.fecha_vencimiento < hoy:
                    alguna_con_mora = True
            _registrar_periodo(periodos_dict, cs, cs_monto, cs_pagado, eventos)
            desglose_cs.append({
                "cuotaSocialId": cs.id,
                "prestamoId": cs.prestamo_id,
                "periodo": cs.periodo,
                "periodoObligacion": cs.fecha_vencimiento.isoformat() if cs.fecha_vencimiento else None,
                "concepto": "CUOTA_SOCIAL",
                "planNombre": "Cuota Social Cooperativa",
                "importePresentado": cs_monto,
                "importeCobrado": cs_pagado,
                "importeRechazado": cs_rechazado,
                "importePendiente": max(0.0, cs_monto - cs_pagado),
                "estado": _estado_desglose_cuota(cs, cs_monto, cs_pagado, hoy),
                "origen": "SISTEMA_FRANCES",
            })
            for e in eventos:
                movimientos.append({
                    "id": e.id, "fechaImpacto": e.carga.fecha_cobro.isoformat(),
                    "origen": e.banco, "archivo": e.carga.nombre_archivo,
                    "concepto": f"Cuota Social {cs.periodo}",
                    "montoPesos": e.importe_centavos / 100.0,
                    "estado": "COBRADO" if e.cobrado_centavos else "RECHAZADO",
                    "explicacion": f"{e.codigo}: {e.descripcion}", "esManual": False,
                })

    partes_nombre = socio.nombre_completo.split(",")
    return {
        "persona": {
            "id": socio.id, "nroSocio": socio.id,
            "nombre": partes_nombre[1].strip() if len(partes_nombre) > 1 else socio.nombre_completo,
            "apellido": partes_nombre[0].strip() if len(partes_nombre) > 1 else "",
            "numeroDoc": socio.documento or "", "cuil": "", "estado": 1,
        },
        "totales": {
            "saldo": round(totales_saldo, 2),
            "obligacionMensual": round(proxima_obligacion_mensual, 2),
            "totalObligaciones": round(totales_obligaciones, 2),
            "importeCobrado": round(totales_cobrado, 2),
            "importeRechazado": round(total_rechazado, 2),
            "importePendiente": round(totales_saldo, 2),
            "movimientos": len(movimientos),
            "cobrados": cuotas_cobradas_count,
            "rechazados": cantidad_rechazados,
            "pendientes": cuotas_pendientes_count,
            "manuales": 0,
            "algunaConMora": alguna_con_mora,
        },
        "conceptos": conceptos,
        "periodos": sorted(list(periodos_dict.values()), key=lambda x: x["mes"]),
        "movimientos": movimientos,
        "desglose": desglose,
        "desglosePrestamos": desglose,
        "desgloseCentral": [],
        "desgloseCuotasSociales": desglose_cs,
        "cuotaSocial": {
            "activa": bool(getattr(socio, "cuota_social_activa", False)),
            "valorCentavos": int(getattr(socio, "cuota_social_valor_centavos", default_cuota_social_centavos) or default_cuota_social_centavos),
            "fechaAlta": socio.cuota_social_fecha_alta.isoformat() if getattr(socio, "cuota_social_fecha_alta", None) else None,
            "fechaBaja": socio.cuota_social_fecha_baja.isoformat() if getattr(socio, "cuota_social_fecha_baja", None) else None,
        },
        "advertencias": ["El socio registra cuotas de préstamo vencidas en mora."] if alguna_con_mora else [],
    }


def _combinar_totales(tot_coop: Dict[str, Any], tot_loc: Dict[str, Any], espejo_movs: List[Dict[str, Any]]) -> Dict[str, Any]:
    esp_cob = sum(1 for m in espejo_movs if str(m.get("estado") or "").upper() == "COBRADO" and not m.get("esManual"))
    esp_rec = sum(1 for m in espejo_movs if str(m.get("estado") or "").upper() == "RECHAZADO")
    esp_pen = sum(1 for m in espejo_movs if str(m.get("estado") or "").upper() == "PENDIENTE")
    imp_cob = sum(float(m.get("montoPesos") or 0) for m in espejo_movs if str(m.get("estado") or "").upper() == "COBRADO" and not m.get("esManual"))
    imp_rec = sum(float(m.get("montoPesos") or 0) for m in espejo_movs if str(m.get("estado") or "").upper() == "RECHAZADO")
    imp_pen = sum(float(m.get("montoPesos") or 0) for m in espejo_movs if str(m.get("estado") or "").upper() == "PENDIENTE")
    return {
        "saldo": round(float(tot_coop.get("saldo", 0)) + float(tot_loc.get("saldo", 0)), 2),
        "obligacionMensual": round(float(tot_coop.get("obligacionMensual", 0)) + float(tot_loc.get("obligacionMensual", 0)), 2),
        "totalObligaciones": round(float(tot_coop.get("totalObligaciones", 0)) + float(tot_loc.get("totalObligaciones", 0)), 2),
        "importeCobrado": round(max(0.0, float(tot_coop.get("importeCobrado", 0)) - imp_cob) + float(tot_loc.get("importeCobrado", 0)), 2),
        "importeRechazado": round(max(0.0, float(tot_coop.get("importeRechazado", 0)) - imp_rec) + float(tot_loc.get("importeRechazado", 0)), 2),
        "importePendiente": round(max(0.0, float(tot_coop.get("importePendiente", 0)) - imp_pen) + float(tot_loc.get("importePendiente", 0)), 2),
        "movimientos": max(0, int(tot_coop.get("movimientos", 0)) - len(espejo_movs)) + int(tot_loc.get("movimientos", 0)),
        "cobrados": max(0, int(tot_coop.get("cobrados", 0)) - esp_cob) + int(tot_loc.get("cobrados", 0)),
        "rechazados": max(0, int(tot_coop.get("rechazados", 0)) - esp_rec) + int(tot_loc.get("rechazados", 0)),
        "pendientes": max(0, int(tot_coop.get("pendientes", 0)) - esp_pen) + int(tot_loc.get("pendientes", 0)),
        "manuales": int(tot_coop.get("manuales", 0)) + int(tot_loc.get("manuales", 0)),
        "algunaConMora": bool(tot_coop.get("algunaConMora", False) or tot_loc.get("algunaConMora", False)),
    }


def fusionar_cuenta_corriente(
    coopya_cc: Dict[str, Any],
    local_cc: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Fusiona la cuenta corriente central de CoopYa con los préstamos franceses locales,
    separando el desglose central del desglose de préstamos y evitando duplicar espejos.
    """
    if not coopya_cc or not coopya_cc.get("totales"):
        return local_cc

    desglose_prestamos = list(local_cc.get("desglose", []))
    desglose_ids = {d["desgloseCoopyaId"] for d in desglose_prestamos if d.get("desgloseCoopyaId")}
    mov_ids = {d["movimientoCoopyaId"] for d in desglose_prestamos if d.get("movimientoCoopyaId")}

    desglose_central = [
        d for d in coopya_cc.get("desglose", [])
        if not es_desglose_frances(d, desglose_ids, mov_ids)
    ]
    coopya_movs = coopya_cc.get("movimientos", [])
    espejo_movs = [m for m in coopya_movs if es_movimiento_espejo_frances(m, mov_ids)]
    central_movs = [m for m in coopya_movs if not es_movimiento_espejo_frances(m, mov_ids)]

    periodos_map = {p["mes"]: dict(p) for p in coopya_cc.get("periodos", []) if "mes" in p}
    for loc_p in local_cc.get("periodos", []):
        m = loc_p["mes"]
        if m in periodos_map:
            periodos_map[m]["esperado"] = round(float(periodos_map[m].get("esperado", 0)) + float(loc_p.get("esperado", 0)), 2)
            periodos_map[m]["cubierto"] = round(float(periodos_map[m].get("cubierto", 0)) + float(loc_p.get("cubierto", 0)), 2)
            periodos_map[m]["movimientos"] = int(periodos_map[m].get("movimientos", 0)) + int(loc_p.get("movimientos", 0))
            periodos_map[m]["cobrados"] = int(periodos_map[m].get("cobrados", 0)) + int(loc_p.get("cobrados", 0))
            periodos_map[m]["pendientes"] = int(periodos_map[m].get("pendientes", 0)) + int(loc_p.get("pendientes", 0))
            periodos_map[m]["rechazados"] = int(periodos_map[m].get("rechazados", 0)) + int(loc_p.get("rechazados", 0))
            periodos_map[m]["esParcial"] = bool(periodos_map[m].get("esParcial") or loc_p.get("esParcial"))
        else:
            periodos_map[m] = dict(loc_p)

    return {
        "persona": coopya_cc.get("persona") or local_cc.get("persona"),
        "totales": _combinar_totales(coopya_cc.get("totales", {}), local_cc.get("totales", {}), espejo_movs),
        "conceptos": list(coopya_cc.get("conceptos", [])) + list(local_cc.get("conceptos", [])),
        "periodos": sorted(list(periodos_map.values()), key=lambda x: str(x.get("mes", ""))),
        "movimientos": central_movs + list(local_cc.get("movimientos", [])),
        "desglose": desglose_prestamos + desglose_central,
        "desglosePrestamos": desglose_prestamos,
        "desgloseCentral": desglose_central,
        "desgloseCuotasSociales": list(local_cc.get("desgloseCuotasSociales", [])),
        "cuotaSocial": local_cc.get("cuotaSocial"),
        "advertencias": list(coopya_cc.get("advertencias", [])) + list(local_cc.get("advertencias", [])),
    }
