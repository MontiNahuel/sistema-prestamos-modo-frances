-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.PresentacionIcbcDetalleType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.PresentacionIcbcDetalleType') IS NULL
BEGIN
    CREATE TYPE [dbo].[PresentacionIcbcDetalleType] AS TABLE (
        [Det_TipoRegistro] varchar(1) NULL,
        [Det_CodigoTransaccion] varchar(4) NULL,
        [Det_Bloque1CBU] varchar(8) NULL,
        [Det_Bloque2CBU] varchar(14) NULL,
        [Det_IdentificadorCliente] varchar(22) NULL,
        [Det_MontoDebito] varchar(10) NULL,
        [Det_ReferenciaDebito] varchar(15) NULL,
        [Det_FechaVencimientoOriginal] varchar(8) NULL,
        [IdPersona] int NULL,
        [NumeroOperacion] int NULL
    );
END
GO
