# Especificación de Formato de Archivo BAPRO (Banco Provincia) - Versión 2

## 1. Características Generales
* **Longitud fija de registro:** 163 caracteres (bytes ANSI / ASCII).
* **Final de línea:** `CRLF` (`\r\n`).
* **Codificación:** ANSI / Windows-1252.
  * *Nota de auditoría de implementación:* El controlador en C# utiliza `new StreamReader(file.OpenReadStream())` sin especificar codificación, lo que por defecto adopta UTF-8 en .NET Core. Para archivos con caracteres especiales (ñ, acentos), se recomienda en C# instanciar `new StreamReader(stream, Encoding.GetEncoding("Windows-1252"))`.
* **Tipos de Registros por Código Interno (posiciones 1-2):**
  * `71`: Presentación de Débito Directo (Envío de la empresa).
  * `72`: Rendición normal de Débito Directo (Respuesta bancaria estándar).
  * `52`: Resultado de Débito (Rechazo / Reversión).
  * `54`: Rechazo de Reversión Originante.
  * `55`: Reversión desde Entidad Receptora.
  * `68`: Rechazo de Reversal.
  * `69`: Reversión solicitada por el Banco.

---

## 2. Layout de Presentación (Envío Empresa - Código 71)

| # | Campo | Pos. Ini (1-based) | Longitud | Tipo | Relleno / Formato | Oblig. | Contenido en CoopYa |
|---|---|---|---|---|---|---|---|
| 1 | Código de Transacción | 1 | 2 | Numérico | Fijo `71` | Sí | `71` |
| 2 | Fecha de Vencimiento | 3 | 8 | Fecha | `DDMMAAAA` | Sí | `27102026` |
| 3 | Identificador de Envío / Secuencia | 11 | 14 | Numérico | Relleno con ceros izq. | Sí | `00000000100052` (ID Socio / Cliente formateado a 14 dígitos) |
| 4 | Identificador de Cliente | 25 | 14 | Alfanum. | Relleno espacios der. | Sí | `100052        ` |
| 5 | Moneda | 39 | 1 | Numérico | Fijo `0` (Pesos) | Sí | `0` |
| 6 | CBU Completo de la Cuenta | 40 | 22 | Numérico | 22 dígitos | Sí | `0140303703694950708052` |
| 7 | Importe a Debitar | 62 | 10 | Numérico | 8 enteros + 2 dec (centavos) | Sí | `0001250000` ($12.500,00) |
| 8 | CUIT de la Empresa | 72 | 11 | Numérico | 11 dígitos | Sí | `30690754386` |
| 9 | Concepto del Débito | 83 | 10 | Alfanum. | Texto | Sí | `CUOTASOC  ` |
| 10| Referencia de Débito | 93 | 15 | Alfanum. | Clave unívoca | Sí | `014cs0000000101` |
| 11| Reservado / Espacios | 108 | 37 | Alfanum. | Espacios en blanco | No | `                                     ` |
| 12| Nombre / Razón Social Empresa | 145 | 16 | Alfanum. | Justificado a izquierda | Sí | `COOPCREDITOYALTD` |
| 13| Relleno Final | 161 | 3 | Alfanum. | Espacios en blanco | No | `   ` |

Total: **163 caracteres**.

---

## 3. Layout de Rendición / Respuesta Bancaria (Códigos 72, 52, 54, 55, 68, 69)

| # | Campo | Pos. Ini (1-based) | Longitud | Mapeo C# (`ParseadorRespuestaBapro.cs`) | Mapeo SQL (`RespuestaBaproImputacionType`) |
|---|---|---|---|---|---|
| 1 | Código Transacción | 1..2 | 2 | `CodigoInterno` | - |
| 2 | Fecha Proceso | 3..10 | 8 | `FechaVencimiento` | - |
| 3 | Secuencia / Identificador | 11..24 | 14 | `NumeroSecuencial` (`linea.Substring(10, 14).Trim().TrimStart('0')`) | **`IdentificadorCliente`** |
| 4 | Id Cliente Secundario | 25..38 | 14 | *(No leído por el parser actual)* | - |
| 5 | Moneda | 39 | 1 | - | - |
| 6 | CBU Cuenta | 40..61 | 22 | `CBU` | - |
| 7 | Importe Procesado | 62..71 | 10 | `Importe` | - |
| 8 | CUIT Empresa | 72..82 | 11 | `CuitEmpresa` | - |
| 9 | Concepto Débito | 83..92 | 10 | - | - |
| 10| Referencia Débito | 93..107 | 15 | `ReferenciaDebito` | **`ReferenciaDebito`** |
| 11| Reservado | 108..144 | 37 | - | - |
| 12| Código Respuesta | 145..147 | 3 | `CodigoRespuesta` (`'   '` u `'OK '` -> `'OK'`; otros -> código) | **`CodigoRespuesta`** |
| 13| Razón Social | 148..163 | 16 | `NombreEmpresa` | - |

Total: **163 caracteres**.

---

## 4. Reglas del Parser y Tolerancias Implementadas
1. **Líneas cortas:** Si `linea.Length < 163`, se ignora silenciosamente (`continue`).
2. **Códigos de transacción:** Solo procesa líneas que comiencen con `72`, `52`, `54`, `55`, `68`, `69`. Cualquier otra línea (cabeceras institucionales o líneas en blanco) es descartada.
3. **Mapeo a SQL:** `ImputarRespuestaBaproLote` recibe `ReferenciaDebito` e `IdentificadorCliente`. Compara numéricamente `TRY_CAST(a.IdentificadorCliente AS BIGINT) = TRY_CAST(r.IdentificadorCliente AS BIGINT)` para absorber inconsistencias de ceros a la izquierda.
