-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.PresentacionNacionDetalleType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.PresentacionNacionDetalleType') IS NULL
BEGIN
    CREATE TYPE [dbo].[PresentacionNacionDetalleType] AS TABLE (
        [Det_SucursalCuentaCliente] varchar(4) NULL,
        [Det_SistemaCuenta] varchar(2) NULL,
        [Det_NroCuentaCliente] varchar(11) NULL,
        [Det_Importe] varchar(15) NULL,
        [Det_FechaVencimiento] varchar(8) NULL,
        [Det_Estado] varchar(1) NULL,
        [Det_DescripcionRechazo] varchar(30) NULL,
        [Det_ConceptoDebito] varchar(10) NULL,
        [IdPersona] int NULL,
        [NumeroOperacion] int NULL
    );
END
GO
