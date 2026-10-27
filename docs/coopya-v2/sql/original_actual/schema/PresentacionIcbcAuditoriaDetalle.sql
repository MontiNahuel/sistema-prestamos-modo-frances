-- ===========================================================================
-- Tabla: dbo.PresentacionIcbcAuditoriaDetalle
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionIcbcAuditoriaDetalle', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionIcbcAuditoriaDetalle] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [IdAuditoria]                       int                NULL,
        [Det_TipoRegistro]                  varchar(1)         NULL,
        [Det_CodigoTransaccion]             varchar(4)         NULL,
        [Det_Bloque1CBU]                    varchar(8)         NULL,
        [Det_Bloque2CBU]                    varchar(14)        NULL,
        [Det_IdentificadorCliente]          varchar(22)        NULL,
        [Det_MontoDebito]                   varchar(10)        NULL,
        [Det_ReferenciaDebito]              varchar(15)        NULL,
        [Det_FechaVencimientoOriginal]      varchar(8)         NULL,
        [IdPersona]                         int                NULL,
        [NumeroOperacion]                   int                NULL,
        CONSTRAINT [PK__Presenta__3214EC07D2FA8A62] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditoriaDetalle_IdAuditoria' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoriaDetalle'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AuditoriaDetalle_IdAuditoria] ON [dbo].[PresentacionIcbcAuditoriaDetalle] ([IdAuditoria] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PresIcbcAudDet_RefDebito' AND object_id = OBJECT_ID('dbo.PresentacionIcbcAuditoriaDetalle'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PresIcbcAudDet_RefDebito] ON [dbo].[PresentacionIcbcAuditoriaDetalle] ([Det_ReferenciaDebito] ASC)
    INCLUDE ([IdAuditoria], [Det_MontoDebito], [IdPersona]);
END
GO
