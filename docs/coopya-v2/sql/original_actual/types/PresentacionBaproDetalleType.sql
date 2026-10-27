-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.PresentacionBaproDetalleType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.PresentacionBaproDetalleType') IS NULL
BEGIN
    CREATE TYPE [dbo].[PresentacionBaproDetalleType] AS TABLE (
        [CodigoInterno] varchar(2) NULL,
        [FechaVencimiento] varchar(8) NULL,
        [IdentificadorCliente] varchar(22) NULL,
        [TipoDato] varchar(1) NULL,
        [Bloque1CBU] varchar(8) NULL,
        [Bloque2CBU] varchar(14) NULL,
        [Importe] varchar(10) NULL,
        [CuitEmpresa] varchar(11) NULL,
        [DescripcionTransaccion] varchar(10) NULL,
        [ReferenciaDebito] varchar(15) NULL,
        [NuevoIdentificadorCliente] varchar(22) NULL,
        [CodigoRespuesta] varchar(3) NULL,
        [NombreEmpresa] varchar(16) NULL,
        [ComunicacionEntes] varchar(3) NULL,
        [IdPersona] int NULL,
        [NumeroOperacion] int NULL
    );
END
GO
