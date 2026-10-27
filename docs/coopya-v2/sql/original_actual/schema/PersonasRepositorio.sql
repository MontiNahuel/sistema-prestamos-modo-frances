-- ===========================================================================
-- Tabla: dbo.PersonasRepositorio
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PersonasRepositorio', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PersonasRepositorio] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [IdPersona]                         int                NULL,
        [Banco]                             varchar(50)        NULL,
        [Monto]                             varchar(20)        NULL,
        [PresentacionId_Det]                int                NULL,
        [FechaImpacto]                      datetime           NULL,
        [RespuestaId]                       int                NULL,
        [Resultado]                         varchar(max)       NULL,
        [FechaInsert]                       datetime           NULL,
        [FechaModif]                        datetime           NULL,
        [TipoMovimiento]                    varchar(20)        NULL,
        [Concepto]                          varchar(20)        NULL,
        [PeriodoCubierto]                   date               NULL,
        [Motivo]                            varchar(500)       NULL,
        [UsuarioId]                         int                NULL,
        [IdMovimientoOrigen]                int                NULL,
        CONSTRAINT [CK_PersonasRepositorio_Concepto] CHECK ([Concepto] IS NULL OR ([Concepto]='ASISTODO' OR [Concepto]='SERVICIO' OR [Concepto]='CUOTA_SOCIAL')),
        CONSTRAINT [CK_PersonasRepositorio_ManualConMotivo] CHECK ([TipoMovimiento] IS NULL OR [Motivo] IS NOT NULL AND ltrim(rtrim([Motivo]))<>''),
        CONSTRAINT [CK_PersonasRepositorio_MontoNumerico] CHECK ([Monto] IS NULL OR NOT [Monto] like '%[^0-9]%'),
        CONSTRAINT [CK_PersonasRepositorio_TipoMovimiento] CHECK ([TipoMovimiento] IS NULL OR ([TipoMovimiento]='BONIFICACION' OR [TipoMovimiento]='CANCELACION_MORA' OR [TipoMovimiento]='AJUSTE_NEGATIVO' OR [TipoMovimiento]='AJUSTE_POSITIVO' OR [TipoMovimiento]='PAGO_MANUAL')),
        CONSTRAINT [PK__Personas__3214EC07C447D2EB] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PersonasRepositorio_Banco_PresentacionIdDet' AND object_id = OBJECT_ID('dbo.PersonasRepositorio'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PersonasRepositorio_Banco_PresentacionIdDet] ON [dbo].[PersonasRepositorio] ([Banco] ASC, [PresentacionId_Det] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PersonasRepositorio_IdPersona_FechaInsert' AND object_id = OBJECT_ID('dbo.PersonasRepositorio'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PersonasRepositorio_IdPersona_FechaInsert] ON [dbo].[PersonasRepositorio] ([IdPersona] ASC, [FechaInsert] DESC)
    INCLUDE ([Banco], [Monto], [PresentacionId_Det], [FechaImpacto], [RespuestaId], [Resultado], [FechaModif]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PersonasRepositorio_Banco_PresentacionIdDet' AND object_id = OBJECT_ID('dbo.PersonasRepositorio'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PersonasRepositorio_Banco_PresentacionIdDet] ON [dbo].[PersonasRepositorio] ([Banco] ASC, [PresentacionId_Det] ASC)
    WHERE ([PresentacionId_Det] IS NOT NULL);
END
GO
