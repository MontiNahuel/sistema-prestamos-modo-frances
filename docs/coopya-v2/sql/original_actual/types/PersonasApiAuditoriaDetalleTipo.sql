-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.PersonasApiAuditoriaDetalleTipo
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.PersonasApiAuditoriaDetalleTipo') IS NULL
BEGIN
    CREATE TYPE [dbo].[PersonasApiAuditoriaDetalleTipo] AS TABLE (
        [Indice] int NULL,
        [IdPersona] int NULL,
        [NroSocio] int NULL,
        [TipoDoc] int NULL,
        [NumeroDoc] nvarchar(50) NULL,
        [Cuil] nvarchar(40) NULL,
        [NroEnte] nvarchar(100) NULL,
        [Apellido] nvarchar(200) NULL,
        [Nombre] nvarchar(200) NULL,
        [Operacion] varchar(20) NOT NULL,
        [CamposModificados] int NOT NULL,
        [Motivo] nvarchar(400) NULL
    );
END
GO
