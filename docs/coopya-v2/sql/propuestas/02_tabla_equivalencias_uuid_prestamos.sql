-- ===========================================================================
-- PROPUESTA 02: Tabla de Correspondencia y Equivalencias de Identificadores (UUID <-> INT)
-- Estado: PROPUESTA PENDIENTE DE APROBACIÓN
-- Objetivo: Vincular entidades del Sistema Francés (UUID String 36) con el modelo CoopYa (INT).
-- ===========================================================================

IF OBJECT_ID('dbo.EquivalenciasPrestamos', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EquivalenciasPrestamos] (
        [Id]                        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [SistemaOrigen]             VARCHAR(30) NOT NULL DEFAULT ('SISTEMA_FRANCES'),
        [PrestamoId_UUID]           VARCHAR(36) NOT NULL,
        [CuotaId_UUID]              VARCHAR(36) NOT NULL,
        [SocioId_UUID]              VARCHAR(36) NOT NULL,
        [IdPersona_CoopYa]          INT NOT NULL,
        [PlanId_CoopYa]             INT NOT NULL,
        [NumeroCuota]               INT NOT NULL,
        [FechaVencimiento]          DATE NOT NULL,
        [ImporteCuota]              DECIMAL(18,2) NOT NULL,
        [Capital]                   DECIMAL(18,2) NOT NULL,
        [Interes]                   DECIMAL(18,2) NOT NULL,
        [Iva]                       DECIMAL(18,2) NOT NULL,
        [FechaAlta]                 DATETIME NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT [UX_Equiv_CuotaUUID] UNIQUE ([CuotaId_UUID]),
        CONSTRAINT [UX_Equiv_PlanCuota] UNIQUE ([PlanId_CoopYa], [NumeroCuota]),
        CONSTRAINT [FK_Equiv_Persona] FOREIGN KEY ([IdPersona_CoopYa]) REFERENCES [dbo].[Personas]([Id])
    );

    CREATE NONCLUSTERED INDEX [IX_Equiv_PrestamoUUID] 
    ON [dbo].[EquivalenciasPrestamos] ([PrestamoId_UUID])
    INCLUDE ([NumeroCuota], [ImporteCuota], [IdPersona_CoopYa]);
END
GO
