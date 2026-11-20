"""Servicio de consulta parametrizada contra la base de datos historica Oracle."""

from typing import Optional

from fastapi import HTTPException, status

from app.features.reportes_extra.schemas import (
    CatalinasCobroItem,
    ReporteExtraCatalinasRequest,
    ReporteExtraCatalinasResponse,
    ReporteExtraCatalinasResumen,
)
from app.integrations.oracle_client import oracle_client

SQL_CATALINAS_COBROS = """
WITH
  params AS (
    SELECT
      CAST(:periodo_desde AS VARCHAR2(6))  AS periodo_desde,
      CAST(:periodo_hasta AS VARCHAR2(6))  AS periodo_hasta,
      CAST(:dnis AS VARCHAR2(4000))        AS dnis,
      TO_NUMBER(:tolerancia_pct)           AS tolerancia_pct,
      CAST(:ver_sin_lote AS VARCHAR2(1))   AS ver_sin_lote
    FROM DUAL
  ),
  meses_rango AS (
    SELECT
      TO_CHAR(ADD_MONTHS(TO_DATE(par.periodo_desde, 'YYYYMM'), LEVEL - 1), 'YYYYMM') AS periodo_haber
    FROM params par
    CONNECT BY ADD_MONTHS(TO_DATE(par.periodo_desde, 'YYYYMM'), LEVEL - 1)
            <= TO_DATE(NVL(par.periodo_hasta, par.periodo_desde), 'YYYYMM')
  ),
  meses_sin_lote AS (
    SELECT /*+ MATERIALIZE */ mr.periodo_haber
    FROM meses_rango mr
    CROSS JOIN params par
    WHERE UPPER(TRIM(par.ver_sin_lote)) = 'S'
      AND NOT EXISTS (
        SELECT 1
        FROM prestaprod.cobro c
        WHERE c.idcanal = 12
          AND c.idtipocobro = 1
          AND c.periodo_haber = mr.periodo_haber
      )
  ),
  cbu_dni AS (
    SELECT /*+ MATERIALIZE */
      TRIM(p.idnumerodescuento) AS cbu,
      MAX(TRIM(per.documento_nro)) AS dni_cbu
    FROM prestaprod.prestamo p
    JOIN prestaprod.persona per ON per.idpersona = p.idpersona
    WHERE p.idprestador = 68 AND p.idcanal = 12 AND p.idnumerodescuento IS NOT NULL
    GROUP BY TRIM(p.idnumerodescuento)
    HAVING COUNT(DISTINCT TRIM(per.documento_nro)) = 1
  ),
  prestamos_68 AS (
    SELECT /*+ MATERIALIZE */
      TRIM(per.documento_nro) AS dni,
      UPPER(TRIM(per.apellido || ' ' || per.nombre)) AS nombre_persona,
      p.idprestamo,
      p.idestadoprestamo,
      ep.descripcion AS estado_prestamo,
      ROUND(p.importecuota, 2) AS importecuota
    FROM prestaprod.prestamo p
    JOIN prestaprod.persona per ON per.idpersona = p.idpersona
    LEFT JOIN prestaprod.estadoprestamo ep ON ep.idestadoprestamo = p.idestadoprestamo
    WHERE p.idprestador = 68 AND p.idcanal = 12
  ),
  movs AS (
    SELECT
      COALESCE(
        TRIM(per.documento_nro),
        cb.dni_cbu,
        CASE WHEN REGEXP_LIKE(TRIM(cd.numerodescuento), '^[0-9]{7,8}$') THEN TRIM(cd.numerodescuento) END
      ) AS dni_res,
      c.idcobro,
      c.fecharecepcion,
      c.periodo_haber,
      cd.idprestador,
      cd.idprestamo,
      cd.idestadocobro,
      ROUND(cd.importe, 2) AS importe,
      ce.idcodigoerrorcobro,
      cec.descripcion AS desc_error
    FROM prestaprod.cobro c
    JOIN prestaprod.cobrodetalle cd ON cd.idcobro = c.idcobro
    CROSS JOIN params par
    LEFT JOIN prestaprod.prestamo p ON p.idprestamo = cd.idprestamo AND p.idprestador = cd.idprestador
    LEFT JOIN prestaprod.persona per ON per.idpersona = NVL(NULLIF(p.idpersona, -1), NULLIF(cd.idpersona, -1))
    LEFT JOIN cbu_dni cb ON cb.cbu = TRIM(cd.numerodescuento)
    LEFT JOIN prestaprod.cobroerr ce ON ce.idcobro = cd.idcobro AND ce.idcobroreg = cd.idcobroreg
    LEFT JOIN prestaprod.codigoerrorcobro cec ON cec.idcodigoerrorcobro = ce.idcodigoerrorcobro
    WHERE c.idcanal = 12
      AND c.idtipocobro = 1
      AND cd.importe > 0
      AND c.periodo_haber BETWEEN par.periodo_desde AND NVL(par.periodo_hasta, par.periodo_desde)
  ),
  cuotas_68_pend AS (
    SELECT /*+ MATERIALIZE */
      pc.periodohaber AS periodo_haber,
      p68.dni,
      p68.nombre_persona,
      p68.idprestamo,
      p68.estado_prestamo,
      pc.idcuota,
      ROUND(pc.saldocuota, 2) AS saldocuota
    FROM prestamos_68 p68
    JOIN prestaprod.prestamocuotas pc
      ON pc.idprestador = 68
     AND pc.idprestamo = p68.idprestamo
     AND pc.saldocuota > 0
    CROSS JOIN params par
    WHERE p68.idestadoprestamo <> 16
      AND pc.periodohaber BETWEEN par.periodo_desde AND NVL(par.periodo_hasta, par.periodo_desde)
      AND (par.dnis IS NULL OR INSTR(',' || REPLACE(par.dnis, ' ', '') || ',', ',' || p68.dni || ',') > 0)
  )
SELECT
  periodo_haber,
  dni,
  nombre_persona,
  estado,
  importe_cobro,
  idcobro,
  fecha_cobro,
  idprestamo
FROM (
  SELECT
    m.periodo_haber,
    m.dni_res AS dni,
    MAX(p68.nombre_persona) AS nombre_persona,
    CASE
      WHEN m.idprestador = 68 AND m.idestadocobro = 2 THEN 'YA SE COBRO'
      WHEN m.idprestador = 68 AND m.idestadocobro = 3 THEN 'TODAVIA NO SE COBRO (Error 68: ' || NVL(m.desc_error, 'Cod ' || m.idcodigoerrorcobro) || ')'
      WHEN m.idestadocobro = 1 THEN 'TODAVIA NO SE COBRO (SIN APLICAR)'
      ELSE 'TODAVIA NO SE COBRO (Error -1: posible Catalinas -> Préstamo ' ||
           MIN(p68.idprestamo || ' $' || TO_CHAR(p68.importecuota, 'FM9999990.00') || ' ' || p68.estado_prestamo)
             KEEP (DENSE_RANK FIRST ORDER BY ABS(p68.importecuota - m.importe)) || ')'
    END AS estado,
    m.importe AS importe_cobro,
    m.idcobro,
    TO_CHAR(m.fecharecepcion, 'YYYY-MM-DD') AS fecha_cobro,
    m.idprestamo,
    CASE WHEN m.idprestador = 68 AND m.idestadocobro = 2 THEN 3 ELSE 1 END AS ord_grp
  FROM movs m
  CROSS JOIN params par
  LEFT JOIN prestamos_68 p68
         ON p68.dni = m.dni_res
        AND (
              m.idprestador = 68
           OR ABS(p68.importecuota - m.importe) <= GREATEST(p68.importecuota * par.tolerancia_pct, 100)
        )
  WHERE (par.dnis IS NULL OR INSTR(',' || REPLACE(par.dnis, ' ', '') || ',', ',' || m.dni_res || ',') > 0)
    AND (m.idprestador = 68 OR p68.idprestamo IS NOT NULL)
  GROUP BY
    m.periodo_haber, m.dni_res, m.idcobro, m.fecharecepcion, m.idprestador, m.idprestamo,
    m.idestadocobro, m.importe, m.idcodigoerrorcobro, m.desc_error

  UNION ALL

  SELECT
    msl.periodo_haber,
    NVL(csl.dni, '-') AS dni,
    NVL(csl.nombre_persona, 'Sin cuotas con saldo pendiente en el período de haber') AS nombre_persona,
    CASE
      WHEN csl.idprestamo IS NOT NULL
        THEN 'SIN LOTE CARGADO (Cuota ' || csl.idcuota || ' - ' || csl.estado_prestamo || ')'
      ELSE 'SIN LOTE CARGADO'
    END AS estado,
    NVL(csl.saldocuota, 0) AS importe_cobro,
    CAST(NULL AS NUMBER) AS idcobro,
    NULL AS fecha_cobro,
    csl.idprestamo,
    2 AS ord_grp
  FROM meses_sin_lote msl
  LEFT JOIN cuotas_68_pend csl ON csl.periodo_haber = msl.periodo_haber
)
ORDER BY
  periodo_haber DESC,
  ord_grp,
  dni,
  importe_cobro
""".strip()


def _a_entero_opcional(valor: object) -> Optional[int]:
    if valor is None:
        return None
    return int(float(str(valor)))


def _a_texto_opcional(valor: object) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto if texto else None


def _construir_resumen(filas: list[CatalinasCobroItem]) -> ReporteExtraCatalinasResumen:
    cobrados = 0
    no_cobrados = 0
    sin_lote = 0
    importe_total = 0.0
    importe_cobrados = 0.0
    importe_no_cobrados = 0.0
    importe_sin_lote = 0.0

    for fila in filas:
        importe = fila.importe_cobro
        importe_total += importe
        if fila.estado.startswith("YA SE COBRO"):
            cobrados += 1
            importe_cobrados += importe
        elif fila.estado.startswith("SIN LOTE CARGADO"):
            sin_lote += 1
            importe_sin_lote += importe
        else:
            no_cobrados += 1
            importe_no_cobrados += importe

    return ReporteExtraCatalinasResumen(
        total_filas=len(filas),
        cobrados=cobrados,
        no_cobrados=no_cobrados,
        sin_lote=sin_lote,
        importe_total=round(importe_total, 2),
        importe_cobrados=round(importe_cobrados, 2),
        importe_no_cobrados=round(importe_no_cobrados, 2),
        importe_sin_lote=round(importe_sin_lote, 2),
    )


class ReportesExtraService:
    """Ejecuta reportes extra parametrizados directamente sobre Oracle."""

    def consultar_cobros_catalinas(
        self, req: ReporteExtraCatalinasRequest
    ) -> ReporteExtraCatalinasResponse:
        bind_params = {
            "periodo_desde": req.periodo_desde,
            "periodo_hasta": req.periodo_hasta,
            "dnis": req.dnis,
            "tolerancia_pct": req.tolerancia_pct,
            "ver_sin_lote": req.ver_sin_lote,
        }
        try:
            columnas, raw_rows = oracle_client.ejecutar_consulta(
                SQL_CATALINAS_COBROS,
                bind_params,
            )
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"No se pudo ejecutar la consulta en Oracle: {exc}",
            ) from exc

        filas: list[CatalinasCobroItem] = []
        for raw in raw_rows:
            row_map = dict(zip(columnas, raw))
            filas.append(
                CatalinasCobroItem(
                    periodo_haber=str(row_map.get("periodo_haber") or ""),
                    dni=str(row_map.get("dni") or "-"),
                    nombre_persona=_a_texto_opcional(row_map.get("nombre_persona")),
                    estado=str(row_map.get("estado") or ""),
                    importe_cobro=round(float(row_map.get("importe_cobro") or 0), 2),
                    idcobro=_a_entero_opcional(row_map.get("idcobro")),
                    fecha_cobro=_a_texto_opcional(row_map.get("fecha_cobro")),
                    idprestamo=_a_entero_opcional(row_map.get("idprestamo")),
                )
            )

        return ReporteExtraCatalinasResponse(
            parametros=req,
            resumen=_construir_resumen(filas),
            filas=filas,
        )
