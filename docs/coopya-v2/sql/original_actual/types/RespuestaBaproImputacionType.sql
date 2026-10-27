-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.RespuestaBaproImputacionType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.RespuestaBaproImputacionType') IS NULL
BEGIN
    CREATE TYPE [dbo].[RespuestaBaproImputacionType] AS TABLE (
        [Orden] int NOT NULL,
        [ReferenciaDebito] varchar(15) NULL,
        [IdentificadorCliente] varchar(22) NULL,
        [CodigoRespuesta] varchar(50) NULL,
        [EsReversion] bit NOT NULL
    );
END
GO
