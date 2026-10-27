-- ===========================================================================
-- PROPUESTA 05: Máquina Canónica de Estados en sp_GetCuentaCorrienteResumen
-- Estado: PROPUESTA PENDIENTE DE APROBACIÓN
-- ===========================================================================

-- Modificación en sección A de sp_GetCuentaCorrienteResumen:
-- Reconocer código '7' de Banco Nación como estado 'EN_TRAMITE' o 'PENDIENTE_REINTENTO'
-- en lugar de 'RECHAZADO', evitando marcar como incobrable un débito en curso.

/*
        Estado = CASE
                    WHEN pr.Resultado IS NULL OR LTRIM(RTRIM(pr.Resultado)) = '' THEN 'PENDIENTE'
                    WHEN UPPER(LTRIM(RTRIM(pr.Resultado))) IN ('OK','0') THEN 'COBRADO'
                    WHEN LTRIM(RTRIM(pr.Resultado)) = '7' THEN 'PENDIENTE' -- Reintento Banco Nación
                    ELSE 'RECHAZADO'
                 END,
*/
