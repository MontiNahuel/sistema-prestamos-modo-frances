
CREATE PROCEDURE [dbo].[ImputarRespuestaNacionLote]
    @NroArchivo      INT,
    @FechaRespuesta  DATETIME,
    @Respuestas      dbo.RespuestaNacionDetalleType_Resp READONLY,
    @RutaArchivo     NVARCHAR(500) = NULL,   -- marca de idempotencia, dentro de la transaccion
    @Token           NVARCHAR(100) = NULL,   -- el SP resuelve el usuario, como el resto del circuito
    @Actualizados    INT OUTPUT,
    @YaTenian        INT OUTPUT,
    @NoEncontrados   INT OUTPUT,
    @Exitosos        INT OUTPUT,
    @Rechazados      INT OUTPUT,
    @SinRespuesta    INT OUTPUT,
    @Ambiguos        INT OUTPUT,
    @Mensaje         NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Actualizados = 0; SET @YaTenian = 0; SET @NoEncontrados = 0;
    SET @Exitosos = 0; SET @Rechazados = 0; SET @SinRespuesta = 0; SET @Ambiguos = 0;
    SET @Mensaje = N'';

    DECLARE @TotalResp INT = (SELECT COUNT(*) FROM @Respuestas);

    /* Los conteos del archivo no dependen de la base: se calculan afuera de la
       transaccion y se informan aunque despues se revierta. */
    SELECT
        @Exitosos     = ISNULL(SUM(CASE WHEN CodigoRespuesta = '0' THEN 1 ELSE 0 END), 0),
        @Rechazados   = ISNULL(SUM(CASE WHEN CodigoRespuesta = '9' THEN 1 ELSE 0 END), 0),
        @SinRespuesta = ISNULL(SUM(CASE WHEN CodigoRespuesta NOT IN ('0','9') THEN 1 ELSE 0 END), 0)
    FROM @Respuestas;

    BEGIN TRANSACTION;
    BEGIN TRY

        /* -- 0) Serializacion por archivo ------------------------------------ */
        DECLARE @Recurso NVARCHAR(100) = N'RespuestaNacion:' + CAST(@NroArchivo AS NVARCHAR(20));
        DECLARE @Lock INT;

        EXEC @Lock = sp_getapplock @Resource = @Recurso,
                                   @LockMode = 'Exclusive',
                                   @LockOwner = 'Transaction',
                                   @LockTimeout = 15000;

        IF @Lock < 0
        BEGIN
            SET @Mensaje = N'Otro proceso esta cargando la respuesta del archivo '
                + CAST(@NroArchivo AS NVARCHAR(10)) + N' en este momento. '
                + N'No se aplico ningun cambio. Reintentar en unos segundos.';
            ROLLBACK TRANSACTION;
            RETURN 2;   -- 2 = ocupado (mismo codigo que BAPRO), 1 = error de datos
        END

        /* -- 1) Reverificacion de idempotencia, ya con el lock tomado --------- */
        IF EXISTS (SELECT 1 FROM dbo.PresentacionNacionArchivos
                   WHERE NroArchivo = @NroArchivo AND Tipo = 'RESPUESTA')
        BEGIN
            SET @Mensaje = N'La respuesta del archivo ' + CAST(@NroArchivo AS NVARCHAR(10))
                + N' ya fue procesada. No se aplico ningun cambio.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        /* -- 2) Auditoria de esta presentacion -------------------------------- */
        DECLARE @IdAuditoria INT =
            (SELECT TOP 1 Id FROM dbo.PresentacionNacionAuditoria WHERE NroArchivo = @NroArchivo);

        IF @IdAuditoria IS NULL
        BEGIN
            SET @Mensaje = N'No se encontro auditoria para NroArchivo '
                + CAST(@NroArchivo AS NVARCHAR(10)) + N'. No se aplico ningun cambio.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        /* -- 3) Cuantos detalles pendientes le corresponden a cada renglon -----
              La identidad de un renglon Nacion es
                 sucursal + sistema de cuenta + nro de cuenta + importe.
              Se agrupa la respuesta por esa clave para detectar el caso en que
              el mismo cliente aparece mas de una vez con codigos distintos. */
        SELECT
            r.Det_SucursalCuentaCliente,
            r.Det_SistemaCuenta,
            r.Det_NroCuentaCliente,
            r.Det_Importe,
            Renglones      = COUNT(*),
            CodigosDistintos = COUNT(DISTINCT r.CodigoRespuesta),
            CodigoUnico    = MIN(r.CodigoRespuesta)
        INTO #Claves
        FROM @Respuestas r
        GROUP BY r.Det_SucursalCuentaCliente, r.Det_SistemaCuenta,
                 r.Det_NroCuentaCliente, r.Det_Importe;

        SELECT
            d.Det_SucursalCuentaCliente,
            d.Det_SistemaCuenta,
            d.Det_NroCuentaCliente,
            d.Det_Importe,
            Pendientes = COUNT(*)
        INTO #Pendientes
        FROM dbo.PresentacionNacionAuditoriaDetalle d
        WHERE d.IdAuditoria = @IdAuditoria
          AND d.CodigoRespuesta IS NULL
        GROUP BY d.Det_SucursalCuentaCliente, d.Det_SistemaCuenta,
                 d.Det_NroCuentaCliente, d.Det_Importe;

        /* -- 4) Ambiguedad: mas de un candidato Y codigos que no coinciden ----- */
        SELECT @Ambiguos = COUNT(*)
        FROM #Claves c
        INNER JOIN #Pendientes p
            ON  p.Det_SucursalCuentaCliente = c.Det_SucursalCuentaCliente
            AND p.Det_SistemaCuenta         = c.Det_SistemaCuenta
            AND p.Det_NroCuentaCliente      = c.Det_NroCuentaCliente
            AND p.Det_Importe               = c.Det_Importe
        WHERE p.Pendientes > 1;   -- basta con no poder identificarlo univocamente

        IF @Ambiguos > 0
        BEGIN
            SET @Mensaje = N'La respuesta tiene ' + CAST(@Ambiguos AS NVARCHAR(10))
                + N' renglon(es) de la respuesta coinciden con MAS DE UN movimiento pendiente. '
                + N'El archivo de Nacion no trae identificador propio de la empresa, asi que '
                + N'no se puede decidir a cual imputar. '
                + N'No se aplico ningun cambio: corregir el archivo y reintentar.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        /* -- 5) Imputacion. Sin ambiguedad, todos los detalles de una misma
              clave reciben el mismo codigo, asi que el reparto es indistinto. */
        SELECT d.Id AS IdDetalle, c.CodigoUnico AS CodigoRespuesta
        INTO #ParaActualizar
        FROM dbo.PresentacionNacionAuditoriaDetalle d
        INNER JOIN #Claves c
            ON  c.Det_SucursalCuentaCliente = d.Det_SucursalCuentaCliente
            AND c.Det_SistemaCuenta         = d.Det_SistemaCuenta
            AND c.Det_NroCuentaCliente      = d.Det_NroCuentaCliente
            AND c.Det_Importe               = d.Det_Importe
        WHERE d.IdAuditoria = @IdAuditoria
          AND d.CodigoRespuesta IS NULL;

        UPDATE det
        SET det.CodigoRespuesta = t.CodigoRespuesta,
            det.FechaRespuesta  = @FechaRespuesta
        FROM dbo.PresentacionNacionAuditoriaDetalle det
        INNER JOIN #ParaActualizar t ON t.IdDetalle = det.Id;

        SET @Actualizados = @@ROWCOUNT;

        UPDATE pr
        SET pr.RespuestaId = det.Id,
            pr.Resultado   = det.CodigoRespuesta,
            pr.FechaModif  = GETDATE()
        FROM dbo.PersonasRepositorio pr
        INNER JOIN dbo.PresentacionNacionAuditoriaDetalle det
            ON det.Id = pr.PresentacionId_Det
        INNER JOIN #ParaActualizar t
            ON t.IdDetalle = det.Id
        WHERE pr.Banco = 'NACION';

        /* -- 6) Renglones que ya tenian respuesta y renglones ajenos ---------- */
        SELECT @YaTenian = ISNULL(SUM(c.Renglones), 0)
        FROM #Claves c
        WHERE NOT EXISTS (
                SELECT 1 FROM #Pendientes p
                WHERE p.Det_SucursalCuentaCliente = c.Det_SucursalCuentaCliente
                  AND p.Det_SistemaCuenta         = c.Det_SistemaCuenta
                  AND p.Det_NroCuentaCliente      = c.Det_NroCuentaCliente
                  AND p.Det_Importe               = c.Det_Importe)
          AND EXISTS (
                SELECT 1 FROM dbo.PresentacionNacionAuditoriaDetalle d
                WHERE d.IdAuditoria = @IdAuditoria
                  AND d.Det_SucursalCuentaCliente = c.Det_SucursalCuentaCliente
                  AND d.Det_SistemaCuenta         = c.Det_SistemaCuenta
                  AND d.Det_NroCuentaCliente      = c.Det_NroCuentaCliente
                  AND d.Det_Importe               = c.Det_Importe);

        SET @NoEncontrados = @TotalResp - @Actualizados - @YaTenian;
        IF @NoEncontrados < 0 SET @NoEncontrados = 0;

        /* -- 7) Marca de idempotencia, DENTRO de la transaccion ---------------
              La escritura del archivo en disco no puede ser transaccional y
              sigue afuera; lo que no puede quedar afuera es la marca de que
              este archivo ya fue procesado. */
        IF @RutaArchivo IS NOT NULL AND LTRIM(RTRIM(@RutaArchivo)) <> ''
        BEGIN
            DECLARE @UsuarioId INT = dbo.ObtenerIdUsuarioPorToken(@Token);
            INSERT INTO dbo.PresentacionNacionArchivos (NroArchivo, Ruta, Tipo, FechaCarga, UsuarioId)
            VALUES (@NroArchivo, @RutaArchivo, 'RESPUESTA', GETDATE(), @UsuarioId);
        END

        SET @Mensaje = N'Respuesta procesada: ' + CAST(@Actualizados AS NVARCHAR(10))
            + N' actualizados, ' + CAST(@Exitosos AS NVARCHAR(10)) + N' exitosos, '
            + CAST(@Rechazados AS NVARCHAR(10)) + N' rechazados, '
            + CAST(@NoEncontrados AS NVARCHAR(10)) + N' ajenos a esta presentacion.';

        DROP TABLE #Claves; DROP TABLE #Pendientes; DROP TABLE #ParaActualizar;

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @Actualizados = 0; SET @YaTenian = 0; SET @NoEncontrados = 0;
        SET @Mensaje = N'Error al imputar la respuesta: ' + ERROR_MESSAGE()
            + N' No se aplico ningun cambio.';
        RETURN 1;
    END CATCH
END
