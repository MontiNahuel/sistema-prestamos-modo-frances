-- ===========================================================================
-- Tabla: dbo.PresentacionComercioAuditoria
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionComercioAuditoria', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionComercioAuditoria] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [NumeroOperacion]                   int                NOT NULL,
        [CBU]                               varchar(22)        NOT NULL,
        [FechaVencimiento]                  varchar(8)         NULL,
        [NombreCliente]                     varchar(40)        NULL,
        [Importe]                           varchar(10)        NOT NULL,
        [IdPersona]                         int                NULL,
        [TipoExportacion]                   varchar(50)        NULL,
        [TipoImporte]                       varchar(50)        NULL,
        [NombreArchivo]                     varchar(200)       NULL,
        [FechaGeneracion]                   datetime           NULL,
        [UsuarioId]                         int                NULL,
        [IdCorrida]                         uniqueidentifier   NULL,
        [SumarMora]                         bit                NOT NULL CONSTRAINT [DF_PresComercioAud_SumarMora] DEFAULT ((0)),
        [CodigoRespuesta]                   varchar(1)         NULL,
        [DescRechazo]                       varchar(50)        NULL,
        [Intento]                           int                NULL,
        [FechaRespuesta]                    datetime           NULL,
        CONSTRAINT [PK_PresentacionComercioAuditoria] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PresComercioAud_FechaGeneracion' AND object_id = OBJECT_ID('dbo.PresentacionComercioAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PresComercioAud_FechaGeneracion] ON [dbo].[PresentacionComercioAuditoria] ([FechaGeneracion] ASC)
    INCLUDE ([NroArchivo]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PresComercioAud_IdPersona' AND object_id = OBJECT_ID('dbo.PresentacionComercioAuditoria'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PresComercioAud_IdPersona] ON [dbo].[PresentacionComercioAuditoria] ([IdPersona] ASC)
    INCLUDE ([NroArchivo], [NumeroOperacion], [Importe], [CodigoRespuesta]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresComercioAud_IdCorrida' AND object_id = OBJECT_ID('dbo.PresentacionComercioAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresComercioAud_IdCorrida] ON [dbo].[PresentacionComercioAuditoria] ([IdCorrida] ASC, [NumeroOperacion] ASC)
    WHERE ([IdCorrida] IS NOT NULL);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PresComercioAud_NroArchivo_NumOp' AND object_id = OBJECT_ID('dbo.PresentacionComercioAuditoria'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_PresComercioAud_NroArchivo_NumOp] ON [dbo].[PresentacionComercioAuditoria] ([NroArchivo] ASC, [NumeroOperacion] ASC);
END
GO
