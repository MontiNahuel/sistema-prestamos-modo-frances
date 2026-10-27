-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.DniExcluidoTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.DniExcluidoTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[DniExcluidoTableType] AS TABLE (
        [Dni] varchar(20) NULL
    );
END
GO
