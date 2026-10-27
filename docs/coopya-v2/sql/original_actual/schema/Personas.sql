-- ===========================================================================
-- Tabla: dbo.Personas
-- Servidor de origen: 10.16.1.13 | Base de datos: CoopYaBeta
-- Extracción fiel sys.tables / sys.columns / sys.indexes / sys.constraints
-- ===========================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.Personas', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Personas] (
        [Id]                                int                IDENTITY(1,1) NOT NULL,
        [NroSocio]                          int                NULL,
        [TipoDoc]                           int                NULL,
        [NumeroDoc]                         varchar(20)        NULL,
        [NroEnte]                           varchar(50)        NULL,
        [Cuil]                              varchar(20)        NULL,
        [Estado]                            int                NULL,
        [Apellido]                          varchar(200)       NULL,
        [Nombre]                            varchar(200)       NOT NULL,
        [Tipo]                              int                NULL,
        [Razon]                             int                NULL,
        [ProvinciaId]                       int                NULL,
        [LocalidadId]                       int                NULL,
        [Calle]                             varchar(100)       NULL,
        [NumeroCalle]                       varchar(10)        NULL,
        [Piso]                              varchar(10)        NULL,
        [Dpto]                              varchar(10)        NULL,
        [CP]                                varchar(10)        NULL,
        [Observaciones]                     varchar(300)       NULL,
        [FechaNac]                          datetime           NULL,
        [Sexo]                              int                NULL,
        [Remuneracion]                      decimal(18, 2)     NULL,
        [Mail]                              varchar(100)       NULL,
        [PlanId_CuotaSocial]                int                NULL,
        [PlanId_ServEsp]                    int                NULL,
        [FechaAlta]                         datetime           NULL,
        [FechaAsociado]                     datetime           NULL,
        [FechaBaja]                         datetime           NULL,
        [UsuarioAlta]                       int                NULL,
        [UsuarioModif]                      int                NULL,
        [CapitalSocial]                     decimal(18, 2)     NULL,
        [TipoCuit]                          int                NULL,
        [Organismo]                         int                NULL,
        [FechaServicio]                     datetime           NULL,
        [TipoJub]                           int                NULL,
        [PlanId_Asistodo]                   int                NULL,
        [FechaServicioAsistodo]             datetime           NULL,
        CONSTRAINT [PK__Personas__3214EC075B964EEA] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Personas_NroSocio' AND object_id = OBJECT_ID('dbo.Personas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Personas_NroSocio] ON [dbo].[Personas] ([NroSocio] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Personas_NumeroDoc' AND object_id = OBJECT_ID('dbo.Personas'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Personas_NumeroDoc] ON [dbo].[Personas] ([NumeroDoc] ASC);
END
GO
