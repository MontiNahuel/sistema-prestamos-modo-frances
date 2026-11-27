WITH parametros AS (
    SELECT CAST(:periodo_haber AS VARCHAR2(6)) AS periodo_haber,
           TRUNC(CAST(:fecha_desde AS DATE)) AS fecha_desde,
           TRUNC(CAST(:fecha_hasta AS DATE)) + 1 AS fecha_fin,
           CAST(:tipo_prestamo AS VARCHAR2(200)) AS tipo_prestamo,
           CAST(:banco_id AS NUMBER) AS banco_id,
           CAST(:lista AS VARCHAR2(400)) AS lista
    FROM dual
), cuotas_bna AS (
    SELECT /*+ materialize */ v.idprestamo, v.idcuota, v.fechageneracion,
           v.periodohaber, v.tipo_prestamo, v.prestador,
           CASE WHEN MIN(TRIM(v.tipotabla)) = MAX(TRIM(v.tipotabla))
                THEN MIN(TRIM(v.tipotabla)) END AS tipo_producto,
           CASE WHEN MIN(TRIM(v.nomtabla)) = MAX(TRIM(v.nomtabla))
                THEN MIN(TRIM(v.nomtabla)) END AS plan_producto,
           CASE WHEN MIN(v.documento_nro) = MAX(v.documento_nro)
                THEN TO_CHAR(MIN(v.documento_nro)) END AS dni
    FROM prestaprod.mv_prestamos_mora_completa v
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR v.fechageneracion >= p.fecha_desde)
      AND (p.banco_id IS NULL OR p.banco_id = 0)
      AND (p.fecha_fin IS NULL OR v.fechageneracion < p.fecha_fin)
      AND (p.periodo_haber IS NULL OR v.periodohaber = p.periodo_haber)
      AND (p.tipo_prestamo IS NULL OR v.tipo_prestamo = p.tipo_prestamo)
      AND (UPPER(TRIM(v.estado_presentacion)) IN ('COBRADO', 'BAPRO', 'OK')
           OR UPPER(TRIM(v.motivo_mora)) = 'OK')
    GROUP BY v.idprestamo, v.idcuota, v.fechageneracion, v.periodohaber, v.tipo_prestamo, v.prestador
), bna AS (
    SELECT 'BNA' AS fuente_cobro, 'BNA' AS banco,
           e.idpresentacionmensualenv AS id_lista, e.fechageneracion,
           d.idcobrobna AS id_cobro, d.idcobrobnareg AS id_registro,
           d.idprestador, d.idprestamo, d.idcuota, d.importe AS importe_cobrado,
           d.importe AS importe_respuesta, TRIM(d.nrocuenta) AS numero_cuenta,
           h.actuafec AS fecha_recepcion, h.idestadocobrobna AS estado_lote,
           h.idcanal AS canal_imputacion, d.idtipoprestamo,
           v.periodohaber, v.periodohaber AS periodo_cuota,
           v.tipo_prestamo, v.tipo_producto, v.plan_producto, v.dni,
           d.idcobrobnareg AS id_grupo,
           CASE WHEN h.idestadocobrobna = 2 THEN (
               SELECT SUM(b.importe_cs)
               FROM prestaprod.bna_presentacionmensual b
               WHERE b.idpresentacionmensualenv = e.idpresentacionmensualenv
                 AND b.idprestador = d.idprestador AND b.idprestamo = d.idprestamo
                 AND b.idcuota = d.idcuota AND b.periodohaber = v.periodohaber AND b.estado = 0
           ) END AS cuota_social
    FROM prestaprod.bna_presentacionmensualenvio e
    JOIN prestaprod.cobrobnadetalle d ON d.idpresentacionmensualenv = e.idpresentacionmensualenv
    JOIN prestaprod.prestador ent ON ent.idprestador = d.idprestador
    JOIN cuotas_bna v ON v.idprestamo = d.idprestamo AND v.idcuota = d.idcuota
                     AND v.fechageneracion = e.fechageneracion AND v.prestador = ent.descripcion
    LEFT JOIN prestaprod.cobrobna h ON h.idcobrobna = d.idcobrobna
    WHERE TRIM(d.coderror) = '0'
), listas_mp AS (
    SELECT /*+ materialize */ e.idpresentacionmensualenv AS id_lista, e.fechageneracion,
           e.periodohaber, e.idcanalcobrosalida, NVL(c.descripcion, 'MP') AS banco,
           e.idtipoprestamo, tp.descripcion AS tipo_prestamo
    FROM prestaprod.mp_presentacionmensualenvio e
    JOIN prestaprod.tipoprestamo tp ON tp.idtipoprestamo = e.idtipoprestamo
    LEFT JOIN prestaprod.mp_canalcobro c ON c.idcanalcobro = e.idcanalcobrosalida
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR e.fechageneracion >= p.fecha_desde)
      AND (p.banco_id IS NULL OR e.idcanalcobrosalida = p.banco_id)
      AND (p.fecha_fin IS NULL OR e.fechageneracion < p.fecha_fin)
      AND (p.periodo_haber IS NULL OR e.periodohaber = p.periodo_haber)
      AND (p.tipo_prestamo IS NULL OR tp.descripcion = p.tipo_prestamo)
      AND (p.lista IS NULL OR 'MP / ' || NVL(c.descripcion, 'MP') || ' - ' || TO_CHAR(e.idpresentacionmensualenv) = p.lista)
), respuestas_mp AS (
    SELECT /*+ materialize */ e.id_lista, d.idprestador, d.idprestamo, d.idcuota,
           d.idcobromp, d.idcobrompreg, d.importe, h.actuafec, h.idestadocobromp,
           -- Reproduce el grupo utilizado por DameDetallePorCanal al generar el asiento.
           MAX(d.idcobrompreg) OVER (
               PARTITION BY e.id_lista, d.idcobromp, d.idprestador, d.idprestamo, d.idcuota,
                   d.periodohaber, d.prestacion, d.fechavtoorig, d.fechacompensacion, d.fecharendicion,
                   d.codigotransaccion, d.bloque1cbu, d.bloque2cbu, d.idpersona,
                   d.coderror, d.notificaciones, d.fecharechazo
           ) AS id_grupo,
           CASE WHEN REGEXP_LIKE(TRIM(d.bloque1cbu), '^[0-9]{8}$')
                 AND REGEXP_LIKE(TRIM(d.bloque2cbu), '^[0-9]{14}$')
                THEN TRIM(d.bloque1cbu) || TRIM(d.bloque2cbu) END AS cuenta,
           CASE WHEN REGEXP_LIKE(TRIM(d.referencia), '^[0-9]+-[0-9]+$') THEN
               CASE WHEN TO_NUMBER(SUBSTR(TRIM(d.referencia), 1, INSTR(TRIM(d.referencia), '-') - 1)) = e.id_lista THEN
                   CASE WHEN e.idcanalcobrosalida = 3
                        THEN TO_NUMBER(SUBSTR(TRIM(d.referencia), INSTR(TRIM(d.referencia), '-') + 1, 6))
                        ELSE TO_NUMBER(SUBSTR(TRIM(d.referencia), INSTR(TRIM(d.referencia), '-') + 1)) END
               END
           END AS id_item
    FROM listas_mp e
    JOIN prestaprod.cobrompdetalle d ON d.idpresentacionmensualenv = e.id_lista
    LEFT JOIN prestaprod.cobromp h ON h.idcobromp = d.idcobromp
    WHERE UPPER(TRIM(d.coderror)) = 'OK'
), mp_unicas AS (
    -- Sólo se usa una respuesta para enriquecer el registro de presentación.
    SELECT r.*,
           ROW_NUMBER() OVER (
               PARTITION BY r.id_lista, r.id_item, r.idprestador, r.idprestamo, r.idcuota
               ORDER BY CASE WHEN r.idestadocobromp = 2 THEN 0 ELSE 1 END,
                        r.actuafec DESC NULLS LAST, r.idcobromp DESC, r.idcobrompreg DESC
           ) AS orden
    FROM respuestas_mp r
    WHERE r.id_item IS NOT NULL
), mp AS (
    -- Mismo criterio que Débito Directo: un registro OK de la lista y su IMPORTE_AJUST.
    SELECT 'MP' AS fuente_cobro, e.banco, e.id_lista, e.fechageneracion,
           d.idcobromp AS id_cobro, m.idpresentacionmensualenvreg AS id_registro,
           m.idprestador, m.idprestamo, m.idcuota, NVL(m.importe_ajust, 0) AS importe_cobrado,
           NVL(d.importe, m.importe_ajust) AS importe_respuesta,
           COALESCE(d.cuenta, CASE WHEN REGEXP_LIKE(TRIM(m.idnumerodescuento), '^[0-9]{22}$')
                                   THEN TRIM(m.idnumerodescuento) END) AS numero_cuenta,
           d.actuafec AS fecha_recepcion, d.idestadocobromp AS estado_lote,
           po.idcanal AS canal_imputacion, e.idtipoprestamo,
           e.periodohaber, m.periodohaber AS periodo_cuota,
           e.tipo_prestamo, TRIM(tt.descripcion) AS tipo_producto,
           TRIM(t.descripcion) AS plan_producto,
           TRIM(CAST(per.documento_nro AS VARCHAR2(32))) AS dni, d.id_grupo, m.importecs AS cuota_social
    FROM listas_mp e
    JOIN prestaprod.mp_presentacionmensual m ON m.idpresentacionmensualenv = e.id_lista
    LEFT JOIN mp_unicas d ON d.id_lista = e.id_lista AND d.id_item = m.idpresentacionmensualenvreg
        AND d.idprestador = m.idprestador AND d.idprestamo = m.idprestamo AND d.idcuota = m.idcuota AND d.orden = 1
    LEFT JOIN prestaprod.prestamo po ON po.idprestador = m.idprestador AND po.idprestamo = m.idprestamo
    LEFT JOIN prestaprod.tablaprestamo t ON t.idtablaprestamo = po.idtablaprestamo
    LEFT JOIN prestaprod.tipotablaprestamo tt ON tt.idtipotablaprestamo = t.idtipotabla
    LEFT JOIN prestaprod.persona per ON per.idpersona = NVL(m.idpersona, po.idpersona)
        AND per.iddocumento_tipo = 1
    WHERE UPPER(TRIM(m.descripcion)) = 'OK'
), reporte AS (
    SELECT /*+ materialize */ * FROM bna
    UNION ALL
    SELECT * FROM mp
), grupos AS (
    SELECT fuente_cobro, id_lista, id_cobro, id_grupo, idprestador, idprestamo, idcuota, periodo_cuota,
           canal_imputacion, idtipoprestamo, fechageneracion, fecha_recepcion,
           COUNT(*) AS cantidad, SUM(importe_respuesta) AS importe_grupo,
           SUM(NVL(cuota_social, 0)) AS cuota_social
    FROM reporte
    WHERE estado_lote = 2 AND fecha_recepcion IS NOT NULL
    GROUP BY fuente_cobro, id_lista, id_cobro, id_grupo, idprestador, idprestamo, idcuota, periodo_cuota,
             canal_imputacion, idtipoprestamo, fechageneracion, fecha_recepcion
), candidatas AS (
    -- Sin enlace directo de respuesta a asiento, sólo se conservan coincidencias unívocas.
    SELECT r.fuente_cobro, r.id_lista, r.id_cobro, r.id_grupo, r.cantidad, r.importe_grupo,
           m.fechamovimiento, m.importe AS importe_aplicado,
           CASE WHEN TRUNC(d.fechaultact) = TRUNC(m.fechamovimiento)
                THEN d.fechaultact END AS fecha_aplicacion,
           COUNT(*) OVER (PARTITION BY r.fuente_cobro, r.id_lista, r.id_cobro, r.id_grupo) AS movimientos,
           COUNT(*) OVER (PARTITION BY m.idprestamoctacte) AS respuestas
    FROM grupos r
    JOIN prestaprod.cobrodetalle d ON d.periodohaber = r.periodo_cuota
        AND d.idprestador = r.idprestador AND d.idprestamo = r.idprestamo
        AND d.importe IN (r.importe_grupo, r.importe_grupo - r.cuota_social)
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
       a.fecha_aplicacion, r.numero_cuenta, r.tipo_producto,
       r.plan_producto,
       CASE WHEN a.cantidad = 1 THEN a.importe_aplicado
            WHEN a.importe_aplicado = a.importe_grupo THEN r.importe_respuesta
       END AS importe_aplicado,
       r.dni, a.fechamovimiento AS fecha_movimiento
FROM reporte r
LEFT JOIN candidatas a ON a.fuente_cobro = r.fuente_cobro AND a.id_lista = r.id_lista
    AND a.id_cobro = r.id_cobro AND a.id_grupo = r.id_grupo
    AND a.movimientos = 1 AND a.respuestas = 1
CROSS JOIN parametros p
WHERE p.lista IS NULL OR r.fuente_cobro || ' / ' || r.banco || ' - ' || TO_CHAR(r.id_lista) = p.lista
ORDER BY r.banco, r.id_lista, r.fechageneracion, r.id_cobro, r.id_registro
