-- ===========================================================================
-- Tabla: dbo.Usuarios
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Usuarios] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [Usuario]                           varchar(100)       NOT NULL,
        [Clave]                             varbinary(64)      NOT NULL,
        [Salt]                              varbinary(32)      NOT NULL,
        [Mail]                              varchar(200)       NULL,
        [Activo]                            bit                NULL,
        [FechaInicio]                       datetime           NULL,
        [FechaModif]                        datetime           NULL,
        CONSTRAINT [PK__Usuarios__3214EC075A8CF0D8] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
