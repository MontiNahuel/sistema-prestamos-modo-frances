-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.TelefonoTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.TelefonoTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[TelefonoTableType] AS TABLE (
        [Tipo] int NULL,
        [CodArea] varchar(10) NULL,
        [Numero] varchar(15) NULL,
        [Activo] bit NULL,
        [FechaAlta] datetime NULL
    );
END
GO
