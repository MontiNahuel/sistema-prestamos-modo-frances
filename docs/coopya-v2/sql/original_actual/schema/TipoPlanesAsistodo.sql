-- ===========================================================================
-- Tabla: dbo.TipoPlanesAsistodo
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.TipoPlanesAsistodo', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TipoPlanesAsistodo] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [Nombre]                            varchar(50)        NULL,
        [Precio]                            decimal(18, 2)     NULL,
        [CantidadCuotas]                    int                NULL,
        [ImporteCuota]                      decimal(18, 2)     NULL,
        [Iva]                               decimal(18, 2)     NULL,
        [Costo]                             decimal(18, 2)     NULL,
        [CostoIva]                          decimal(18, 2)     NULL,
        [CostoTotal]                        decimal(18, 2)     NULL,
        [Activo]                            bit                NULL,
        [Fecha]                             datetime           NULL,
        [UsuarioId]                         int                NULL,
        [Alias]                             varchar(200)       NULL,
        CONSTRAINT [PK__TipoPlan__3214EC0723FF4497] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
