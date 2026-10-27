
CREATE   PROCEDURE [dbo].[ImputarRespuestaBaproLote]
    @NroArchivo     INT,
    @Respuestas     dbo.RespuestaBaproImputacionType READONLY,
    @RutaArchivo    NVARCHAR(500) = NULL,   -- marca de idempotencia, dentro de la transacción
    @Token          NVARCHAR(100) = NULL,   -- el SP resuelve el usuario
    @Actualizados   INT OUTPUT,
    @YaTenian       INT OUTPUT,
    @NoEncontrados  INT OUTPUT,
    @Ambiguos       INT OUTPUT,
    @Mensaje        NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;      -- cualquier error de motor revierte la transacción entera

    SET @Actualizados = 0; SET @YaTenian = 0; SET @NoEncontrados = 0; SET @Ambiguos = 0;
    SET @Mensaje = N'';

    BEGIN TRANSACTION;
    BEGIN TRY

        /* ------------------------------------------------------------------
           0) SERIALIZACIÓN (concurrencia)
              Dos usuarios cargando la MISMA respuesta al mismo tiempo pasaban
              ambos la verificación previa del controller (consultar-y-después-
              escribir no es atómico) y entraban los dos a imputar.

              `sp_getapplock` con @LockOwner='Transaction' serializa por archivo:
              el segundo espera a que el primero termine y recién ahí evalúa, con
              lo que ve el estado ya imputado y no vuelve a imputar. El lock se
              libera solo al terminar la transacción (commit o rollback).

              Es la protección mínima suficiente: no hace falta tabla ni columna
              nueva, y el alcance es exactamente el recurso en disputa.
           ------------------------------------------------------------------ */
        DECLARE @Recurso NVARCHAR(100) = N'RespuestaBapro:' + CAST(@NroArchivo AS NVARCHAR(20));
        DECLARE @Lock INT;

        EXEC @Lock = sp_getapplock @Resource = @Recurso,
                                   @LockMode = 'Exclusive',
                                   @LockOwner = 'Transaction',
                                   @LockTimeout = 15000;   -- 15 s

        IF @Lock < 0
        BEGIN
            SET @Mensaje = N'Otro proceso esta importando la respuesta del archivo '
                + CAST(@NroArchivo AS NVARCHAR(10)) + N' en este momento. '
                + N'No se aplico ningun cambio. Reintentar en unos segundos.';
            ROLLBACK TRANSACTION;
            RETURN 2;   -- 2 = ocupado, distinto de 1 = error de datos
        END

        /* ------------------------------------------------------------------
           0 bis) IDEMPOTENCIA, ya con el lock tomado.
              La marca de "esta rendición ya se procesó" es la fila 'RESPUESTA'
              de PresentacionBaproArchivos. Se verificaba SÓLO en el controller
              antes de llamar, y se escribía DESPUÉS del commit desde otra
              conexión. Eso dejaba dos huecos:
                · si la escritura de la marca fallaba, la imputación ya estaba
                  confirmada y el sistema no sabía que el archivo ya se había
                  procesado, con lo que se podía volver a cargar;
                · consultar-y-después-escribir no es atómico.
              Ahora se reverifica acá adentro y la marca se escribe abajo, en
              esta misma transacción. Mismo criterio que Nación (script 11).
           ------------------------------------------------------------------ */
        IF EXISTS (SELECT 1 FROM dbo.PresentacionBaproArchivos
                   WHERE NroArchivo = @NroArchivo AND Tipo = 'RESPUESTA')
        BEGIN
            SET @Mensaje = N'La respuesta del archivo ' + CAST(@NroArchivo AS NVARCHAR(10))
                + N' ya fue procesada. No se aplico ningun cambio.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        /* ------------------------------------------------------------------
           1) Resolver, para cada renglón de la respuesta, cuántos movimientos
              de ESTA presentación le corresponden.
              La identidad de un renglón BAPRO es:
                 NroArchivo + ReferenciaDebito + IdentificadorCliente
              El IdentificadorCliente se compara como número porque el archivo
              lo rellena con ceros a la izquierda de forma inconsistente
              (en el archivo real conviven 12 y 14 dígitos).
           ------------------------------------------------------------------ */
        SELECT
            r.Orden,
            r.CodigoRespuesta,
            r.EsReversion,
            Coincidencias = COUNT(a.Id),
            IdUnico       = MIN(a.Id),
            CodigoActual  = MIN(a.CodigoRespuesta)
        INTO #Resolucion
        FROM @Respuestas r
        LEFT JOIN dbo.PresentacionBaproAuditoria a
               ON a.NroArchivo = @NroArchivo
              AND a.ReferenciaDebito = r.ReferenciaDebito
              AND TRY_CAST(a.IdentificadorCliente AS BIGINT) = TRY_CAST(r.IdentificadorCliente AS BIGINT)
        GROUP BY r.Orden, r.CodigoRespuesta, r.EsReversion;

        /* ------------------------------------------------------------------
           2) AMBIGUOS -> se aborta todo. No se imputa nada.
           ------------------------------------------------------------------ */
        SELECT @Ambiguos = COUNT(*) FROM #Resolucion WHERE Coincidencias > 1;

        IF @Ambiguos > 0
        BEGIN
            DECLARE @Ejemplos NVARCHAR(200) = (
                SELECT STUFF((SELECT TOP 5 ', ' + CAST(Orden AS VARCHAR(10))
                              FROM #Resolucion WHERE Coincidencias > 1
                              ORDER BY Orden FOR XML PATH('')), 1, 2, ''));

            SET @Mensaje = N'AMBIGUEDAD: ' + CAST(@Ambiguos AS NVARCHAR(10))
                + N' renglon(es) de la respuesta coinciden con mas de un movimiento de la '
                + N'presentacion ' + CAST(@NroArchivo AS NVARCHAR(10))
                + N' (lineas: ' + ISNULL(@Ejemplos, '') + N'). '
                + N'No se imputo NINGUN renglon. Corregir y volver a cargar el archivo.';

            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        /* No pertenecen a esta presentación: es lo esperado, no es error. */
        SELECT @NoEncontrados = COUNT(*) FROM #Resolucion WHERE Coincidencias = 0;

        /* ------------------------------------------------------------------
           3) Qué se puede imputar.
              Misma regla que ya existía: se actualiza si no tiene código previo,
              o si tenía 'OK' y llega una reversión.
           ------------------------------------------------------------------ */
        SELECT Orden, IdUnico, CodigoRespuesta
        INTO #Imputables
        FROM #Resolucion
        WHERE Coincidencias = 1
          AND ( CodigoActual IS NULL
                OR LTRIM(RTRIM(CodigoActual)) = ''
                OR (CodigoActual = 'OK' AND EsReversion = 1) );

        SELECT @YaTenian = COUNT(*)
        FROM #Resolucion
        WHERE Coincidencias = 1
          AND Orden NOT IN (SELECT Orden FROM #Imputables);

        /* ------------------------------------------------------------------
           4) Imputar: auditoría y Cuenta Corriente, en la misma transacción.
              Un renglón bancario = un movimiento (UX_PersonasRepositorio_...).
           ------------------------------------------------------------------ */
        UPDATE a
           SET a.CodigoRespuesta = i.CodigoRespuesta,
               a.FechaRespuesta  = GETDATE()
        FROM dbo.PresentacionBaproAuditoria a
        JOIN #Imputables i ON i.IdUnico = a.Id;

        SET @Actualizados = @@ROWCOUNT;

        UPDATE pr
           SET pr.RespuestaId = i.IdUnico,
               pr.Resultado   = i.CodigoRespuesta,
               pr.FechaModif  = GETDATE()
        FROM dbo.PersonasRepositorio pr
        JOIN #Imputables i ON i.IdUnico = pr.PresentacionId_Det
        WHERE pr.Banco = 'BAPRO';

        /* Marca de idempotencia, DENTRO de la transacción. La escritura del
           archivo en disco no puede ser transaccional y sigue afuera. */
        IF @RutaArchivo IS NOT NULL AND LTRIM(RTRIM(@RutaArchivo)) <> ''
        BEGIN
            DECLARE @IdUsuario INT = dbo.ObtenerIdUsuarioPorToken(@Token);
            INSERT INTO dbo.PresentacionBaproArchivos (NroArchivo, Ruta, Tipo, FechaCarga, UsuarioId)
            VALUES (@NroArchivo, @RutaArchivo, 'RESPUESTA', GETDATE(), @IdUsuario);
        END

        SET @Mensaje = N'OK: ' + CAST(@Actualizados AS NVARCHAR(10)) + N' imputados';
        IF @YaTenian > 0      SET @Mensaje += N', ' + CAST(@YaTenian AS NVARCHAR(10)) + N' ya tenian respuesta';
        IF @NoEncontrados > 0 SET @Mensaje += N', ' + CAST(@NoEncontrados AS NVARCHAR(10)) + N' de otras presentaciones (ignorados)';

        DROP TABLE #Resolucion; DROP TABLE #Imputables;

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @Mensaje = N'ERROR: ' + ERROR_MESSAGE() + N'. No se imputo ningun renglon.';
        RETURN 1;
    END CATCH
END
