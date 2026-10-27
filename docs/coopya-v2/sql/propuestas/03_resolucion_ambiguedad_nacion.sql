-- ===========================================================================
-- PROPUESTA 03: Control Riguroso de Ambigüedades y Contradicciones en ImputarRespuestaNacionLote
-- Estado: PROPUESTA PENDIENTE DE APROBACIÓN
-- ===========================================================================

-- Modificación en sección 4 de ImputarRespuestaNacionLote:
-- Se reemplaza la selección ciega MIN(CodigoRespuesta) por rechazo explícito si existen
-- códigos distintos para la misma clave bancaria.

/*
        -- Detección de respuestas contradictorias en el archivo:
        IF EXISTS (SELECT 1 FROM #Claves WHERE CodigosDistintos > 1)
        BEGIN
            SET @Mensaje = N'CONTRADICCIÓN EN ARCHIVO: Existen registros para la misma cuenta e importe '
                + N'con códigos de respuesta divergentes (cobro y rechazo simultáneos). '
                + N'Se aborta la transacción completa sin aplicar cambios.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END

        -- Detección de candidatos múltiples en la presentación:
        SELECT @Ambiguos = COUNT(*)
        FROM #Claves c
        INNER JOIN #Pendientes p
            ON  p.Det_SucursalCuentaCliente = c.Det_SucursalCuentaCliente
            AND p.Det_SistemaCuenta         = c.Det_SistemaCuenta
            AND p.Det_NroCuentaCliente      = c.Det_NroCuentaCliente
            AND p.Det_Importe               = c.Det_Importe
        WHERE p.Pendientes > 1;

        IF @Ambiguos > 0
        BEGIN
            SET @Mensaje = N'AMBIGÜEDAD: ' + CAST(@Ambiguos AS NVARCHAR(10))
                + N' clave(s) coinciden con más de un detalle pendiente en la presentación. '
                + N'Se requiere resolver la asignación previa unívocamente.';
            ROLLBACK TRANSACTION;
            RETURN 1;
        END
*/
