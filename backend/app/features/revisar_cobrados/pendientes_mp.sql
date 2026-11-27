SELECT 'MP / ' || NVL(c.descripcion, 'MP') || ' - ' || TO_CHAR(e.idpresentacionmensualenv) AS lista,
       e.periodohaber, e.fechageneracion, COUNT(*) AS registros,
       SUM(NVL(m.importe_ajust, 0)) AS importe_presentado
FROM prestaprod.mp_presentacionmensualenvio e
JOIN prestaprod.mp_presentacionmensual m ON m.idpresentacionmensualenv = e.idpresentacionmensualenv
JOIN prestaprod.tipoprestamo tp ON tp.idtipoprestamo = e.idtipoprestamo
LEFT JOIN prestaprod.mp_canalcobro c ON c.idcanalcobro = e.idcanalcobrosalida
WHERE e.idcanalcobrosalida = :banco_id
  AND (:periodo_haber IS NULL OR e.periodohaber = :periodo_haber)
  AND (:tipo_prestamo IS NULL OR tp.descripcion = :tipo_prestamo)
  AND (CAST(:fecha_desde AS DATE) IS NULL OR e.fechageneracion >= TRUNC(CAST(:fecha_desde AS DATE)))
  AND (CAST(:fecha_hasta AS DATE) IS NULL OR e.fechageneracion < TRUNC(CAST(:fecha_hasta AS DATE)) + 1)
  AND NULLIF(TRIM(m.descripcion), '') IS NULL
GROUP BY c.descripcion, e.idpresentacionmensualenv, e.periodohaber, e.fechageneracion
ORDER BY e.fechageneracion, e.idpresentacionmensualenv
