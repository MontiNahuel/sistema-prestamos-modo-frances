-- ===========================================================================
-- PROPUESTA 01: Habilitación de 'PRESTAMO_CUOTA' en CuentaCorrienteDesglose
-- Estado: PROPUESTA PENDIENTE DE APROBACIÓN
-- Impacto: Permite registrar cuotas de préstamos amortizables sin violar la restricción CHECK.
-- ===========================================================================

-- 1. Modificación de restricción en CuentaCorrienteDesglose
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_CCDesglose_Concepto')
BEGIN
    ALTER TABLE [dbo].[CuentaCorrienteDesglose] DROP CONSTRAINT [CK_CCDesglose_Concepto];
END
GO

ALTER TABLE [dbo].[CuentaCorrienteDesglose] ADD CONSTRAINT [CK_CCDesglose_Concepto] CHECK (
    [Concepto] IN (
        'CUOTA_SOCIAL', 'SERVICIO', 'ASISTODO',
        'MORA_CUOTA_SOCIAL', 'MORA_SERVICIO', 'MORA_ASISTODO',
        'PRESTAMO_CUOTA', 'MORA_PRESTAMO'
    )
);
GO

-- 2. Modificación de restricción en PersonasRepositorio (si se requiere imputar concepto directo)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PersonasRepositorio_Concepto')
BEGIN
    ALTER TABLE [dbo].[PersonasRepositorio] DROP CONSTRAINT [CK_PersonasRepositorio_Concepto];
END
GO

ALTER TABLE [dbo].[PersonasRepositorio] ADD CONSTRAINT [CK_PersonasRepositorio_Concepto] CHECK (
    [Concepto] IS NULL OR [Concepto] IN ('CUOTA_SOCIAL', 'SERVICIO', 'ASISTODO', 'PRESTAMO_CUOTA')
);
GO
