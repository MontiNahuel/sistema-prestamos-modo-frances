
CREATE   PROCEDURE [dbo].[sp_GetCuentaCorrientePersona]
    @IdPersona INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pr.IdPersona,
        pr.Banco,
        pr.Monto,
        pr.PresentacionId_Det,
        pr.FechaImpacto,
        pr.RespuestaId,
        pr.Resultado,
        pr.FechaInsert,
        pr.FechaModif
    FROM dbo.PersonasRepositorio pr
    WHERE pr.IdPersona = @IdPersona
    ORDER BY pr.FechaInsert DESC;
END
