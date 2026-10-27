-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.RespuestaComercioDetalleType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.RespuestaComercioDetalleType') IS NULL
BEGIN
    CREATE TYPE [dbo].[RespuestaComercioDetalleType] AS TABLE (
        [NumeroOperacion] int NOT NULL,
        [Intento] int NOT NULL,
        [Respuesta] varchar(1) NOT NULL,
        [DescRechazo] varchar(50) NULL,
        [ImporteInformado] varchar(15) NULL,
        [FechaVtoOrig] varchar(8) NULL,
        [FechaEnvio] varchar(8) NULL,
        [FechaRecibo] varchar(8) NULL,
        [CodEmpresa] varchar(10) NULL,
        [NomEmpresa] varchar(30) NULL,
        [Cliente] varchar(40) NULL
    );
END
GO
