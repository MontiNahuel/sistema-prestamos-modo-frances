-- ===========================================================================
-- Tabla: dbo.PresentacionBaproArchivos
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.PresentacionBaproArchivos', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionBaproArchivos] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroArchivo]                        int                NOT NULL,
        [Ruta]                              varchar(500)       NOT NULL,
        [Tipo]                              varchar(20)        NOT NULL,
        [FechaCarga]                        datetime           NOT NULL CONSTRAINT [DF__Presentac__Fecha__308E3499] DEFAULT (getdate()),
        [UsuarioId]                         int                NULL,
        CONSTRAINT [PK__Presenta__3214EC07E9243AC6] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
