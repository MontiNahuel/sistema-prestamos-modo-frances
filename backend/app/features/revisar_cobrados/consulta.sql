WITH parametros AS (
    SELECT CAST(:periodo_haber AS VARCHAR2(6)) AS periodo_haber,
           TRUNC(CAST(:fecha_desde AS DATE)) AS fecha_desde,
           TRUNC(CAST(:fecha_hasta AS DATE)) + 1 AS fecha_fin,
           CAST(:tipo_prestamo AS VARCHAR2(200)) AS tipo_prestamo,
           CAST(:lista AS VARCHAR2(400)) AS lista
    FROM dual
), cuotas_mv AS (
    SELECT /*+ materialize */ DISTINCT v.idprestamo, v.idcuota, v.fechageneracion,
           v.periodohaber, v.tipo_prestamo, v.prestador
    FROM prestaprod.mv_prestamos_mora_completa v
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR v.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR v.fechageneracion < p.fecha_fin)
      AND (p.periodo_haber IS NULL OR v.periodohaber = p.periodo_haber)
      AND (p.tipo_prestamo IS NULL OR v.tipo_prestamo = p.tipo_prestamo)
      AND (UPPER(TRIM(v.estado_presentacion)) IN ('COBRADO', 'BAPRO', 'OK')
           OR UPPER(TRIM(v.motivo_mora)) = 'OK')
), respuestas AS (
    SELECT 'BNA' AS fuente_cobro, 'BNA' AS banco,
           e.idpresentacionmensualenv AS id_lista, e.fechageneracion,
           d.idcobrobna AS id_cobro, d.idcobrobnareg AS id_registro,
           d.idprestador, d.idprestamo, d.idcuota, d.importe AS importe_cobrado
    FROM prestaprod.bna_presentacionmensualenvio e
    JOIN prestaprod.cobrobnadetalle d ON d.idpresentacionmensualenv = e.idpresentacionmensualenv
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR e.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR e.fechageneracion < p.fecha_fin)
      AND TRIM(d.coderror) = '0'
    UNION ALL
    SELECT 'MP', NVL(c.descripcion, 'MP'), e.idpresentacionmensualenv, e.fechageneracion,
           d.idcobromp, d.idcobrompreg, d.idprestador, d.idprestamo, d.idcuota, d.importe
    FROM prestaprod.mp_presentacionmensualenvio e
    JOIN prestaprod.cobrompdetalle d ON d.idpresentacionmensualenv = e.idpresentacionmensualenv
    LEFT JOIN prestaprod.mp_canalcobro c ON c.idcanalcobro = e.idcanalcobrosalida
    CROSS JOIN parametros p
    WHERE (p.fecha_desde IS NULL OR e.fechageneracion >= p.fecha_desde)
      AND (p.fecha_fin IS NULL OR e.fechageneracion < p.fecha_fin)
      AND UPPER(TRIM(d.coderror)) = 'OK'
)
SELECT r.fuente_cobro, r.banco, r.fuente_cobro || ' / ' || r.banco || ' - ' || TO_CHAR(r.id_lista) AS lista_cobro,
       r.id_lista, r.importe_cobrado, r.id_cobro, r.id_registro, r.idprestamo, r.idcuota,
       v.periodohaber, r.fechageneracion, v.tipo_prestamo
FROM respuestas r
JOIN prestaprod.prestador ent ON ent.idprestador = r.idprestador
JOIN cuotas_mv v ON v.idprestamo = r.idprestamo AND v.idcuota = r.idcuota
                AND v.fechageneracion = r.fechageneracion AND v.prestador = ent.descripcion
CROSS JOIN parametros p
WHERE p.lista IS NULL OR r.fuente_cobro || ' / ' || r.banco || ' - ' || TO_CHAR(r.id_lista) = p.lista
ORDER BY r.banco, r.id_lista, r.fechageneracion, r.id_cobro, r.id_registro
