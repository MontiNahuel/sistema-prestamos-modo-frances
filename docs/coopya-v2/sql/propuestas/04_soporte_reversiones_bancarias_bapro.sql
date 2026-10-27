-- ===========================================================================
-- PROPUESTA 04: Soporte Auditable de Reversiones Posteriores BAPRO
-- Estado: PROPUESTA PENDIENTE DE APROBACIÓN
-- Objetivo: Permitir procesar archivos de reversión sin ser bloqueados por la marca inicial 'RESPUESTA'.
-- ===========================================================================

-- Crear tabla de eventos de rendición bancaria para registrar cada archivo individual
IF OBJECT_ID('dbo.PresentacionBaproRendiciones', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PresentacionBaproRendiciones] (
        [Id]                INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [NroArchivo]        INT NOT NULL,
        [HashArchivo]       CHAR(64) NOT NULL,
        [NombreArchivo]     VARCHAR(200) NOT NULL,
        [Ruta]              VARCHAR(500) NOT NULL,
        [EsReversion]       BIT NOT NULL DEFAULT (0),
        [TotalRenglones]    INT NOT NULL,
        [FechaCarga]        DATETIME NOT NULL DEFAULT (GETDATE()),
        [UsuarioId]         INT NULL,
        CONSTRAINT [UX_BaproRendicion_Hash] UNIQUE ([HashArchivo])
    );
END
GO
