-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.RespuestaNacionDetalleType_Resp
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.RespuestaNacionDetalleType_Resp') IS NULL
BEGIN
    CREATE TYPE [dbo].[RespuestaNacionDetalleType_Resp] AS TABLE (
        [Det_SucursalCuentaCliente] varchar(4) NULL,
        [Det_SistemaCuenta] varchar(2) NULL,
        [Det_NroCuentaCliente] varchar(11) NULL,
        [Det_Importe] varchar(15) NULL,
        [CodigoRespuesta] varchar(1) NULL
    );
END
GO
