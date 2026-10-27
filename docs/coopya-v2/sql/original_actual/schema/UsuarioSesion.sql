-- ===========================================================================
-- Tabla: dbo.UsuarioSesion
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.UsuarioSesion', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UsuarioSesion] (
        [IdSesion]                          int                IDENTITY(1,1) NOT NULL,
        [IdUsuario]                         int                NOT NULL,
        [Token]                             uniqueidentifier   NOT NULL,
        [FechaExpiracion]                   datetime           NOT NULL,
        [Fecha]                             datetime           NULL,
        CONSTRAINT [PK__UsuarioS__22EC535B4AA83AD3] PRIMARY KEY CLUSTERED ([IdSesion] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_UsuarioSesion_Token' AND object_id = OBJECT_ID('dbo.UsuarioSesion'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IDX_UsuarioSesion_Token] ON [dbo].[UsuarioSesion] ([Token] ASC)
    INCLUDE ([IdUsuario], [FechaExpiracion]);
END
GO
