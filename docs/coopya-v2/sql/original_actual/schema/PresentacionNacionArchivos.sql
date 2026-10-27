-- ===========================================================================
-- Tabla: dbo.PresentacionNacionArchivos
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionNacionArchivos', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionNacionArchivos] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [Ruta]                              varchar(500)       NOT NULL,
        [Tipo]                              varchar(20)        NOT NULL,
        [FechaCarga]                        datetime           NOT NULL CONSTRAINT [DF__Presentac__Fecha__382F5661] DEFAULT (getdate()),
        [UsuarioId]                         int                NULL,
        [NombreArchivo]                     varchar(200)       NULL,
        CONSTRAINT [PK__Presenta__3214EC074AF163F5] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NacionArchivos_ExternoPorNombre' AND object_id = OBJECT_ID('dbo.PresentacionNacionArchivos'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_NacionArchivos_ExternoPorNombre] ON [dbo].[PresentacionNacionArchivos] ([NombreArchivo] ASC)
    WHERE ([Tipo]='Externa' AND [NombreArchivo] IS NOT NULL);
END
GO
