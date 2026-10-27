-- ===========================================================================
-- Tabla: dbo.CuentaCorrienteDesglose
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.CuentaCorrienteDesglose', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CuentaCorrienteDesglose] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [IdPersona]                         int                NOT NULL,
        [Banco]                             varchar(20)        NOT NULL,
        [NroArchivo]                        int                NULL,
        [PresentacionId_Det]                int                NULL,
        [IdMovimiento]                      int                NOT NULL,
        [Concepto]                          varchar(30)        NOT NULL,
        [PlanId]                            int                NULL,
        [NumeroCuota]                       int                NULL,
        [CantidadCuotas]                    int                NULL,
        [PeriodoObligacion]                 date               NULL,
        [ImporteTeorico]                    decimal(18, 2)     NULL,
        [ImportePresentado]                 decimal(18, 2)     NOT NULL,
        [ImporteCobrado]                    decimal(18, 2)     NOT NULL CONSTRAINT [DF_CCDesglose_Cobrado] DEFAULT ((0)),
        [ImporteRechazado]                  decimal(18, 2)     NOT NULL CONSTRAINT [DF_CCDesglose_Rechazado] DEFAULT ((0)),
        [FechaGeneracion]                   datetime           NOT NULL CONSTRAINT [DF_CCDesglose_FechaGen] DEFAULT (getdate()),
        [FechaRespuesta]                    datetime           NULL,
        [Origen]                            varchar(20)        NOT NULL,
        [UsuarioId]                         int                NULL,
        [Motivo]                            varchar(500)       NULL,
        CONSTRAINT [CK_CCDesglose_Concepto] CHECK ([Concepto]='MORA_ASISTODO' OR [Concepto]='MORA_SERVICIO' OR [Concepto]='MORA_CUOTA_SOCIAL' OR [Concepto]='ASISTODO' OR [Concepto]='SERVICIO' OR [Concepto]='CUOTA_SOCIAL'),
        CONSTRAINT [CK_CCDesglose_ManualConMotivo] CHECK ([Origen]<>'MANUAL' OR [Motivo] IS NOT NULL AND ltrim(rtrim([Motivo]))<>''),
        CONSTRAINT [CK_CCDesglose_Origen] CHECK ([Origen]='MANUAL' OR [Origen]='BANCARIO'),
        CONSTRAINT [FK_CCDesglose_Movimiento] FOREIGN KEY ([IdMovimiento]) REFERENCES [dbo].[PersonasRepositorio] ([Id]),
        CONSTRAINT [PK_CuentaCorrienteDesglose] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CCDesglose_Archivo' AND object_id = OBJECT_ID('dbo.CuentaCorrienteDesglose'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CCDesglose_Archivo] ON [dbo].[CuentaCorrienteDesglose] ([Banco] ASC, [NroArchivo] ASC)
    INCLUDE ([Concepto], [ImportePresentado], [ImporteCobrado], [ImporteRechazado]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CCDesglose_Movimiento' AND object_id = OBJECT_ID('dbo.CuentaCorrienteDesglose'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CCDesglose_Movimiento] ON [dbo].[CuentaCorrienteDesglose] ([IdMovimiento] ASC)
    INCLUDE ([Concepto], [ImportePresentado], [PeriodoObligacion], [Origen]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CCDesglose_Persona' AND object_id = OBJECT_ID('dbo.CuentaCorrienteDesglose'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CCDesglose_Persona] ON [dbo].[CuentaCorrienteDesglose] ([IdPersona] ASC)
    INCLUDE ([Concepto], [ImportePresentado], [ImporteCobrado], [ImporteRechazado], [PeriodoObligacion]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CCDesglose_Renglon' AND object_id = OBJECT_ID('dbo.CuentaCorrienteDesglose'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CCDesglose_Renglon] ON [dbo].[CuentaCorrienteDesglose] ([Banco] ASC, [PresentacionId_Det] ASC);
END
GO
