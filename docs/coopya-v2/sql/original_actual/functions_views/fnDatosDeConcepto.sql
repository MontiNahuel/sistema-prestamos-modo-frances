
CREATE   FUNCTION dbo.fnDatosDeConcepto
(
    @IdPersona INT,
    @Concepto  VARCHAR(30),
    @Periodo   DATE
)
RETURNS TABLE
AS
RETURN
(
    SELECT
        PlanId =
            CASE @Concepto
                WHEN 'CUOTA_SOCIAL' THEN p.PlanId_CuotaSocial
                WHEN 'SERVICIO'     THEN p.PlanId_ServEsp
                WHEN 'ASISTODO'     THEN p.PlanId_Asistodo
                /* La mora de un concepto pertenece al mismo plan que el concepto. */
                WHEN 'MORA_CUOTA_SOCIAL' THEN p.PlanId_CuotaSocial
                WHEN 'MORA_SERVICIO'     THEN p.PlanId_ServEsp
                WHEN 'MORA_ASISTODO'     THEN p.PlanId_Asistodo
            END,

        /* La Cuota Social no tiene cuotas: es un aporte mensual permanente. */
        CantidadCuotas =
            CASE @Concepto
                WHEN 'SERVICIO'      THEN tps.CantidadCuotas
                WHEN 'ASISTODO'      THEN tpa.CantidadCuotas
                WHEN 'MORA_SERVICIO' THEN tps.CantidadCuotas
                WHEN 'MORA_ASISTODO' THEN tpa.CantidadCuotas
                ELSE NULL
            END,

        NumeroCuota =
            CASE @Concepto
                WHEN 'CUOTA_SOCIAL' THEN
                    CASE WHEN p.FechaAsociado IS NULL THEN NULL
                         ELSE DATEDIFF(MONTH, p.FechaAsociado, @Periodo) END
                WHEN 'SERVICIO' THEN
                    CASE WHEN p.FechaServicio IS NULL THEN NULL
                         ELSE DATEDIFF(MONTH, p.FechaServicio, @Periodo) END
                WHEN 'ASISTODO' THEN
                    CASE WHEN p.FechaServicioAsistodo IS NULL THEN NULL
                         ELSE DATEDIFF(MONTH, p.FechaServicioAsistodo, @Periodo) END
                ELSE NULL
            END,

        /* Lo que valia la cuota segun el catalogo al momento de generar.
           Cuota Social usa Precio; Servicio y Asistodo usan ImporteCuota. */
        ImporteTeorico =
            CASE @Concepto
                WHEN 'CUOTA_SOCIAL' THEN tpc.Precio
                WHEN 'SERVICIO'     THEN tps.ImporteCuota
                WHEN 'ASISTODO'     THEN tpa.ImporteCuota
                ELSE NULL
            END
    FROM dbo.Personas p
    LEFT JOIN dbo.TipoPlanesCs        tpc ON tpc.Id = p.PlanId_CuotaSocial
    LEFT JOIN dbo.TipoPlanesServicios tps ON tps.Id = p.PlanId_ServEsp
    LEFT JOIN dbo.TipoPlanesAsistodo  tpa ON tpa.Id = p.PlanId_Asistodo
    WHERE p.Id = @IdPersona
);
