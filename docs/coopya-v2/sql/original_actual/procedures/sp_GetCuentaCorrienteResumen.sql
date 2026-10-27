
/* ---------- 1) sp_GetCuentaCorrienteResumen ------------------------------- */

CREATE   PROCEDURE [dbo].[sp_GetCuentaCorrienteResumen]
    @IdPersona INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @MesActual DATE = DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 1);

    /* ---------------- A) Movimientos ---------------- */
    SELECT
        pr.Id, pr.Banco, pr.Monto, pr.PresentacionId_Det, pr.FechaImpacto,
        pr.Resultado, pr.FechaInsert, pr.FechaModif,
        pr.TipoMovimiento, pr.Concepto, pr.PeriodoCubierto, pr.Motivo,
        pr.UsuarioId, pr.IdMovimientoOrigen,
        NroArchivo  = COALESCE(ai.NroArchivo, ab.NroArchivo, an.NroArchivo, ac.NroArchivo),
        TipoImporte = COALESCE(ai.TipoImporte, ab.TipoImporte, an.TipoImporte, ac.TipoImporte),
        SumarMora   = COALESCE(ai.SumarMora, ab.SumarMora, an.SumarMora, ac.SumarMora),
        UsuarioGenera   = COALESCE(ai.UsuarioId, ab.UsuarioId, an.UsuarioId, ac.UsuarioId),
        FechaGeneracion = COALESCE(ai.FechaGeneracion, ab.FechaGeneracion, an.FechaGeneracion, ac.FechaGeneracion),
        EsManual    = CASE WHEN pr.TipoMovimiento IS NOT NULL THEN 1 ELSE 0 END,
        Estado = CASE
                    WHEN pr.Resultado IS NULL OR LTRIM(RTRIM(pr.Resultado)) = '' THEN 'PENDIENTE'
                    WHEN UPPER(LTRIM(RTRIM(pr.Resultado))) IN ('OK','0') THEN 'COBRADO'
                    ELSE 'RECHAZADO'
                 END,
        MontoPesos = TRY_CAST(pr.Monto AS DECIMAL(18,2)) / 100.0,
        MesImpacto = CASE WHEN pr.FechaImpacto IS NULL THEN NULL
                          ELSE DATEFROMPARTS(YEAR(pr.FechaImpacto), MONTH(pr.FechaImpacto), 1) END,
        TieneDesglose = CASE WHEN EXISTS (SELECT 1 FROM dbo.CuentaCorrienteDesglose g
                                          WHERE g.IdMovimiento = pr.Id) THEN 1 ELSE 0 END
    INTO #Movs
    FROM dbo.PersonasRepositorio pr
    LEFT JOIN dbo.PresentacionIcbcAuditoriaDetalle di
           ON pr.Banco = 'ICBC' AND di.Id = pr.PresentacionId_Det
    LEFT JOIN dbo.PresentacionIcbcAuditoria ai ON ai.Id = di.IdAuditoria
    LEFT JOIN dbo.PresentacionBaproAuditoria ab
           ON pr.Banco = 'BAPRO' AND ab.Id = pr.PresentacionId_Det
    LEFT JOIN dbo.PresentacionNacionAuditoriaDetalle dn
           ON pr.Banco = 'NACION' AND dn.Id = pr.PresentacionId_Det
    LEFT JOIN dbo.PresentacionNacionAuditoria an ON an.Id = dn.IdAuditoria
    /* COMERCIO: su auditoria es PLANA (sin tabla de detalle), como la de BAPRO. */
    LEFT JOIN dbo.PresentacionComercioAuditoria ac
           ON pr.Banco = 'COMERCIO' AND ac.Id = pr.PresentacionId_Det
    WHERE pr.IdPersona = @IdPersona;

    ALTER TABLE #Movs ADD Cobertura DECIMAL(18,2) NULL, CargoExtra DECIMAL(18,2) NULL;

    UPDATE #Movs SET
        Cobertura = CASE
            WHEN TipoMovimiento IN ('PAGO_MANUAL','AJUSTE_NEGATIVO','CANCELACION_MORA','BONIFICACION')
                 THEN MontoPesos
            WHEN TipoMovimiento IS NULL AND Estado = 'COBRADO' THEN MontoPesos
            ELSE 0 END,
        CargoExtra = CASE WHEN TipoMovimiento = 'AJUSTE_POSITIVO' THEN MontoPesos ELSE 0 END;

    /* ---------------- B) Desglose, con el estado derivado del movimiento ------
       ImporteCobrado/Rechazado NO se leen de la tabla: se derivan. Asi no puede
       haber un desglose que diga "cobrado" sobre un movimiento rechazado. */
    SELECT
        g.Id, g.IdMovimiento, g.Banco, g.NroArchivo, g.PresentacionId_Det,
        g.Concepto, g.PlanId, g.NumeroCuota, g.CantidadCuotas, g.PeriodoObligacion,
        g.ImporteTeorico, g.ImportePresentado, g.Origen, g.Motivo, g.FechaGeneracion,
        m.Estado, m.TipoMovimiento,
        ImporteCobrado   = CASE WHEN m.Estado = 'COBRADO'   THEN g.ImportePresentado ELSE 0 END,
        ImporteRechazado = CASE WHEN m.Estado = 'RECHAZADO' THEN g.ImportePresentado ELSE 0 END,
        ImportePendiente = CASE WHEN m.Estado = 'PENDIENTE' THEN g.ImportePresentado ELSE 0 END,
        /* Cuanto de este desglose reduce la deuda del concepto. */
        Cobertura = CASE
            WHEN m.TipoMovimiento IN ('PAGO_MANUAL','AJUSTE_NEGATIVO','CANCELACION_MORA','BONIFICACION')
                 THEN g.ImportePresentado
            WHEN m.TipoMovimiento IS NULL AND m.Estado = 'COBRADO' THEN g.ImportePresentado
            ELSE 0 END,
        CargoExtra = CASE WHEN m.TipoMovimiento = 'AJUSTE_POSITIVO' THEN g.ImportePresentado ELSE 0 END
    INTO #Desglose
    FROM dbo.CuentaCorrienteDesglose g
    JOIN #Movs m ON m.Id = g.IdMovimiento
    WHERE g.IdPersona = @IdPersona;

    /* Lo que entro sin desglose: la plata existe, el concepto no se conoce. */
    DECLARE @CoberturaSinConcepto DECIMAL(18,2) =
        ISNULL((SELECT SUM(Cobertura) FROM #Movs WHERE TieneDesglose = 0), 0);
    DECLARE @MovsSinDesglose INT =
        (SELECT COUNT(*) FROM #Movs WHERE TieneDesglose = 0);

    /* ---------------- C) Conceptos vigentes ---------------- */
    CREATE TABLE #Conceptos (
        Concepto VARCHAR(20), Etiqueta VARCHAR(40), PlanId INT, PlanNombre VARCHAR(200),
        ValorMensual DECIMAL(18,2), FechaInicio DATE NULL, CuotasDelPlan INT NULL,
        MesesEsperados INT NULL, Cobertura DECIMAL(18,2) NULL, CargoExtra DECIMAL(18,2) NULL);

    INSERT INTO #Conceptos (Concepto, Etiqueta, PlanId, PlanNombre, ValorMensual, FechaInicio, CuotasDelPlan, MesesEsperados)
    SELECT 'CUOTA_SOCIAL', 'Cuota Social', p.PlanId_CuotaSocial, cs.Nombre, cs.Precio,
           CAST(p.FechaAsociado AS DATE), NULL,
           CASE WHEN p.FechaAsociado IS NULL THEN NULL
                ELSE DATEDIFF(MONTH, p.FechaAsociado, @Hoy) + 1 END
    FROM dbo.Personas p JOIN dbo.TipoPlanesCs cs ON cs.Id = p.PlanId_CuotaSocial
    WHERE p.Id = @IdPersona AND ISNULL(p.PlanId_CuotaSocial,0) <> 0 AND ISNULL(cs.Precio,0) > 0;

    INSERT INTO #Conceptos (Concepto, Etiqueta, PlanId, PlanNombre, ValorMensual, FechaInicio, CuotasDelPlan, MesesEsperados)
    SELECT 'SERVICIO', 'Servicio Especial', p.PlanId_ServEsp, se.Nombre, se.ImporteCuota,
           CAST(p.FechaServicio AS DATE), se.CantidadCuotas,
           CASE WHEN p.FechaServicio IS NULL THEN NULL
                WHEN ISNULL(se.CantidadCuotas,0) > 0
                     AND DATEDIFF(MONTH, p.FechaServicio, @Hoy) + 1 > se.CantidadCuotas
                     THEN se.CantidadCuotas
                ELSE DATEDIFF(MONTH, p.FechaServicio, @Hoy) + 1 END
    FROM dbo.Personas p JOIN dbo.TipoPlanesServicios se ON se.Id = p.PlanId_ServEsp
    WHERE p.Id = @IdPersona AND ISNULL(p.PlanId_ServEsp,0) <> 0 AND ISNULL(se.ImporteCuota,0) > 0;

    INSERT INTO #Conceptos (Concepto, Etiqueta, PlanId, PlanNombre, ValorMensual, FechaInicio, CuotasDelPlan, MesesEsperados)
    SELECT 'ASISTODO', 'Asistodo', p.PlanId_Asistodo, az.Nombre, az.ImporteCuota,
           CAST(p.FechaServicioAsistodo AS DATE), az.CantidadCuotas,
           CASE WHEN p.FechaServicioAsistodo IS NULL THEN NULL
                WHEN ISNULL(az.CantidadCuotas,0) > 0
                     AND DATEDIFF(MONTH, p.FechaServicioAsistodo, @Hoy) + 1 > az.CantidadCuotas
                     THEN az.CantidadCuotas
                ELSE DATEDIFF(MONTH, p.FechaServicioAsistodo, @Hoy) + 1 END
    FROM dbo.Personas p JOIN dbo.TipoPlanesAsistodo az ON az.Id = p.PlanId_Asistodo
    WHERE p.Id = @IdPersona AND ISNULL(p.PlanId_Asistodo,0) <> 0 AND ISNULL(az.ImporteCuota,0) > 0;

    UPDATE #Conceptos SET MesesEsperados = 0 WHERE MesesEsperados < 0;

    /* La plata de cada concepto, tomada del desglose. Nunca se mezcla. */
    UPDATE c
    SET c.Cobertura  = ISNULL(x.Cobertura, 0),
        c.CargoExtra = ISNULL(x.CargoExtra, 0)
    FROM #Conceptos c
    LEFT JOIN (SELECT Concepto, Cobertura = SUM(Cobertura), CargoExtra = SUM(CargoExtra)
               FROM #Desglose GROUP BY Concepto) x ON x.Concepto = c.Concepto;

    DECLARE @ObligacionMensual DECIMAL(18,2) = ISNULL((SELECT SUM(ValorMensual) FROM #Conceptos), 0);
    DECLARE @ConceptosSinFecha INT = (SELECT COUNT(*) FROM #Conceptos WHERE FechaInicio IS NULL);
    DECLARE @PrimerMes DATE = (SELECT MIN(DATEFROMPARTS(YEAR(FechaInicio), MONTH(FechaInicio), 1))
                               FROM #Conceptos WHERE FechaInicio IS NOT NULL);

    /* ---------------- D) Calendario ----------------
       Misma regla que los conceptos (sección 3), mes por mes. Cada concepto VIGENTE
       en el mes (desde su fecha de asociación y, si el plan tiene cuotas, sólo
       mientras duran) vale:
         - lo que se le PRESENTÓ ese mes (hecho histórico). Si se presentó más de una
           vez (reintento, presentación repetida), cuenta UNA: la mayor. Antes se
           sumaban todas y el saldo crecía con cada repetición.
         - si ese mes no se le presentó: el valor ACTUAL del plan, marcado como
           estimado (EsperadoEstimado). Antes se estimaba sin cortar en la última
           cuota del plan: un Asistodo de 12 cuotas de 2001 sumaba 307 meses.
       Un concepto presentado fuera de su vigencia igual cuenta: se presentó.
       Meses con movimientos VIEJOS (sin desglose: no se sabe de qué concepto era
       cada peso) conservan la regla anterior: el mes vale la suma de lo presentado. */
    CREATE TABLE #Meses (Mes DATE PRIMARY KEY, Esperado DECIMAL(18,2), Estimado BIT,
                         EsperadoEstimado DECIMAL(18,2) NOT NULL DEFAULT 0);

    IF @PrimerMes IS NOT NULL
    BEGIN
        ;WITH Numeros AS (
            SELECT TOP (DATEDIFF(MONTH, @PrimerMes, @MesActual) + 1)
                   n = ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1
            FROM sys.all_objects)
        INSERT INTO #Meses (Mes, Esperado, Estimado)
        SELECT DATEADD(MONTH, n, @PrimerMes), 0, 0 FROM Numeros;

        /* Concepto vigente en cada mes, con su valor actual. */
        SELECT m.Mes, c.Concepto, Valor = c.ValorMensual
        INTO #Vigente
        FROM #Meses m
        JOIN #Conceptos c
          ON c.FechaInicio IS NOT NULL
         AND DATEFROMPARTS(YEAR(c.FechaInicio), MONTH(c.FechaInicio), 1) <= m.Mes
         AND (ISNULL(c.CuotasDelPlan, 0) = 0
              OR m.Mes < DATEADD(MONTH, c.CuotasDelPlan, DATEFROMPARTS(YEAR(c.FechaInicio), MONTH(c.FechaInicio), 1)));

        /* Lo presentado por concepto y mes: por presentación (banco + archivo) se suma
           (el desglose puede partir un concepto en dos renglones) y entre
           presentaciones se toma la mayor. */
        SELECT p.Mes, p.Concepto, Presentado = MAX(p.Importe)
        INTO #PresentadoConcepto
        FROM (SELECT Mes = m.MesImpacto, g.Concepto, m.Banco, m.NroArchivo, Importe = SUM(g.ImportePresentado)
              FROM #Movs m JOIN #Desglose g ON g.IdMovimiento = m.Id
              WHERE m.EsManual = 0 AND m.MesImpacto IS NOT NULL
              GROUP BY m.MesImpacto, g.Concepto, m.Banco, m.NroArchivo) p
        GROUP BY p.Mes, p.Concepto;

        /* Meses con movimientos sin desglose: regla anterior. */
        SELECT Mes = MesImpacto, Presentado = SUM(MontoPesos)
        INTO #MesViejo
        FROM #Movs
        WHERE EsManual = 0 AND MesImpacto IS NOT NULL
          AND MesImpacto IN (SELECT MesImpacto FROM #Movs WHERE EsManual = 0 AND TieneDesglose = 0 AND MesImpacto IS NOT NULL)
        GROUP BY MesImpacto;

        UPDATE m
        SET m.Esperado = x.Presentado + x.Estimado,
            m.EsperadoEstimado = x.Estimado,
            m.Estimado = CASE WHEN x.Estimado > 0 THEN 1 ELSE 0 END
        FROM #Meses m
        CROSS APPLY (
            SELECT Presentado = ISNULL((SELECT SUM(pc.Presentado) FROM #PresentadoConcepto pc WHERE pc.Mes = m.Mes), 0),
                   Estimado   = ISNULL((SELECT SUM(v.Valor) FROM #Vigente v
                                        WHERE v.Mes = m.Mes
                                          AND NOT EXISTS (SELECT 1 FROM #PresentadoConcepto pc
                                                          WHERE pc.Mes = v.Mes AND pc.Concepto = v.Concepto)), 0)
        ) x
        WHERE NOT EXISTS (SELECT 1 FROM #MesViejo mv WHERE mv.Mes = m.Mes);

        UPDATE m SET m.Esperado = mv.Presentado, m.EsperadoEstimado = 0, m.Estimado = 0
        FROM #Meses m JOIN #MesViejo mv ON mv.Mes = m.Mes;

        DROP TABLE #Vigente; DROP TABLE #PresentadoConcepto; DROP TABLE #MesViejo;
    END

    DECLARE @TotalObligaciones DECIMAL(18,2) = ISNULL((SELECT SUM(Esperado) FROM #Meses), 0);
    DECLARE @CargosExtra       DECIMAL(18,2) = ISNULL((SELECT SUM(CargoExtra) FROM #Movs), 0);
    DECLARE @Cobertura         DECIMAL(18,2) = ISNULL((SELECT SUM(Cobertura) FROM #Movs), 0);
    DECLARE @Saldo             DECIMAL(18,2) = @TotalObligaciones + @CargosExtra - @Cobertura;

    /* ---------------- 1) Cabecera ---------------- */
    SELECT p.Id, p.NroSocio, p.Apellido, p.Nombre, p.NumeroDoc, p.Cuil, p.Estado,
           p.FechaAsociado, p.FechaServicio, p.FechaServicioAsistodo,
           UltimoPago = (SELECT MAX(FechaImpacto) FROM #Movs WHERE Cobertura > 0),
           UltimaRespuesta = (SELECT MAX(FechaModif) FROM #Movs WHERE Estado <> 'PENDIENTE' AND EsManual = 0)
    FROM dbo.Personas p WHERE p.Id = @IdPersona;

    /* ---------------- 2) Totales ---------------- */
    SELECT
        Movimientos      = (SELECT COUNT(*) FROM #Movs),
        Cobrados         = (SELECT COUNT(*) FROM #Movs WHERE Estado='COBRADO' AND EsManual=0),
        Rechazados       = (SELECT COUNT(*) FROM #Movs WHERE Estado='RECHAZADO'),
        Pendientes       = (SELECT COUNT(*) FROM #Movs WHERE Estado='PENDIENTE'),
        Manuales         = (SELECT COUNT(*) FROM #Movs WHERE EsManual=1),
        ImporteCobrado   = ISNULL((SELECT SUM(MontoPesos) FROM #Movs WHERE Estado='COBRADO' AND EsManual=0),0),
        ImporteRechazado = ISNULL((SELECT SUM(MontoPesos) FROM #Movs WHERE Estado='RECHAZADO'),0),
        ImportePendiente = ISNULL((SELECT SUM(MontoPesos) FROM #Movs WHERE Estado='PENDIENTE'),0),
        ObligacionMensual  = @ObligacionMensual,
        TotalObligaciones  = @TotalObligaciones,
        CargosExtra        = @CargosExtra,
        Cobertura          = @Cobertura,
        Saldo              = @Saldo,
        MesesCubiertos     = CASE WHEN @ObligacionMensual > 0
                                  THEN CAST(FLOOR(@Cobertura / @ObligacionMensual) AS INT) ELSE 0 END,
        MesesConObligacion = (SELECT COUNT(*) FROM #Meses WHERE Esperado > 0),
        MesesEstimados     = (SELECT COUNT(*) FROM #Meses WHERE Estimado = 1 AND Esperado > 0),
        ConceptosSinFecha  = @ConceptosSinFecha,
        MovimientosSinPeriodo = (SELECT COUNT(*) FROM #Movs WHERE MesImpacto IS NULL),
        /* Trazabilidad: cuanta plata entro sin poder decir de que concepto era. */
        MovimientosSinDesglose = @MovsSinDesglose,
        CoberturaSinConcepto   = @CoberturaSinConcepto,
        AlgunaConMora      = ISNULL((SELECT MAX(CASE WHEN SumarMora=1 THEN 1 ELSE 0 END) FROM #Movs),0);

    /* ---------------- 3) Conceptos ----------------
       Ahora cada concepto usa SU propia plata: la cobertura sale del desglose,
       no de repartir el total. */
    SELECT
        c.Concepto, c.Etiqueta, c.PlanId, c.PlanNombre, c.ValorMensual,
        c.FechaInicio, c.CuotasDelPlan,
        SinFechaInicio  = CASE WHEN c.FechaInicio IS NULL THEN 1 ELSE 0 END,
        CuotasEsperadas = c.MesesEsperados,
        CoberturaDelConcepto = ISNULL(c.Cobertura, 0),
        CuotasCubiertas = CASE WHEN c.MesesEsperados IS NULL OR c.ValorMensual <= 0 THEN NULL
                               ELSE CASE WHEN CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) > c.MesesEsperados
                                         THEN c.MesesEsperados
                                         ELSE CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) END END,
        CuotasVencidas  = CASE WHEN c.MesesEsperados IS NULL OR c.ValorMensual <= 0 THEN NULL
                               ELSE CASE WHEN c.MesesEsperados - CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) > 0
                                         THEN c.MesesEsperados - CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT)
                                         ELSE 0 END END,
        CuotasAdelantadas = CASE WHEN c.MesesEsperados IS NULL OR c.ValorMensual <= 0 THEN NULL
                                 ELSE CASE WHEN CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) - c.MesesEsperados > 0
                                           THEN CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) - c.MesesEsperados
                                           ELSE 0 END END,
        ProximoPeriodo = CASE
            WHEN c.FechaInicio IS NULL OR c.ValorMensual <= 0 THEN NULL
            WHEN ISNULL(c.CuotasDelPlan,0) > 0
                 AND CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) >= c.CuotasDelPlan THEN NULL
            ELSE DATEADD(MONTH, CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT),
                         DATEFROMPARTS(YEAR(c.FechaInicio), MONTH(c.FechaInicio), 1)) END,
        ImporteProximaCuota = CASE
            WHEN c.FechaInicio IS NULL OR c.ValorMensual <= 0 THEN NULL
            WHEN ISNULL(c.CuotasDelPlan,0) > 0
                 AND CAST(FLOOR(ISNULL(c.Cobertura,0) / c.ValorMensual) AS INT) >= c.CuotasDelPlan THEN NULL
            ELSE c.ValorMensual END,
        DeudaDelConcepto = CASE WHEN c.MesesEsperados IS NULL OR c.ValorMensual <= 0 THEN NULL
                                ELSE CASE WHEN c.MesesEsperados * c.ValorMensual + ISNULL(c.CargoExtra,0) - ISNULL(c.Cobertura,0) > 0
                                          THEN c.MesesEsperados * c.ValorMensual + ISNULL(c.CargoExtra,0) - ISNULL(c.Cobertura,0)
                                          ELSE 0 END END
    FROM #Conceptos c
    ORDER BY CASE c.Concepto WHEN 'CUOTA_SOCIAL' THEN 1 WHEN 'SERVICIO' THEN 2 ELSE 3 END;

    /* ---------------- 4) Calendario ---------------- */
    SELECT m.Mes, m.Esperado, m.Estimado, m.EsperadoEstimado,
        Movimientos = ISNULL(v.Movimientos, 0), Cobrados = ISNULL(v.Cobrados, 0),
        Rechazados = ISNULL(v.Rechazados, 0), Pendientes = ISNULL(v.Pendientes, 0),
        Manuales = ISNULL(v.Manuales, 0), Cubierto = ISNULL(v.Cubierto, 0),
        EsParcial = CASE WHEN ISNULL(v.Cobrados,0) > 0
                          AND ISNULL(v.Rechazados,0) + ISNULL(v.Pendientes,0) > 0
                         THEN 1 ELSE 0 END
    FROM #Meses m
    LEFT JOIN (
        SELECT MesImpacto, Movimientos = COUNT(*),
               Cobrados   = SUM(CASE WHEN Estado='COBRADO' AND EsManual=0 THEN 1 ELSE 0 END),
               Rechazados = SUM(CASE WHEN Estado='RECHAZADO' THEN 1 ELSE 0 END),
               Pendientes = SUM(CASE WHEN Estado='PENDIENTE' THEN 1 ELSE 0 END),
               Manuales   = SUM(CASE WHEN EsManual=1 THEN 1 ELSE 0 END),
               Cubierto   = SUM(Cobertura)
        FROM #Movs WHERE MesImpacto IS NOT NULL GROUP BY MesImpacto) v ON v.MesImpacto = m.Mes
    WHERE m.Esperado > 0 OR v.Movimientos > 0
    ORDER BY m.Mes DESC;

    /* ---------------- 5) Movimientos ---------------- */
    SELECT v.Id, v.Banco, v.MontoPesos, v.PresentacionId_Det, v.FechaImpacto,
           v.Resultado, v.Estado, v.NroArchivo, v.TipoImporte, v.SumarMora,
           v.EsManual, v.TipoMovimiento, v.Concepto, v.PeriodoCubierto, v.Motivo,
           v.IdMovimientoOrigen, v.Cobertura, v.CargoExtra, v.TieneDesglose,
           Usuario = u.Usuario, v.FechaInsert, v.FechaModif,
           UsuarioGenero = ug.Usuario, v.FechaGeneracion
    FROM #Movs v
    LEFT JOIN dbo.Usuarios u ON u.Id = v.UsuarioId
    LEFT JOIN dbo.Usuarios ug ON ug.Id = v.UsuarioGenera
    ORDER BY v.FechaImpacto DESC, v.EsManual, v.Banco, v.Id;

    /* ---------------- 6) Desglose por concepto ---------------- */
    SELECT d.Id, d.IdMovimiento, d.Banco, d.NroArchivo, d.PresentacionId_Det,
           d.Concepto, d.PlanId, d.NumeroCuota, d.CantidadCuotas, d.PeriodoObligacion,
           d.ImporteTeorico, d.ImportePresentado, d.ImporteCobrado, d.ImporteRechazado,
           d.ImportePendiente, d.Origen, d.Motivo, d.Estado, d.FechaGeneracion,
           PlanNombre = COALESCE(cs.Nombre, se.Nombre, az.Nombre)
    FROM #Desglose d
    LEFT JOIN dbo.TipoPlanesCs        cs ON d.Concepto = 'CUOTA_SOCIAL' AND cs.Id = d.PlanId
    LEFT JOIN dbo.TipoPlanesServicios se ON d.Concepto = 'SERVICIO'     AND se.Id = d.PlanId
    LEFT JOIN dbo.TipoPlanesAsistodo  az ON d.Concepto = 'ASISTODO'     AND az.Id = d.PlanId
    ORDER BY d.PeriodoObligacion DESC, d.Concepto, d.Id;

    DROP TABLE #Movs; DROP TABLE #Desglose; DROP TABLE #Conceptos; DROP TABLE #Meses;
END


