# Especificación de Formato de Archivo Banco Nación (BNA) - Versión 2

## 1. Características Generales
* **Longitud fija de registro:** 128 caracteres (bytes ANSI / ASCII).
* **Final de línea:** `CRLF` (`\r\n`).
* **Codificación:** ANSI / Windows-1252.
* **Estructura jerárquica del archivo:**
  * Registro Tipo `1`: Cabecera de Lote (1 línea).
  * Registro Tipo `2`: Detalles de Débitos (N líneas).
  * Registro Tipo `3`: Pie de Lote con Totales de Control (1 línea).

---

## 2. Layout de Cabecera (Tipo 1)

| # | Campo | Pos. Ini (1-based) | Longitud | Formato | Descripción |
|---|---|---|---|---|---|
| 1 | Tipo Registro | 1 | 1 | Numérico | Fijo `1` |
| 2 | Casa / Sucursal Empresa | 2 | 4 | Numérico | Sucursal de radicación de cuenta empresa (ej. `0085`) |
| 3 | Tipo Producto | 6 | 2 | Numérico | Producto bancario empresa (ej. `01`) |
| 4 | Cuenta Corriente Empresa | 8 | 10 | Numérico | Número de cuenta de la cooperativa |
| 5 | Moneda | 18 | 1 | Numérico | Fijo `1` (Pesos Argentinos) |
| 6 | Identificador Archivo | 19 | 1 | Alfanum. | `E` = Envío (Presentación); `D` = Devolución (Rendición) |
| 7 | Secuencia / NroArchivo | 20 | 4 | Numérico | Número de archivo correlativo (ej. `1935`) |
| 8 | Fecha Tope Rendición | 24 | 8 | Fecha | `AAAAMMDD` (ej. `20261027`) |
| 9 | Indicador de Lote | 32 | 3 | Alfanum. | Fijo `LOT` |
| 10| Relleno | 35 | 94 | Alfanum. | Espacios en blanco |

Total: **128 caracteres**.

---

## 3. Layout de Detalle (Tipo 2)

| # | Campo | Pos. Ini (1-based) | Longitud | Presentación (Envío) | Rendición (Respuesta) | Mapeo SQL (`RespuestaNacionDetalleType_Resp`) |
|---|---|---|---|---|---|---|
| 1 | Tipo Registro | 1 | 1 | Fijo `2` | Fijo `2` | - |
| 2 | Sucursal Cliente | 2 | 4 | Numérico (ej. `0015`) | Numérico | `Det_SucursalCuentaCliente` |
| 3 | Sistema Cuenta | 6 | 2 | `01` = CC, `02` = CA | Numérico | `Det_SistemaCuenta` |
| 4 | Nro Cuenta Cliente | 8 | 11 | Numérico (11 dígitos) | Numérico | `Det_NroCuentaCliente` |
| 5 | Importe en Centavos | 19 | 15 | 13 ent + 2 dec (sin punto) | Numérico | `Det_Importe` |
| 6 | Fecha Vencimiento | 34 | 8 | `AAAAMMDD` | `AAAAMMDD` | - |
| 7 | Código Resultado | 42 | 1 | Espacio en blanco ` ` | `0` = Cobrado, `9` = Rechazo, `7` = En trámite | `CodigoRespuesta` |
| 8 | Motivo Rechazo | 43 | 30 | Espacios en blanco | Texto (ej. `FONDOS INSUFICIENTES `) | `Det_DescripcionRechazo` |
| 9 | Concepto Débito | 73 | 10 | Texto (ej. `CUOTASOC `) | Texto | - |
| 10| Relleno Libre | 83 | 46 | Espacios | Espacios | - |

Total: **128 caracteres**.

---

## 4. Layout de Pie (Tipo 3)

| # | Campo | Pos. Ini (1-based) | Longitud | Presentación | Rendición |
|---|---|---|---|---|---|
| 1 | Tipo Registro | 1 | 1 | Fijo `3` | Fijo `3` |
| 2 | Total a Debitar | 2 | 15 | Suma importes en centavos | Suma importes del lote |
| 3 | Cantidad Registros | 17 | 6 | Cantidad detalles Tipo 2 | Cantidad total detalles |
| 4 | Total No Aplicados | 23 | 15 | `000000000000000` | Suma de importes rechazados en centavos |
| 5 | Cantidad No Aplicados | 38 | 6 | `000000` | Cantidad de detalles rechazados |
| 6 | Relleno Final | 44 | 85 | Espacios en blanco | Espacios en blanco |

Total: **128 caracteres**.

---

## 5. Reglas del Parser y Comportamiento Vigente
1. **Normalización:** Cada línea leída se completa con `linea.PadRight(128)` para garantizar el acceso posicional seguro.
2. **Validación de Pie:** El parser actual no valida la consistencia matemática del pie frente a los detalles; procesa directamente cada línea Tipo 2.
3. **Identificación de Clave:** Banco Nación no provee un ID propio de la empresa en el detalle. La clave natural bancaria de resolución es estrictamente:
   `Sucursal + Sistema + NroCuenta + Importe`.
