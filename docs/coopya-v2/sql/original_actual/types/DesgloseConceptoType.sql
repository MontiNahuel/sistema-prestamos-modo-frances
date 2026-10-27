-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.DesgloseConceptoType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.DesgloseConceptoType') IS NULL
BEGIN
    CREATE TYPE [dbo].[DesgloseConceptoType] AS TABLE (
        [NumeroOperacion] int NOT NULL,
        [Concepto] varchar(30) NOT NULL,
        [PlanId] int NULL,
        [NumeroCuota] int NULL,
        [CantidadCuotas] int NULL,
        [PeriodoObligacion] date NULL,
        [ImporteTeorico] decimal(18, 2) NULL,
        [ImportePresentado] decimal(18, 2) NOT NULL
    );
END
GO
