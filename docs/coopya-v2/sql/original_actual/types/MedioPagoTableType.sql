-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.MedioPagoTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.MedioPagoTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[MedioPagoTableType] AS TABLE (
        [Tipo] int NULL,
        [valor] varchar(100) NULL,
        [Predeterminado] bit NULL,
        [Banco] int NULL
    );
END
GO
