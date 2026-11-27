SELECT 'MP / ' || NVL(c.descripcion, 'MP') || ' - ' || TO_CHAR(e.idpresentacionmensualenv) AS lista,
       e.periodohaber, e.fechageneracion, m.idpresentacionmensualenvreg AS id_registro,
       m.idprestamo, m.idcuota, tp.descripcion AS tipo_prestamo,
       TRIM(CAST(per.documento_nro AS VARCHAR2(32))) AS dni,
       CASE WHEN REGEXP_LIKE(TRIM(m.idnumerodescuento), '^[0-9]{22}$')
            THEN TRIM(m.idnumerodescuento) END AS numero_cuenta,
       TRIM(tt.descripcion) AS tipo_producto, TRIM(t.descripcion) AS plan_producto,
       NVL(m.importe_ajust, 0) AS importe_presentado
FROM prestaprod.mp_presentacionmensualenvio e
JOIN prestaprod.mp_presentacionmensual m ON m.idpresentacionmensualenv = e.idpresentacionmensualenv
JOIN prestaprod.tipoprestamo tp ON tp.idtipoprestamo = e.idtipoprestamo
LEFT JOIN prestaprod.mp_canalcobro c ON c.idcanalcobro = e.idcanalcobrosalida
LEFT JOIN prestaprod.prestamo po ON po.idprestador = m.idprestador AND po.idprestamo = m.idprestamo
LEFT JOIN prestaprod.tablaprestamo t ON t.idtablaprestamo = po.idtablaprestamo
LEFT JOIN prestaprod.tipotablaprestamo tt ON tt.idtipotablaprestamo = t.idtipotabla
LEFT JOIN prestaprod.persona per ON per.idpersona = NVL(m.idpersona, po.idpersona) AND per.iddocumento_tipo = 1
WHERE e.idcanalcobrosalida = :banco_id
  AND (:periodo_haber IS NULL OR e.periodohaber = :periodo_haber)
  AND (:tipo_prestamo IS NULL OR tp.descripcion = :tipo_prestamo)
  AND (CAST(:fecha_desde AS DATE) IS NULL OR e.fechageneracion >= TRUNC(CAST(:fecha_desde AS DATE)))
  AND (CAST(:fecha_hasta AS DATE) IS NULL OR e.fechageneracion < TRUNC(CAST(:fecha_hasta AS DATE)) + 1)
  AND NULLIF(TRIM(m.descripcion), '') IS NULL
ORDER BY e.fechageneracion, e.idpresentacionmensualenv, m.idpresentacionmensualenvreg
