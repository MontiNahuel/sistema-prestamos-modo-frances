-- ===========================================================================
-- Tabla: dbo.PresentacionNacionAuditoria
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionNacionAuditoria', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionNacionAuditoria] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [Cab_Casa]                          varchar(4)         NULL,
        [Cab_Producto]                      varchar(2)         NULL,
        [Cab_Cuenta]                        varchar(10)        NULL,
        [Cab_Moneda]                        varchar(1)         NULL,
        [Cab_Identificador]                 varchar(1)         NULL,
        [Cab_Secuencia]                     varchar(4)         NULL,
        [Cab_FechaTopeRendicion]            varchar(8)         NULL,
        [Cab_IndicadorLote]                 varchar(3)         NULL,
        [Pie_TotalDebitar]                  varchar(15)        NULL,
        [Pie_CantidadRegistros]             varchar(6)         NULL,
        [Pie_TotalNoAplicados]              varchar(15)        NULL,
        [Pie_CantidadNoAplicados]           varchar(6)         NULL,
        [TipoExportacion]                   varchar(50)        NULL,
        [TipoImporte]                       varchar(50)        NULL,
        [NombreArchivo]                     varchar(200)       NULL,
        [FechaGeneracion]                   datetime           NULL CONSTRAINT [DF__Presentac__Fecha__3B0BC30C] DEFAULT (getdate()),
        [UsuarioId]                         int                NULL,
        [IdCorrida]                         uniqueidentifier   NULL,
        [SumarMora]                         bit                NOT NULL CONSTRAINT [DF_PresNacionAud_SumarMora] DEFAULT ((1)),
        CONSTRAINT [PK__Presenta__3214EC072FF4735A] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NacionAuditoria_NroArchivo' AND object_id = OBJECT_ID('dbo.PresentacionNacionAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_NacionAuditoria_NroArchivo] ON [dbo].[PresentacionNacionAuditoria] ([NroArchivo] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresentacionNacionAuditoria_IdCorrida' AND object_id = OBJECT_ID('dbo.PresentacionNacionAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresentacionNacionAuditoria_IdCorrida] ON [dbo].[PresentacionNacionAuditoria] ([IdCorrida] ASC)
    WHERE ([IdCorrida] IS NOT NULL);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresentacionNacionAuditoria_NroArchivo' AND object_id = OBJECT_ID('dbo.PresentacionNacionAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresentacionNacionAuditoria_NroArchivo] ON [dbo].[PresentacionNacionAuditoria] ([NroArchivo] ASC);
END
GO
