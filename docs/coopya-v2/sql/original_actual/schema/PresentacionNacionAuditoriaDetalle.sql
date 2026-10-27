-- ===========================================================================
-- Tabla: dbo.PresentacionNacionAuditoriaDetalle
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionNacionAuditoriaDetalle', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionNacionAuditoriaDetalle] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [IdAuditoria]                       int                NULL,
        [Det_SucursalCuentaCliente]         varchar(4)         NULL,
        [Det_SistemaCuenta]                 varchar(2)         NULL,
        [Det_NroCuentaCliente]              varchar(11)        NULL,
        [Det_Importe]                       varchar(15)        NULL,
        [Det_FechaVencimiento]              varchar(8)         NULL,
        [Det_Estado]                        varchar(1)         NULL,
        [Det_DescripcionRechazo]            varchar(30)        NULL,
        [Det_ConceptoDebito]                varchar(10)        NULL,
        [IdPersona]                         int                NULL,
        [NumeroOperacion]                   int                NULL,
        [CodigoRespuesta]                   varchar(1)         NULL,
        [FechaRespuesta]                    datetime           NULL,
        CONSTRAINT [PK__Presenta__3214EC0717096822] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NacionAuditoriaDetalle_IdAuditoria' AND object_id = OBJECT_ID('dbo.PresentacionNacionAuditoriaDetalle'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_NacionAuditoriaDetalle_IdAuditoria] ON [dbo].[PresentacionNacionAuditoriaDetalle] ([IdAuditoria] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NacionDetalle_Respuesta' AND object_id = OBJECT_ID('dbo.PresentacionNacionAuditoriaDetalle'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_NacionDetalle_Respuesta] ON [dbo].[PresentacionNacionAuditoriaDetalle] ([IdAuditoria] ASC, [Det_SucursalCuentaCliente] ASC, [Det_SistemaCuenta] ASC, [Det_NroCuentaCliente] ASC, [Det_Importe] ASC, [CodigoRespuesta] ASC)
    INCLUDE ([Id]);
END
GO
