
CREATE   PROCEDURE [dbo].[InsertarPresentacionNacionAuditoria]
    @Cab_Casa VARCHAR(4), @Cab_Producto VARCHAR(2), @Cab_Cuenta VARCHAR(10),
    @Cab_Moneda VARCHAR(1), @Cab_Identificador VARCHAR(1), @Cab_Secuencia VARCHAR(4),
    @Cab_FechaTopeRendicion VARCHAR(8), @Cab_IndicadorLote VARCHAR(3),
    @Pie_TotalDebitar VARCHAR(15), @Pie_CantidadRegistros VARCHAR(6),
    @Pie_TotalNoAplicados VARCHAR(15), @Pie_CantidadNoAplicados VARCHAR(6),
    @TipoExportacion VARCHAR(50), @TipoImporte VARCHAR(50), @NombreArchivo VARCHAR(200),
    @Token VARCHAR(50), @Detalles PresentacionNacionDetalleType READONLY,
    @NroArchivo INT OUTPUT,
    @IdCorrida UNIQUEIDENTIFIER = NULL,
    @Desglose dbo.DesgloseConceptoType READONLY,
    @RutaArchivo VARCHAR(500) = NULL,
    @NombreArchivoExterno VARCHAR(200) = NULL,
    @YaExistia BIT = 0 OUTPUT,
    @NroArchivoSolicitado   INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @YaExistia = 0;

    BEGIN TRANSACTION;
    BEGIN TRY
        /* Serializacion por archivo externo. Sin esto, dos importaciones
           simultaneas del mismo archivo pasan las dos cualquier verificacion
           previa y generan dos presentaciones. */
        IF @NombreArchivoExterno IS NOT NULL
        BEGIN
            DECLARE @Recurso NVARCHAR(200) = N'ImportacionNacion:' + @NombreArchivoExterno;
            DECLARE @Lock INT;
            EXEC @Lock = sp_getapplock @Resource = @Recurso, @LockMode = 'Exclusive',
                                       @LockOwner = 'Transaction', @LockTimeout = 15000;
            IF @Lock < 0
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('Otro proceso esta importando el archivo %s en este momento. No se aplico ningun cambio.', 16, 1, @NombreArchivoExterno);
                RETURN 1;
            END

            /* Reverificacion ya con el candado tomado. */
            IF EXISTS (SELECT 1 FROM dbo.PresentacionNacionArchivos
                       WHERE Tipo = 'Externa' AND NombreArchivo = @NombreArchivoExterno)
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('El archivo %s ya fue importado. No se aplico ningun cambio: importarlo de nuevo cobraria dos veces la misma obligacion.', 16, 1, @NombreArchivoExterno);
                RETURN 1;
            END
        END

        IF @IdCorrida IS NOT NULL
        BEGIN
            SELECT @NroArchivo = NroArchivo
            FROM dbo.PresentacionNacionAuditoria WITH (UPDLOCK, HOLDLOCK)
            WHERE IdCorrida = @IdCorrida;

            IF @NroArchivo IS NOT NULL
            BEGIN
                SET @YaExistia = 1;
                COMMIT TRANSACTION;
                RETURN 0;
            END
        END

        DECLARE @IdUsuario INT = dbo.ObtenerIdUsuarioPorToken(@Token);
        DECLARE @FechaTopeRendicion DATETIME =
            TRY_CONVERT(DATETIME, NULLIF(LTRIM(RTRIM(@Cab_FechaTopeRendicion)), ''), 112);

        /* Numero de lista elegido por el usuario (2026-10-12). Se REVALIDA aca,
           con el candado tomado: la validacion de la pantalla es solo una ayuda y
           no impide que dos usuarios usen el mismo numero. Sin numero elegido
           (NULL, el caso de siempre y el de la importacion) sigue la numeracion
           automatica de siempre: MAX + 1. */
        IF @NroArchivoSolicitado IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.PresentacionNacionAuditoria WITH (UPDLOCK, HOLDLOCK)
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
        FROM dbo.PresentacionNacionAuditoria WITH (UPDLOCK, HOLDLOCK);

        DECLARE @IdAuditoria INT;

        INSERT INTO dbo.PresentacionNacionAuditoria (
            NroArchivo, Cab_Casa, Cab_Producto, Cab_Cuenta, Cab_Moneda,
            Cab_Identificador, Cab_Secuencia, Cab_FechaTopeRendicion, Cab_IndicadorLote,
            Pie_TotalDebitar, Pie_CantidadRegistros, Pie_TotalNoAplicados, Pie_CantidadNoAplicados,
            TipoExportacion, TipoImporte, NombreArchivo, FechaGeneracion, UsuarioId, IdCorrida)
        VALUES (
            @NroArchivo, @Cab_Casa, @Cab_Producto, @Cab_Cuenta, @Cab_Moneda,
            @Cab_Identificador, @Cab_Secuencia, @Cab_FechaTopeRendicion, @Cab_IndicadorLote,
            @Pie_TotalDebitar, @Pie_CantidadRegistros, @Pie_TotalNoAplicados, @Pie_CantidadNoAplicados,
            @TipoExportacion, @TipoImporte, @NombreArchivo, GETDATE(), @IdUsuario, @IdCorrida);

        SET @IdAuditoria = SCOPE_IDENTITY();

        INSERT INTO dbo.PresentacionNacionAuditoriaDetalle (
            IdAuditoria, Det_SucursalCuentaCliente, Det_SistemaCuenta,
            Det_NroCuentaCliente, Det_Importe, Det_FechaVencimiento,
            Det_Estado, Det_DescripcionRechazo, Det_ConceptoDebito,
            IdPersona, NumeroOperacion)
        SELECT
            @IdAuditoria, d.Det_SucursalCuentaCliente, d.Det_SistemaCuenta,
            d.Det_NroCuentaCliente, d.Det_Importe, @Cab_FechaTopeRendicion,
            d.Det_Estado, d.Det_DescripcionRechazo, d.Det_ConceptoDebito,
            COALESCE(d.IdPersona, (
                SELECT TOP 1 mp.IdPersona FROM dbo.MediosDePago mp
                WHERE mp.Tipo = 2 AND SUBSTRING(mp.Valor, 11, 11) = d.Det_NroCuentaCliente)),
            d.NumeroOperacion
        FROM @Detalles d;

        INSERT INTO dbo.PersonasRepositorio
            (IdPersona, Banco, Monto, PresentacionId_Det, FechaImpacto, RespuestaId,
             Resultado, FechaInsert, FechaModif)
        SELECT pd.IdPersona, 'NACION', pd.Det_Importe, pd.Id, @FechaTopeRendicion,
               NULL, NULL, GETDATE(), NULL
        FROM dbo.PresentacionNacionAuditoriaDetalle pd
        WHERE pd.IdAuditoria = @IdAuditoria;

        /* ---- Desglose por concepto ---- */
        IF EXISTS (SELECT 1 FROM @Desglose)
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM dbo.PresentacionNacionAuditoriaDetalle pd
                LEFT JOIN (SELECT NumeroOperacion, Suma = SUM(ImportePresentado)
                           FROM @Desglose GROUP BY NumeroOperacion) g
                       ON g.NumeroOperacion = pd.NumeroOperacion
                WHERE pd.IdAuditoria = @IdAuditoria
                  AND ABS(ISNULL(g.Suma, 0) - (TRY_CAST(pd.Det_Importe AS DECIMAL(18,2)) / 100.0)) > 0.005)
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('El desglose por concepto no coincide con el importe de algun renglon. No se genero la presentacion.', 16, 1);
                RETURN 1;
            END

            INSERT INTO dbo.CuentaCorrienteDesglose
                (IdPersona, Banco, NroArchivo, PresentacionId_Det, IdMovimiento, Concepto,
                 PlanId, NumeroCuota, CantidadCuotas, PeriodoObligacion,
                 ImporteTeorico, ImportePresentado, FechaGeneracion, Origen, UsuarioId)
            SELECT pd.IdPersona, 'NACION', @NroArchivo, pd.Id, pr.Id, d.Concepto,
                   ISNULL(d.PlanId, fc.PlanId),
                   ISNULL(d.NumeroCuota, fc.NumeroCuota),
                   ISNULL(d.CantidadCuotas, fc.CantidadCuotas),
                   per.Periodo,
                   ISNULL(d.ImporteTeorico, fc.ImporteTeorico),
                   d.ImportePresentado, GETDATE(), 'BANCARIO', @IdUsuario
            FROM @Desglose d
            JOIN dbo.PresentacionNacionAuditoriaDetalle pd
                 ON pd.IdAuditoria = @IdAuditoria AND pd.NumeroOperacion = d.NumeroOperacion
            LEFT JOIN dbo.PersonasRepositorio pr
                 ON pr.Banco = 'NACION' AND pr.PresentacionId_Det = pd.Id
            CROSS APPLY (SELECT Periodo = ISNULL(d.PeriodoObligacion,
                         DATEFROMPARTS(YEAR(@FechaTopeRendicion), MONTH(@FechaTopeRendicion), 1))) per
            OUTER APPLY dbo.fnDatosDeConcepto(pd.IdPersona, d.Concepto, per.Periodo) fc;
        END

        /* ---- Marca del archivo, DENTRO de la transaccion ---- */
        IF @RutaArchivo IS NOT NULL AND LTRIM(RTRIM(@RutaArchivo)) <> ''
            INSERT INTO dbo.PresentacionNacionArchivos
                (NroArchivo, Ruta, Tipo, FechaCarga, UsuarioId, NombreArchivo)
            VALUES (@NroArchivo, @RutaArchivo, 'Externa', GETDATE(), @IdUsuario, @NombreArchivoExterno);

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
