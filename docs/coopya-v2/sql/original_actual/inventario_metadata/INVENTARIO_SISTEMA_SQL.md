# Inventario Completo de Objetos y Metadatos de SQL Server (CoopYaBeta)

> **Entorno de Extracción:** SQL Server 2019 Standard Edition (15.0.2000.5) en host `10.16.1.13` (Base `CoopYaBeta`).
> **Fecha de Extracción:** 2026-10-27 10:15 UTC-3.
> **Garantía:** Sin datos personales, credenciales ni sesiones activas. Extraído directamente de `sys.indexes`, `sys.index_columns`, `sys.default_constraints`, `sys.check_constraints`, `sys.foreign_keys` y `sys.columns`.

---

## 1. Inventario de Índices y Columnas Clave / Incluidas (`sys.indexes` y `sys.index_columns`)

| Tabla | Nombre del Índice | Tipo | Único | Clave Primaria | Columnas Clave | Columnas Incluidas (`INCLUDE`) | Filtro (`WHERE`) |
|---|---|---|---|---|---|---|---|
| `CuentaCorrienteDesglose` | `IX_CCDesglose_Archivo` | NONCLUSTERED | NO | NO | `Banco ASC, NroArchivo ASC` | `Concepto, ImportePresentado, ImporteCobrado, ImporteRechazado` | `-` |
| `CuentaCorrienteDesglose` | `IX_CCDesglose_Movimiento` | NONCLUSTERED | NO | NO | `IdMovimiento ASC` | `Concepto, ImportePresentado, PeriodoObligacion, Origen` | `-` |
| `CuentaCorrienteDesglose` | `IX_CCDesglose_Persona` | NONCLUSTERED | NO | NO | `IdPersona ASC` | `Concepto, ImportePresentado, ImporteCobrado, ImporteRechazado, PeriodoObligacion` | `-` |
| `CuentaCorrienteDesglose` | `IX_CCDesglose_Renglon` | NONCLUSTERED | NO | NO | `Banco ASC, PresentacionId_Det ASC` | `-` | `-` |
| `CuentaCorrienteDesglose` | `PK_CuentaCorrienteDesglose` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `MediosDePago` | `IX_MediosDePago_IdPersona` | NONCLUSTERED | NO | NO | `IdPersona ASC` | `Tipo, Valor, Predeterminado, Banco` | `-` |
| `MediosDePago` | `IX_MediosDePago_Tipo2_Valor` | NONCLUSTERED | NO | NO | `Tipo ASC` | `Valor, IdPersona` | `([Tipo]=(2))` |
| `MediosDePago` | `PK__MediosDe__3214EC07D01D69D1` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `Personas` | `IX_Personas_NroSocio` | NONCLUSTERED | NO | NO | `NroSocio ASC` | `-` | `-` |
| `Personas` | `IX_Personas_NumeroDoc` | NONCLUSTERED | NO | NO | `NumeroDoc ASC` | `-` | `-` |
| `Personas` | `PK__Personas__3214EC075B964EEA` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PersonasRepositorio` | `IX_PersonasRepositorio_Banco_PresentacionIdDet` | NONCLUSTERED | NO | NO | `Banco ASC, PresentacionId_Det ASC` | `-` | `-` |
| `PersonasRepositorio` | `IX_PersonasRepositorio_IdPersona_FechaInsert` | NONCLUSTERED | NO | NO | `IdPersona ASC, FechaInsert DESC` | `Banco, Monto, PresentacionId_Det, FechaImpacto, RespuestaId, Resultado, FechaModif` | `-` |
| `PersonasRepositorio` | `PK__Personas__3214EC07C447D2EB` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PersonasRepositorio` | `UX_PersonasRepositorio_Banco_PresentacionIdDet` | NONCLUSTERED | SÍ | NO | `Banco ASC, PresentacionId_Det ASC` | `-` | `([PresentacionId_Det] IS NOT NULL)` |
| `PresentacionBaproArchivos` | `PK__Presenta__3214EC07E9243AC6` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionBaproAuditoria` | `IX_BaproAuditoria_NroArchivo` | NONCLUSTERED | NO | NO | `NroArchivo ASC` | `-` | `-` |
| `PresentacionBaproAuditoria` | `IX_PresentacionBaproAuditoria_IdCorrida` | NONCLUSTERED | NO | NO | `IdCorrida ASC` | `-` | `([IdCorrida] IS NOT NULL)` |
| `PresentacionBaproAuditoria` | `PK__Presenta__3214EC07DAAB6A98` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionComercioAuditoria` | `IX_PresComercioAud_FechaGeneracion` | NONCLUSTERED | NO | NO | `FechaGeneracion ASC` | `NroArchivo` | `-` |
| `PresentacionComercioAuditoria` | `IX_PresComercioAud_IdPersona` | NONCLUSTERED | NO | NO | `IdPersona ASC` | `NroArchivo, NumeroOperacion, Importe, CodigoRespuesta` | `-` |
| `PresentacionComercioAuditoria` | `PK_PresentacionComercioAuditoria` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionComercioAuditoria` | `UX_PresComercioAud_IdCorrida` | NONCLUSTERED | SÍ | NO | `IdCorrida ASC, NumeroOperacion ASC` | `-` | `([IdCorrida] IS NOT NULL)` |
| `PresentacionComercioAuditoria` | `UX_PresComercioAud_NroArchivo_NumOp` | NONCLUSTERED | SÍ | NO | `NroArchivo ASC, NumeroOperacion ASC` | `-` | `-` |
| `PresentacionIcbcAuditoria` | `IX_Auditoria_NroArchivo` | NONCLUSTERED | NO | NO | `NroArchivo ASC` | `-` | `-` |
| `PresentacionIcbcAuditoria` | `PK__Presenta__3214EC07EBF60EAF` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionIcbcAuditoria` | `UX_PresentacionIcbcAuditoria_IdCorrida` | NONCLUSTERED | SÍ | NO | `IdCorrida ASC` | `-` | `([IdCorrida] IS NOT NULL)` |
| `PresentacionIcbcAuditoria` | `UX_PresentacionIcbcAuditoria_NroArchivo` | NONCLUSTERED | SÍ | NO | `NroArchivo ASC` | `-` | `-` |
| `PresentacionIcbcAuditoria` | `UX_PresentacionIcbcAuditoria_ReferenciaDeb` | NONCLUSTERED | SÍ | NO | `ReferenciaDeb ASC` | `-` | `([ReferenciaDeb] IS NOT NULL)` |
| `PresentacionIcbcAuditoriaDetalle` | `IX_AuditoriaDetalle_IdAuditoria` | NONCLUSTERED | NO | NO | `IdAuditoria ASC` | `-` | `-` |
| `PresentacionIcbcAuditoriaDetalle` | `IX_PresIcbcAudDet_RefDebito` | NONCLUSTERED | NO | NO | `Det_ReferenciaDebito ASC` | `IdAuditoria, Det_MontoDebito, IdPersona` | `-` |
| `PresentacionIcbcAuditoriaDetalle` | `PK__Presenta__3214EC07D2FA8A62` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionNacionArchivos` | `PK__Presenta__3214EC074AF163F5` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionNacionArchivos` | `UX_NacionArchivos_ExternoPorNombre` | NONCLUSTERED | SÍ | NO | `NombreArchivo ASC` | `-` | `([Tipo]='Externa' AND [NombreArchivo] IS NOT NULL)` |
| `PresentacionNacionAuditoria` | `IX_NacionAuditoria_NroArchivo` | NONCLUSTERED | NO | NO | `NroArchivo ASC` | `-` | `-` |
| `PresentacionNacionAuditoria` | `PK__Presenta__3214EC072FF4735A` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `PresentacionNacionAuditoria` | `UX_PresentacionNacionAuditoria_IdCorrida` | NONCLUSTERED | SÍ | NO | `IdCorrida ASC` | `-` | `([IdCorrida] IS NOT NULL)` |
| `PresentacionNacionAuditoria` | `UX_PresentacionNacionAuditoria_NroArchivo` | NONCLUSTERED | SÍ | NO | `NroArchivo ASC` | `-` | `-` |
| `PresentacionNacionAuditoriaDetalle` | `IX_NacionAuditoriaDetalle_IdAuditoria` | NONCLUSTERED | NO | NO | `IdAuditoria ASC` | `-` | `-` |
| `PresentacionNacionAuditoriaDetalle` | `IX_NacionDetalle_Respuesta` | NONCLUSTERED | NO | NO | `IdAuditoria ASC, Det_SucursalCuentaCliente ASC, Det_SistemaCuenta ASC, Det_NroCuentaCliente ASC, Det_Importe ASC, CodigoRespuesta ASC` | `Id` | `-` |
| `PresentacionNacionAuditoriaDetalle` | `PK__Presenta__3214EC0717096822` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `TipoPlanesAsistodo` | `PK__TipoPlan__3214EC0723FF4497` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `TipoPlanesCs` | `PK__TipoPlan__3214EC07F81E8638` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `TipoPlanesServicios` | `PK__TipoPlan__3214EC07B6C41BC4` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |
| `UsuarioSesion` | `IDX_UsuarioSesion_Token` | NONCLUSTERED | SÍ | NO | `Token ASC` | `IdUsuario, FechaExpiracion` | `-` |
| `UsuarioSesion` | `PK__UsuarioS__22EC535B4AA83AD3` | CLUSTERED | SÍ | SÍ | `IdSesion ASC` | `-` | `-` |
| `Usuarios` | `PK__Usuarios__3214EC075A8CF0D8` | CLUSTERED | SÍ | SÍ | `Id ASC` | `-` | `-` |

---

## 2. Restricciones de Valor Predeterminado (`sys.default_constraints`)

| Tabla | Columna | Nombre Restricción | Definición SQL |
|---|---|---|---|
| `CuentaCorrienteDesglose` | `FechaGeneracion` | `DF_CCDesglose_FechaGen` | `(getdate())` |
| `CuentaCorrienteDesglose` | `ImporteCobrado` | `DF_CCDesglose_Cobrado` | `((0))` |
| `CuentaCorrienteDesglose` | `ImporteRechazado` | `DF_CCDesglose_Rechazado` | `((0))` |
| `PresentacionBaproArchivos` | `FechaCarga` | `DF__Presentac__Fecha__308E3499` | `(getdate())` |
| `PresentacionBaproAuditoria` | `FechaGeneracion` | `DF__Presentac__Fecha__13F1F5EB` | `(getdate())` |
| `PresentacionBaproAuditoria` | `SumarMora` | `DF_PresBaproAud_SumarMora` | `((1))` |
| `PresentacionComercioAuditoria` | `SumarMora` | `DF_PresComercioAud_SumarMora` | `((0))` |
| `PresentacionIcbcAuditoria` | `FechaGeneracion` | `DF__Presentac__Fecha__245D67DE` | `(getdate())` |
| `PresentacionIcbcAuditoria` | `SumarMora` | `DF_PresIcbcAud_SumarMora` | `((1))` |
| `PresentacionNacionArchivos` | `FechaCarga` | `DF__Presentac__Fecha__382F5661` | `(getdate())` |
| `PresentacionNacionAuditoria` | `FechaGeneracion` | `DF__Presentac__Fecha__3B0BC30C` | `(getdate())` |
| `PresentacionNacionAuditoria` | `SumarMora` | `DF_PresNacionAud_SumarMora` | `((1))` |

---

## 3. Restricciones de Validación (`sys.check_constraints`)

| Tabla | Columna | Nombre Restricción | Definición de Validación |
|---|---|---|---|
| `CuentaCorrienteDesglose` | `Concepto` | `CK_CCDesglose_Concepto` | `([Concepto]='MORA_ASISTODO' OR [Concepto]='MORA_SERVICIO' OR [Concepto]='MORA_CUOTA_SOCIAL' OR [Concepto]='ASISTODO' OR [Concepto]='SERVICIO' OR [Concepto]='CUOTA_SOCIAL')` |
| `CuentaCorrienteDesglose` | `(Tabla)` | `CK_CCDesglose_ManualConMotivo` | `([Origen]<>'MANUAL' OR [Motivo] IS NOT NULL AND ltrim(rtrim([Motivo]))<>'')` |
| `CuentaCorrienteDesglose` | `Origen` | `CK_CCDesglose_Origen` | `([Origen]='MANUAL' OR [Origen]='BANCARIO')` |
| `PersonasRepositorio` | `Concepto` | `CK_PersonasRepositorio_Concepto` | `([Concepto] IS NULL OR ([Concepto]='ASISTODO' OR [Concepto]='SERVICIO' OR [Concepto]='CUOTA_SOCIAL'))` |
| `PersonasRepositorio` | `(Tabla)` | `CK_PersonasRepositorio_ManualConMotivo` | `([TipoMovimiento] IS NULL OR [Motivo] IS NOT NULL AND ltrim(rtrim([Motivo]))<>'')` |
| `PersonasRepositorio` | `Monto` | `CK_PersonasRepositorio_MontoNumerico` | `([Monto] IS NULL OR NOT [Monto] like '%[^0-9]%')` |
| `PersonasRepositorio` | `TipoMovimiento` | `CK_PersonasRepositorio_TipoMovimiento` | `([TipoMovimiento] IS NULL OR ([TipoMovimiento]='BONIFICACION' OR [TipoMovimiento]='CANCELACION_MORA' OR [TipoMovimiento]='AJUSTE_NEGATIVO' OR [TipoMovimiento]='AJUSTE_POSITIVO' OR [TipoMovimiento]='PAGO_MANUAL'))` |

---

## 4. Claves Foráneas (`sys.foreign_keys`)

| Tabla Origen | Columna Origen | Nombre Restricción | Tabla Referenciada | Columna Referenciada |
|---|---|---|---|---|
| `CuentaCorrienteDesglose` | `IdMovimiento` | `FK_CCDesglose_Movimiento` | `dbo.PersonasRepositorio` | `Id` |
