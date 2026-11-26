WITH parametros AS (
    SELECT CAST(:periodo_haber AS VARCHAR2(6)) AS periodo_haber,
           TRUNC(CAST(:fecha_desde AS DATE)) AS fecha_desde,
           TRUNC(CAST(:fecha_hasta AS DATE)) + 1 AS fecha_fin,
           CAST(:tipo_prestamo AS VARCHAR2(200)) AS tipo_prestamo,
           CAST(:lista AS VARCHAR2(400)) AS lista
    FROM dual
), cuotas_mv AS (
    SELECT /*+ materialize */ v.idprestamo, v.idcuota, v.fechageneracion,
           v.periodohaber, v.tipo_prestamo, v.prestador,
           CASE WHEN MIN(TRIM(v.tipotabla)) = MAX(TRIM(v.tipotabla))
                THEN MIN(TRIM(v.tipotabla)) END AS tipo_producto,
           CASE WHEN MIN(TRIM(v.nomtabla)) = MAX(TRIM(v.nomtabla))
                THEN MIN(TRIM(v.nomtabla)) END AS plan_producto
    FROM prestaprod.mv_prestamos_mora_completa v
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR v.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR v.fechageneracion < p.fecha_fin)
      AND (p.periodo_haber IS NULL OR v.periodohaber = p.periodo_haber)
      AND (p.tipo_prestamo IS NULL OR v.tipo_prestamo = p.tipo_prestamo)
      AND (UPPER(TRIM(v.estado_presentacion)) IN ('COBRADO', 'BAPRO', 'OK')
           OR UPPER(TRIM(v.motivo_mora)) = 'OK')
    GROUP BY v.idprestamo, v.idcuota, v.fechageneracion, v.periodohaber, v.tipo_prestamo, v.prestador
), respuestas AS (
    SELECT 'BNA' AS fuente_cobro, 'BNA' AS banco,
           e.idpresentacionmensualenv AS id_lista, e.fechageneracion,
           d.idcobrobna AS id_cobro, d.idcobrobnareg AS id_registro,
           d.idprestador, d.idprestamo, d.idcuota, d.importe AS importe_cobrado,
           TRIM(d.nrocuenta) AS numero_cuenta, h.actuafec AS fecha_recepcion,
           h.idestadocobrobna AS estado_lote, h.idcanal, d.idtipoprestamo,
           TRIM(d.vinculacion) AS referencia, CAST(NULL AS NUMBER) AS canal_salida
    FROM prestaprod.bna_presentacionmensualenvio e
    JOIN prestaprod.cobrobnadetalle d ON d.idpresentacionmensualenv = e.idpresentacionmensualenv
    LEFT JOIN prestaprod.cobrobna h ON h.idcobrobna = d.idcobrobna
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR e.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR e.fechageneracion < p.fecha_fin)
      AND TRIM(d.coderror) = '0'
    UNION ALL
    SELECT 'MP', NVL(c.descripcion, 'MP'), e.idpresentacionmensualenv, e.fechageneracion,
           d.idcobromp, d.idcobrompreg, d.idprestador, d.idprestamo, d.idcuota, d.importe,
           CASE WHEN REGEXP_LIKE(TRIM(d.bloque1cbu), '^[0-9]{8}$')
                 AND REGEXP_LIKE(TRIM(d.bloque2cbu), '^[0-9]{14}$')
                THEN TRIM(d.bloque1cbu) || TRIM(d.bloque2cbu) END,
           h.actuafec, h.idestadocobromp, CAST(NULL AS NUMBER), e.idtipoprestamo,
           TRIM(d.referencia), e.idcanalcobrosalida
    FROM prestaprod.mp_presentacionmensualenvio e
    JOIN prestaprod.cobrompdetalle d ON d.idpresentacionmensualenv = e.idpresentacionmensualenv
    LEFT JOIN prestaprod.cobromp h ON h.idcobromp = d.idcobromp
    LEFT JOIN prestaprod.mp_canalcobro c ON c.idcanalcobro = e.idcanalcobrosalida
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR e.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR e.fechageneracion < p.fecha_fin)
      AND UPPER(TRIM(d.coderror)) = 'OK'
), reporte AS (
    SELECT /*+ materialize */ r.*, v.periodohaber, v.tipo_prestamo, v.tipo_producto, v.plan_producto,
           CASE WHEN REGEXP_LIKE(r.referencia, '^[0-9]+-[0-9]+$') THEN
               CASE WHEN TO_NUMBER(SUBSTR(r.referencia, 1, INSTR(r.referencia, '-') - 1)) = r.id_lista THEN
                   CASE WHEN r.fuente_cobro = 'MP' AND r.canal_salida = 3
                        THEN TO_NUMBER(SUBSTR(r.referencia, INSTR(r.referencia, '-') + 1, 6))
                        ELSE TO_NUMBER(SUBSTR(r.referencia, INSTR(r.referencia, '-') + 1)) END
               END
           END AS id_item_presentacion
    FROM respuestas r
    JOIN prestaprod.prestador ent ON ent.idprestador = r.idprestador
    JOIN cuotas_mv v ON v.idprestamo = r.idprestamo AND v.idcuota = r.idcuota
                    AND v.fechageneracion = r.fechageneracion AND v.prestador = ent.descripcion
), preparados AS (
    -- VB6 resta la cuota social de la presentación al crear el detalle contable.
    SELECT r.*,
           CASE WHEN r.fuente_cobro = 'MP' THEN p.idcanal ELSE r.idcanal END AS canal_imputacion,
           CASE WHEN r.fuente_cobro = 'BNA' THEN (
               SELECT SUM(b.importe_cs)
               FROM prestaprod.bna_presentacionmensual b
               WHERE b.idpresentacionmensualenv = r.id_lista AND b.idprestador = r.idprestador
                 AND b.idprestamo = r.idprestamo AND b.idcuota = r.idcuota
                 AND b.periodohaber = r.periodohaber AND b.estado = 0
           ) ELSE (
               SELECT SUM(mp.importecs)
               FROM prestaprod.mp_presentacionmensual mp
               WHERE mp.idpresentacionmensualenv = r.id_lista AND mp.idprestador = r.idprestador
                 AND mp.idprestamo = r.idprestamo AND mp.idcuota = r.idcuota
                 AND mp.periodohaber = r.periodohaber AND UPPER(TRIM(mp.descripcion)) = 'OK'
           ) END AS cuota_social
    FROM reporte r
    LEFT JOIN prestaprod.prestamo p ON r.fuente_cobro = 'MP'
        AND p.idprestador = r.idprestador AND p.idprestamo = r.idprestamo
    WHERE r.estado_lote = 2 AND r.fecha_recepcion IS NOT NULL
), candidatas AS (
    -- Los archivos BNA/MP no conservan la clave contable. Usar sólo coincidencias unívocas.
    SELECT r.fuente_cobro, r.id_cobro, r.id_registro, m.fechamovimiento, m.importe AS importe_aplicado,
           COUNT(*) OVER (PARTITION BY r.fuente_cobro, r.id_cobro, r.id_registro) AS movimientos,
           COUNT(*) OVER (PARTITION BY m.idprestamoctacte) AS respuestas
    FROM preparados r
    JOIN prestaprod.cobrodetalle d ON d.periodohaber = r.periodohaber
        AND d.idprestador = r.idprestador AND d.idprestamo = r.idprestamo
        AND d.importe IN (r.importe_cobrado, r.importe_cobrado - r.cuota_social)
        AND d.idestadocobro IN (2, 9)
    JOIN prestaprod.cobro c ON c.idcobro = d.idcobro AND c.idtipocobro = 1
        AND c.idcanal = r.canal_imputacion AND c.idtipoprestamo = r.idtipoprestamo
    JOIN prestaprod.prestamocuentacorriente m ON m.idcobro = d.idcobro AND m.idcobroreg = d.idcobroreg
        AND m.idprestador = r.idprestador AND m.idprestamo = r.idprestamo AND m.idcuota = r.idcuota
        AND m.idtipomovimiento = 2 AND m.idestadoctacte = 1
        AND ROUND(m.importe + NVL(m.ajuste, 0), 2) = ROUND(d.importe, 2)
    WHERE m.fechamovimiento >= TRUNC(r.fechageneracion)
      AND m.fechamovimiento >= TRUNC(r.fecha_recepcion)
      AND TRUNC(m.fechamovimiento) = TRUNC(c.fecharecepcion)
)
SELECT r.fuente_cobro, r.banco, r.fuente_cobro || ' / ' || r.banco || ' - ' || TO_CHAR(r.id_lista) AS lista_cobro,
       r.id_lista, r.importe_cobrado, r.id_cobro, r.id_registro, r.idprestamo, r.idcuota,
       r.periodohaber, r.fechageneracion, r.tipo_prestamo,
       a.fechamovimiento AS fecha_aplicacion,
       COALESCE(r.numero_cuenta, CASE WHEN r.fuente_cobro = 'MP' THEN (
           SELECT MIN(TRIM(mp.idnumerodescuento))
           FROM prestaprod.mp_presentacionmensual mp
           WHERE mp.idpresentacionmensualenv = r.id_lista AND mp.idpresentacionmensualenvreg = r.id_item_presentacion
             AND mp.idprestador = r.idprestador AND mp.idprestamo = r.idprestamo AND mp.idcuota = r.idcuota
             AND REGEXP_LIKE(TRIM(mp.idnumerodescuento), '^[0-9]{22}$')
           HAVING COUNT(DISTINCT TRIM(mp.idnumerodescuento)) = 1
       ) END) AS numero_cuenta,
       r.tipo_producto,
       r.plan_producto, a.importe_aplicado
FROM reporte r
LEFT JOIN candidatas a ON a.fuente_cobro = r.fuente_cobro AND a.id_cobro = r.id_cobro
    AND a.id_registro = r.id_registro AND a.movimientos = 1 AND a.respuestas = 1
CROSS JOIN parametros p
WHERE p.lista IS NULL OR r.fuente_cobro || ' / ' || r.banco || ' - ' || TO_CHAR(r.id_lista) = p.lista
ORDER BY r.banco, r.id_lista, r.fechageneracion, r.id_cobro, r.id_registro
