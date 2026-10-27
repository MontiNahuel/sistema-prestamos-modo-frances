-- ===========================================================================
-- ORDEN SECUENCIAL DE INSTALACIÓN DDL COOPYA
-- Base de datos objetivo: SQL Server 2019+
-- Todos los scripts son idempotentes y preservan dependencias transitivas.
-- ===========================================================================

-- 1. TIPOS DE TABLA DE USUARIO (Requeridos por Procedimientos)
:r types/DesgloseConceptoType.sql
:r types/PresentacionBaproDetalleType.sql
:r types/PresentacionNacionDetalleType.sql
:r types/RespuestaBaproImputacionType.sql
:r types/RespuestaNacionDetalleType_Resp.sql
:r types/ClienteCuentaCorrienteTableType.sql
:r types/MedioPagoTableType.sql
:r types/TelefonoTableType.sql
:r types/DniExcluidoTableType.sql
:r types/FiltroMasivoTableType.sql
:r types/AnsesNovedadesDetTableType.sql
:r types/AnsesRespuestasDetTableType.sql
:r types/PersonasApiAuditoriaDetalleTipo.sql
:r types/PresentacionComercioDetalleType.sql
:r types/PresentacionIcbcDetalleType.sql
:r types/RespuestaComercioDetalleType.sql

-- 2. TABLAS MAESTRAS Y CATÁLOGOS BASE
:r schema/Usuarios.sql
:r schema/UsuarioSesion.sql
:r schema/TipoPlanesCs.sql
:r schema/TipoPlanesServicios.sql
:r schema/TipoPlanesAsistodo.sql
:r schema/Personas.sql
:r schema/MediosDePago.sql

-- 3. TABLAS DE PRESENTACIONES Y AUDITORÍA
:r schema/PresentacionBaproAuditoria.sql
:r schema/PresentacionBaproArchivos.sql
:r schema/PresentacionNacionAuditoria.sql
:r schema/PresentacionNacionAuditoriaDetalle.sql
:r schema/PresentacionNacionArchivos.sql
:r schema/PresentacionIcbcAuditoria.sql
:r schema/PresentacionIcbcAuditoriaDetalle.sql
:r schema/PresentacionComercioAuditoria.sql

-- 4. CUENTA CORRIENTE Y MOVIMIENTOS
:r schema/PersonasRepositorio.sql
:r schema/CuentaCorrienteDesglose.sql

-- 5. FUNCIONES ESCALARES Y DE TABLA
:r functions_views/ObtenerIdUsuarioPorToken.sql
:r functions_views/fnDatosDeConcepto.sql

-- 6. PROCEDIMIENTOS ALMACENADOS
:r procedures/VerificarExisteRespuestaNacion.sql
:r procedures/InsertarPresentacionBaproAuditoria.sql
:r procedures/InsertarPresentacionNacionAuditoria.sql
:r procedures/ActualizarRespuestaNacionDetalleLote.sql
:r procedures/ImputarRespuestaBaproLote.sql
:r procedures/ImputarRespuestaNacionLote.sql
:r procedures/sp_GetCuentaCorrientePersona.sql
:r procedures/sp_GetCuentaCorrienteResumen.sql
