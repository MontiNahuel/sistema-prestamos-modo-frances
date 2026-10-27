-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.PresentacionComercioDetalleType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.PresentacionComercioDetalleType') IS NULL
BEGIN
    CREATE TYPE [dbo].[PresentacionComercioDetalleType] AS TABLE (
        [NumeroOperacion] int NOT NULL,
        [CBU] varchar(22) NOT NULL,
        [FechaVencimiento] varchar(8) NULL,
        [NombreCliente] varchar(40) NULL,
        [Importe] varchar(10) NOT NULL,
        [IdPersona] int NULL
    );
END
GO
