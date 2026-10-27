CREATE FUNCTION [dbo].[ObtenerIdUsuarioPorToken] (@Token NVARCHAR(36))
RETURNS INT
AS
BEGIN
    DECLARE @IdUsuario INT = NULL;
    -- Validación rápida: solo si el token es un GUID válido
    IF (TRY_CAST(@Token AS UNIQUEIDENTIFIER) IS NOT NULL)
    BEGIN
        SELECT @IdUsuario = IdUsuario
        FROM dbo.UsuarioSesion WITH (INDEX(IDX_UsuarioSesion_Token), NOLOCK)
        WHERE Token = CAST(@Token AS UNIQUEIDENTIFIER)
          AND FechaExpiracion > GETDATE();
    END
    RETURN @IdUsuario;
END

