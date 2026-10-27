/* ===========================================================================
   BAPRO
   =========================================================================== */
CREATE   PROCEDURE [dbo].[InsertarPresentacionBaproAuditoria]
    @TipoExportacion        VARCHAR(50),
    @TipoImporte            VARCHAR(50),
    @NumeroOperacionInicial INT,
    @Token                  VARCHAR(50),
    @Detalles               PresentacionBaproDetalleType READONLY,
    @NroArchivo             INT OUTPUT,
    @NombreArchivo          VARCHAR(200),
    @IdCorrida              UNIQUEIDENTIFIER = NULL,
    @Desglose               dbo.DesgloseConceptoType READONLY,
    @YaExistia              BIT = 0 OUTPUT,
    @NroArchivoSolicitado   INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @YaExistia = 0;

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @IdCorrida IS NOT NULL
        BEGIN
            SELECT TOP 1 @NroArchivo = NroArchivo
            FROM dbo.PresentacionBaproAuditoria WITH (UPDLOCK, HOLDLOCK)
            WHERE IdCorrida = @IdCorrida
            ORDER BY Id;

            IF @NroArchivo IS NOT NULL
            BEGIN
                SET @YaExistia = 1;
                COMMIT TRANSACTION;
                RETURN 0;
            END
        END

        DECLARE @IdUsuario INT = dbo.ObtenerIdUsuarioPorToken(@Token);

        /* Numero de lista elegido por el usuario (2026-10-12). Se REVALIDA aca,
           con el candado tomado: la validacion de la pantalla es solo una ayuda y
           no impide que dos usuarios usen el mismo numero. Sin numero elegido
           (NULL, el caso de siempre y el de la importacion) sigue la numeracion
           automatica de siempre: MAX + 1. */
        IF @NroArchivoSolicitado IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.PresentacionBaproAuditoria WITH (UPDLOCK, HOLDLOCK)
                       WHERE NroArchivo = @NroArchivoSolicitado)
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('NUMERO_LISTA_OCUPADO: el numero de lista %d ya fue utilizado. No se aplico ningun cambio.', 16, 1, @NroArchivoSolicitado);
                RETURN 1;
            END

            SET @NroArchivo = @NroArchivoSolicitado;
        END
        ELSE
        SELECT @NroArchivo = ISNULL(MAX(NroArchivo), 0) + 1
        FROM dbo.PresentacionBaproAuditoria WITH (UPDLOCK, HOLDLOCK);

        INSERT INTO dbo.PresentacionBaproAuditoria (
            NroArchivo, CodigoInterno, FechaVencimiento, IdentificadorCliente, TipoDato,
            Bloque1CBU, Bloque2CBU, Importe, CuitEmpresa, DescripcionTransaccion,
            ReferenciaDebito, NuevoIdentificadorCliente, CodigoRespuesta, NombreEmpresa,
            ComunicacionEntes, IdPersona, NumeroOperacion, TipoExportacion,
            TipoImporte, NombreArchivo, FechaGeneracion, UsuarioId, IdCorrida)
        SELECT
            @NroArchivo, CodigoInterno, FechaVencimiento, IdentificadorCliente, TipoDato,
            Bloque1CBU, Bloque2CBU, Importe, CuitEmpresa, DescripcionTransaccion,
            ReferenciaDebito, NuevoIdentificadorCliente, CodigoRespuesta, NombreEmpresa,
            ComunicacionEntes, IdPersona, NumeroOperacion, @TipoExportacion,
            @TipoImporte, @NombreArchivo, GETDATE(), @IdUsuario, @IdCorrida
        FROM @Detalles;

        INSERT INTO dbo.PersonasRepositorio
            (IdPersona, Banco, Monto, PresentacionId_Det, FechaImpacto, RespuestaId,
             Resultado, FechaInsert, FechaModif)
        SELECT pd.IdPersona, 'BAPRO', pd.Importe, pd.Id, fx.FechaImpacto,
               NULL, NULL, GETDATE(), NULL
        FROM dbo.PresentacionBaproAuditoria pd
        CROSS APPLY (SELECT NULLIF(LTRIM(RTRIM(pd.FechaVencimiento)), '') AS FechaLimpia) a
        CROSS APPLY (
            SELECT TRY_CONVERT(DATETIME,
                CASE WHEN a.FechaLimpia IS NULL THEN NULL
                     WHEN LEN(a.FechaLimpia) = 8
                          THEN SUBSTRING(a.FechaLimpia,5,4) + SUBSTRING(a.FechaLimpia,3,2) + SUBSTRING(a.FechaLimpia,1,2)
                     ELSE NULL END, 112) AS FechaImpacto) fx
        WHERE pd.NroArchivo = @NroArchivo;

        /* ---- Desglose por concepto ---- */
        IF EXISTS (SELECT 1 FROM @Desglose)
        BEGIN
            /* Rendimiento: el TVP se estima en 1 fila; con #Desglose indexado el join
               por NumeroOperacion deja de ser cuadratico (22.772 renglones: 49 s -> segundos). */
            SELECT * INTO #Desglose FROM @Desglose;
            CREATE CLUSTERED INDEX IX_Desglose_NumeroOperacion ON #Desglose (NumeroOperacion);

            IF EXISTS (
                SELECT 1
                FROM dbo.PresentacionBaproAuditoria pd
                LEFT JOIN (SELECT NumeroOperacion, Suma = SUM(ImportePresentado)
                           FROM #Desglose GROUP BY NumeroOperacion) g
                       ON g.NumeroOperacion = pd.NumeroOperacion
                WHERE pd.NroArchivo = @NroArchivo
                  AND ABS(ISNULL(g.Suma, 0) - (TRY_CAST(pd.Importe AS DECIMAL(18,2)) / 100.0)) > 0.005)
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('El desglose por concepto no coincide con el importe de algun renglon. No se genero la presentacion.', 16, 1);
                RETURN 1;
            END

            INSERT INTO dbo.CuentaCorrienteDesglose
                (IdPersona, Banco, NroArchivo, PresentacionId_Det, IdMovimiento, Concepto,
                 PlanId, NumeroCuota, CantidadCuotas, PeriodoObligacion,
                 ImporteTeorico, ImportePresentado, FechaGeneracion, Origen, UsuarioId)
            SELECT pd.IdPersona, 'BAPRO', @NroArchivo, pd.Id, pr.Id, d.Concepto,
                   ISNULL(d.PlanId, fc.PlanId),
                   ISNULL(d.NumeroCuota, fc.NumeroCuota),
                   ISNULL(d.CantidadCuotas, fc.CantidadCuotas),
                   per.Periodo,
                   ISNULL(d.ImporteTeorico, fc.ImporteTeorico),
                   d.ImportePresentado, GETDATE(), 'BANCARIO', @IdUsuario
            FROM #Desglose d
            JOIN dbo.PresentacionBaproAuditoria pd
                 ON pd.NroArchivo = @NroArchivo AND pd.NumeroOperacion = d.NumeroOperacion
            LEFT JOIN dbo.PersonasRepositorio pr
                 ON pr.Banco = 'BAPRO' AND pr.PresentacionId_Det = pd.Id
            CROSS APPLY (SELECT Periodo = ISNULL(d.PeriodoObligacion,
                         DATEFROMPARTS(YEAR(pr.FechaImpacto), MONTH(pr.FechaImpacto), 1))) per
            OUTER APPLY dbo.fnDatosDeConcepto(pd.IdPersona, d.Concepto, per.Periodo) fc;
        END

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
