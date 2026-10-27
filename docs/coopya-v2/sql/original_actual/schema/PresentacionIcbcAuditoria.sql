-- ===========================================================================
-- Tabla: dbo.PresentacionIcbcAuditoria
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionIcbcAuditoria', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionIcbcAuditoria] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [Cab_TipoRegistro]                  varchar(1)         NULL,
        [Cab_CuitOriginante]                varchar(11)        NULL,
        [Cab_MonedaDebito]                  varchar(1)         NULL,
        [Cab_Prestacion]                    varchar(10)        NULL,
        [Cab_FechaVencimiento]              varchar(8)         NULL,
        [Pie_TipoRegistro]                  varchar(1)         NULL,
        [Pie_CantidadRegistros]             varchar(8)         NULL,
        [Pie_SumatoriaMontosIndividuales]   varchar(14)        NULL,
        [NombreArchivo]                     varchar(200)       NULL,
        [FechaGeneracion]                   datetime           NULL CONSTRAINT [DF__Presentac__Fecha__245D67DE] DEFAULT (getdate()),
        [TipoExportacion]                   varchar(50)        NULL,
        [NumeroOperacionInicial]            int                NULL,
        [UsuarioId]                         int                NULL,
        [ReferenciaDeb]                     int                NULL,
        [TipoImporte]                       varchar(50)        NULL,
        [IdCorrida]                         uniqueidentifier   NULL,
        [SumarMora]                         bit                NOT NULL CONSTRAINT [DF_PresIcbcAud_SumarMora] DEFAULT ((1)),
        CONSTRAINT [PK__Presenta__3214EC07EBF60EAF] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Auditoria_NroArchivo' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Auditoria_NroArchivo] ON [dbo].[PresentacionIcbcAuditoria] ([NroArchivo] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresentacionIcbcAuditoria_IdCorrida' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresentacionIcbcAuditoria_IdCorrida] ON [dbo].[PresentacionIcbcAuditoria] ([IdCorrida] ASC)
    WHERE ([IdCorrida] IS NOT NULL);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresentacionIcbcAuditoria_NroArchivo' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresentacionIcbcAuditoria_NroArchivo] ON [dbo].[PresentacionIcbcAuditoria] ([NroArchivo] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresentacionIcbcAuditoria_ReferenciaDeb' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresentacionIcbcAuditoria_ReferenciaDeb] ON [dbo].[PresentacionIcbcAuditoria] ([ReferenciaDeb] ASC)
    WHERE ([ReferenciaDeb] IS NOT NULL);
END
GO
