-- ===========================================================================
-- Tabla: dbo.TipoPlanesCs
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.TipoPlanesCs', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TipoPlanesCs] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [Nombre]                            varchar(300)       NULL,
        [Precio]                            decimal(18, 2)     NULL,
        [Activo]                            bit                NULL,
        [Fecha]                             datetime           NULL,
        CONSTRAINT [PK__TipoPlan__3214EC07F81E8638] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
