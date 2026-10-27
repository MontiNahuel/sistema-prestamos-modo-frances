-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.AnsesRespuestasDetTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.AnsesRespuestasDetTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[AnsesRespuestasDetTableType] AS TABLE (
        [NroBeneficio] varchar(50) NULL,
        [ApellidoNombre] varchar(200) NULL,
        [TipoDocumento] varchar(10) NULL,
        [NumeroDocumento] varchar(20) NULL,
        [CodigoConcepto] varchar(50) NULL,
        [ImporteBruto] varchar(50) NULL,
        [ImporteHaber] varchar(50) NULL,
        [Periodo] varchar(10) NULL,
        [NumeroReferencia] varchar(50) NULL,
        [FechaNacimiento] varchar(50) NULL,
        [FechaNacimientoAnio] varchar(10) NULL,
        [Sexo] varchar(10) NULL,
        [TipoRespuesta] varchar(50) NULL,
        [Importe] decimal(18, 2) NULL
    );
END
GO
