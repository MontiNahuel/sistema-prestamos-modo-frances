CREATE PROCEDURE [dbo].[VerificarExisteRespuestaNacion]
    @NroArchivo INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT CASE 
        WHEN EXISTS(
            SELECT 1 FROM PresentacionNacionArchivos 
            WHERE NroArchivo = @NroArchivo AND Tipo = 'RESPUESTA'
        ) THEN 1 
        ELSE 0 
    END AS Existe;
END
