-- ===========================================================================
-- Tabla: dbo.MediosDePago
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.MediosDePago', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MediosDePago] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [IdPersona]                         int                NULL,
        [Tipo]                              int                NULL,
        [Valor]                             varchar(100)       NULL,
        [FechaAlta]                         datetime           NULL,
        [Predeterminado]                    bit                NULL,
        [Banco]                             int                NULL,
        CONSTRAINT [PK__MediosDe__3214EC07D01D69D1] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MediosDePago_IdPersona' AND object_id = OBJECT_ID('dbo.MediosDePago'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MediosDePago_IdPersona] ON [dbo].[MediosDePago] ([IdPersona] ASC)
    INCLUDE ([Tipo], [Valor], [Predeterminado], [Banco]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MediosDePago_Tipo2_Valor' AND object_id = OBJECT_ID('dbo.MediosDePago'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_MediosDePago_Tipo2_Valor] ON [dbo].[MediosDePago] ([Tipo] ASC)
    INCLUDE ([Valor], [IdPersona])
    WHERE ([Tipo]=(2));
END
GO
