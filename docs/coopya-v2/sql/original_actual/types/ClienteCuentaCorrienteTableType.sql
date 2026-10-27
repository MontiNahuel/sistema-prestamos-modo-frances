-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.ClienteCuentaCorrienteTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.ClienteCuentaCorrienteTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[ClienteCuentaCorrienteTableType] AS TABLE (
        [IdPersona] int NULL,
        [Det_ReferenciaDebito] varchar(15) NULL,
        [Monto] decimal(18, 2) NULL,
        [Resultado] varchar(10) NULL,
        [ReferenciaDeb] int NULL
    );
END
GO
