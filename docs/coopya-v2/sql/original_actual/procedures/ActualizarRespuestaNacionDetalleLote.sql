

CREATE PROCEDURE [dbo].[ActualizarRespuestaNacionDetalleLote]
    @IdAuditoria INT,
    @FechaRespuesta DATETIME,
    @Respuestas dbo.RespuestaNacionDetalleType_Resp READONLY,
    @Actualizados INT OUTPUT,
    @YaTenian INT OUTPUT,
    @NoEncontrados INT OUTPUT,
    @Exitosos INT OUTPUT,
    @Rechazados INT OUTPUT,
    @SinRespuesta INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Inicializar
    SET @Actualizados = 0;
    SET @YaTenian = 0;
    SET @NoEncontrados = 0;
    SET @Exitosos = 0;
    SET @Rechazados = 0;
    SET @SinRespuesta = 0;

    DECLARE @TotalResp INT;
    SELECT @TotalResp = COUNT(*) FROM @Respuestas;

    -- ========== 1. CONTAR ESTADOS (directo del archivo) ==========
    SELECT 
        @Exitosos     = SUM(CASE WHEN CodigoRespuesta = '0' THEN 1 ELSE 0 END),
        @Rechazados   = SUM(CASE WHEN CodigoRespuesta = '9' THEN 1 ELSE 0 END),
        @SinRespuesta = SUM(CASE WHEN CodigoRespuesta NOT IN ('0','9') THEN 1 ELSE 0 END)
    FROM @Respuestas;

    -- ========== 2. NUMERAR RESPUESTAS Y DETALLES PARA MANEJAR DUPLICADOS ==========
    
    -- Numerar las respuestas: si vienen 2 iguales, una es Nro 1 y otra Nro 2
    SELECT 
        ROW_NUMBER() OVER (
            PARTITION BY Det_SucursalCuentaCliente, Det_SistemaCuenta, Det_NroCuentaCliente, Det_Importe 
            ORDER BY (SELECT NULL)
        ) AS Nro,
        Det_SucursalCuentaCliente,
        Det_SistemaCuenta,
        Det_NroCuentaCliente,
        Det_Importe,
        CodigoRespuesta
    INTO #Respuestas
    FROM @Respuestas;

    -- Numerar los detalles sin respuesta: si hay 2 iguales, uno es Nro 1 y otro Nro 2
    SELECT 
        ROW_NUMBER() OVER (
            PARTITION BY Det_SucursalCuentaCliente, Det_SistemaCuenta, Det_NroCuentaCliente, Det_Importe 
            ORDER BY Id
        ) AS Nro,
        Id,
        Det_SucursalCuentaCliente,
        Det_SistemaCuenta,
        Det_NroCuentaCliente,
        Det_Importe
    INTO #DetallesSinResp
    FROM PresentacionNacionAuditoriaDetalle
    WHERE IdAuditoria = @IdAuditoria
      AND CodigoRespuesta IS NULL;

    -- ========== 3. MATCHEAR POR POSICIÓN (Nro 1 con Nro 1, Nro 2 con Nro 2) ==========
    SELECT 
        d.Id AS IdDetalle,
        r.CodigoRespuesta
    INTO #ParaActualizar
    FROM #Respuestas r
    INNER JOIN #DetallesSinResp d
        ON d.Det_SucursalCuentaCliente = r.Det_SucursalCuentaCliente
       AND d.Det_SistemaCuenta = r.Det_SistemaCuenta
       AND d.Det_NroCuentaCliente = r.Det_NroCuentaCliente
       AND d.Det_Importe = r.Det_Importe
       AND d.Nro = r.Nro;  -- duplicado 1 con duplicado 1, duplicado 2 con duplicado 2

    -- ========== 4. HACER EL UPDATE ==========
    UPDATE det
    SET det.CodigoRespuesta = t.CodigoRespuesta,
        det.FechaRespuesta = @FechaRespuesta
    FROM PresentacionNacionAuditoriaDetalle det
    INNER JOIN #ParaActualizar t ON t.IdDetalle = det.Id;

    SET @Actualizados = @@ROWCOUNT;

	    UPDATE pr
    SET
        pr.RespuestaId = det.Id,
        pr.Resultado = det.CodigoRespuesta,
        pr.FechaModif = GETDATE()
    FROM dbo.PersonasRepositorio pr
    JOIN dbo.PresentacionNacionAuditoriaDetalle det
        ON det.Id = pr.PresentacionId_Det
    JOIN #ParaActualizar t
        ON t.IdDetalle = det.Id
    WHERE pr.Banco = 'NACION';

    -- ========== 5. CONTAR "YA TENÍAN" ==========
    SELECT @YaTenian = COUNT(*)
    FROM #Respuestas r
    WHERE NOT EXISTS (
        SELECT 1 FROM #ParaActualizar t
        INNER JOIN PresentacionNacionAuditoriaDetalle det ON det.Id = t.IdDetalle
        WHERE det.Det_SucursalCuentaCliente = r.Det_SucursalCuentaCliente
          AND det.Det_SistemaCuenta = r.Det_SistemaCuenta
          AND det.Det_NroCuentaCliente = r.Det_NroCuentaCliente
          AND det.Det_Importe = r.Det_Importe
          AND t.IdDetalle IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM PresentacionNacionAuditoriaDetalle
        WHERE IdAuditoria = @IdAuditoria
          AND Det_SucursalCuentaCliente = r.Det_SucursalCuentaCliente
          AND Det_SistemaCuenta = r.Det_SistemaCuenta
          AND Det_NroCuentaCliente = r.Det_NroCuentaCliente
          AND Det_Importe = r.Det_Importe
    );

    -- ========== 6. NO ENCONTRADOS ==========
    SET @NoEncontrados = @TotalResp - @Actualizados - @YaTenian;
    IF @NoEncontrados < 0 SET @NoEncontrados = 0;

    DROP TABLE #Respuestas;
    DROP TABLE #DetallesSinResp;
    DROP TABLE #ParaActualizar;
END

