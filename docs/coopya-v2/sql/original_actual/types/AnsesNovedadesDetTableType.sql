-- ===========================================================================
-- Tipo de Tabla de Usuario: dbo.AnsesNovedadesDetTableType
-- Servidor: 10.16.1.13 | Base de datos: CoopYaBeta
-- ===========================================================================
IF TYPE_ID('dbo.AnsesNovedadesDetTableType') IS NULL
BEGIN
    CREATE TYPE [dbo].[AnsesNovedadesDetTableType] AS TABLE (
        [NroMovimiento] varchar(50) NULL,
        [NroBeneficio] varchar(50) NULL,
        [ApellidoNombre] varchar(200) NULL,
        [FechaHoraAnses] varchar(50) NULL,
        [TipoMovimiento] varchar(50) NULL,
        [DescripcionMovimiento] varchar(200) NULL,
        [Cod] varchar(50) NULL,
        [DescripcionConcepto] varchar(200) NULL,
        [Importe] decimal(18, 2) NULL,
        [FlagDescuento] varchar(10) NULL,
        [ImporteOriginal] decimal(18, 2) NULL,
        [CampoReservado1] varchar(50) NULL,
        [Periodo] varchar(50) NULL,
        [CampoReservado2] varchar(50) NULL,
        [ImporteCalculado] decimal(18, 2) NULL,
        [ImporteFinal] decimal(18, 2) NULL,
        [Dni] varchar(20) NULL,
        [HashMovimiento] varchar(100) NULL,
        [CUILAlternativo] varchar(20) NULL,
        [Enviado] varchar(10) NULL
    );
END
GO
