-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.FiltroMasivoTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.FiltroMasivoTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[FiltroMasivoTableType] AS TABLE (
        [IdPersona] int NULL
    );
END
GO
