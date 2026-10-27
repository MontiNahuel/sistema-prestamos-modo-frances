-- ===========================================================================
-- Tabla: dbo.PresentacionBaproAuditoria
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionBaproAuditoria', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionBaproAuditoria] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [CodigoInterno]                     varchar(2)         NULL,
        [FechaVencimiento]                  varchar(8)         NULL,
        [IdentificadorCliente]              varchar(22)        NULL,
        [TipoDato]                          varchar(1)         NULL,
        [Bloque1CBU]                        varchar(8)         NULL,
        [Bloque2CBU]                        varchar(14)        NULL,
        [Importe]                           varchar(10)        NULL,
        [CuitEmpresa]                       varchar(11)        NULL,
        [DescripcionTransaccion]            varchar(10)        NULL,
        [ReferenciaDebito]                  varchar(15)        NULL,
        [NuevoIdentificadorCliente]         varchar(22)        NULL,
        [CodigoRespuesta]                   varchar(3)         NULL,
        [NombreEmpresa]                     varchar(16)        NULL,
        [ComunicacionEntes]                 varchar(3)         NULL,
        [IdPersona]                         int                NULL,
        [NumeroOperacion]                   int                NULL,
        [TipoExportacion]                   varchar(50)        NULL,
        [TipoImporte]                       varchar(50)        NULL,
        [NombreArchivo]                     varchar(200)       NULL,
        [FechaGeneracion]                   datetime           NULL CONSTRAINT [DF__Presentac__Fecha__13F1F5EB] DEFAULT (getdate()),
        [UsuarioId]                         int                NULL,
        [FechaRespuesta]                    datetime           NULL,
        [IdCorrida]                         uniqueidentifier   NULL,
        [SumarMora]                         bit                NOT NULL CONSTRAINT [DF_PresBaproAud_SumarMora] DEFAULT ((1)),
        CONSTRAINT [PK__Presenta__3214EC07DAAB6A98] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BaproAuditoria_NroArchivo' AND object_id = OBJECT_ID('dbo.PresentacionBaproAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BaproAuditoria_NroArchivo] ON [dbo].[PresentacionBaproAuditoria] ([NroArchivo] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PresentacionBaproAuditoria_IdCorrida' AND object_id = OBJECT_ID('dbo.PresentacionBaproAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PresentacionBaproAuditoria_IdCorrida] ON [dbo].[PresentacionBaproAuditoria] ([IdCorrida] ASC)
    WHERE ([IdCorrida] IS NOT NULL);
END
GO
