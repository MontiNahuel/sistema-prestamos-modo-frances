# Revisión del paquete CoopYa y pedido de correcciones para la IA de origen

> Actualización 2026-10-27: se recibió y revisó V2. Este documento conserva la auditoría V1; no reenviar todos sus pedidos como si siguieran sin respuesta. Estado actual y trabajo pendiente: [CONTINUIDAD_COOPYA_V2.md](CONTINUIDAD_COOPYA_V2.md). Evidencia seleccionada V2: [coopya-v2/README.md](coopya-v2/README.md). Los 82 archivos del manifiesto V2 verificaron tamaño y SHA-256. Se implementaron correcciones locales y se deshabilitó por defecto la confirmación bancaria hasta homologación; no se ejecutaron propuestas SQL en CoopYa.

Fecha: 2026-10-27.
Paquete revisado: `coopya-integracion-respuestas-2026-10-27.zip`.
Destinatario: IA que mantiene CoopYa y exportó el paquete de integración.

## 1. Resultado de la revisión

El paquete aporta los procedimientos de imputación que faltaban y permite conocer buena parte del comportamiento actual. Sin embargo, **todavía no permite reconstruir y verificar exactamente el circuito completo ni integrar préstamos franceses sin cambios**.

Se verificaron tamaño y SHA-256 de las 60 entradas del manifiesto: todas coinciden. Eso confirma integridad interna del paquete, no que los objetos sean los desplegados ni que los ejemplos hayan sido ejecutados.

Esta revisión fue estática: lectura del C#, SQL, documentación, archivos bancarios y modelos del sistema francés. Se extrajeron los campos posicionales de los TXT de ejemplo. No se ejecutó SQL contra una base, no se procesaron cobros y no se modificaron aplicaciones. Las consecuencias SQL señaladas abajo son deducciones del código exportado, no pruebas ejecutadas en SQL Server.

**Pedido:** entregar una versión corregida del paquete y un nuevo `RESPUESTA_PARA_IA_INTEGRACION_COOPYA_V2.md`, dirigido a la IA del sistema francés, respondiendo cada hallazgo por su identificador. Separar:

- Correcciones de documentación/exportación que no requieren cambiar la aplicación.
- Comportamientos actuales que se confirman expresamente, incluso si tienen limitaciones.
- Cambios de aplicación propuestos, con migraciones y pruebas para un entorno aislado; no desplegarlos en producción como parte de este pedido.
- Decisiones funcionales pendientes que requieren aprobación del responsable.

No declarar el paquete «100% autocontenido/verificado» si faltan dependencias o pruebas. No reemplazar código original por propuestas sin identificar la diferencia.

## 2. Contrato que sí podemos tomar del SQL recibido

| Tema | Comportamiento observado | Evidencia dentro del ZIP |
|---|---|---|
| Identidad BAPRO | `NroArchivo + ReferenciaDebito + TRY_CAST(IdentificadorCliente AS BIGINT)` | `sql/procedures/ImputarRespuestaBaproLote.sql`, sección 1 |
| Identidad Nación | Presentación seleccionada, sucursal + sistema + cuenta + importe; detalles con `CodigoRespuesta IS NULL` | `sql/procedures/ImputarRespuestaNacionLote.sql`, secciones 2–5 |
| Cuenta corriente | Actualiza movimientos existentes por `Banco + PresentacionId_Det`; `RespuestaId` es el ID del detalle | Ambos procedimientos de imputación |
| Bancos persistidos | `BAPRO`, `NACION` | Ambos procedimientos |
| Exclusión mutua | Bloqueo por presentación, dueño transacción, espera máxima configurada de 15 segundos | Ambos procedimientos, `sp_getapplock` |
| Repetición de lote | Si ya existe archivo de tipo `RESPUESTA`, rechaza la nueva carga | Ambos procedimientos, control anterior a la imputación |
| Marca transaccional | Se inserta al final, solamente si `@RutaArchivo` no es nula ni vacía | Ambos procedimientos |
| Desglose | Se crea al generar la presentación y valida su suma contra el importe del renglón dividido por 100 | `InsertarPresentacionBaproAuditoria.sql`, `InsertarPresentacionNacionAuditoria.sql` |
| Estado del desglose consultado | Cobrado/rechazado/pendiente se deriva de `PersonasRepositorio.Resultado`; no se leen los importes cobrados/rechazados persistidos en el desglose | `sp_GetCuentaCorrienteResumen.sql`, sección B |
| Unidades | Importe bancario y `PersonasRepositorio.Monto`: texto numérico en centavos; desglose: decimal en pesos | Generación y `MontoPesos` del resumen |

Este contrato no justifica cambiar silenciosamente el comportamiento de los casos conflictivos siguientes.

## 3. Correcciones y faltantes bloqueantes del paquete

### EXP-01 — DDL incompleto y al menos un índice inválido

Evidencias:

- `sql/schema/PersonasRepositorio.sql`: el índice `IX_PersonasRepositorio_IdPersona_FechaInsert` declara `Resultado varchar(max)` como columna clave. SQL Server no admite ese tipo como clave de índice. La exportación puede haber confundido columnas clave e incluidas; no podemos asumir cuál era el índice real.
- `sql/schema/CuentaCorrienteDesglose.sql`: `ImporteCobrado` e `ImporteRechazado` son `NOT NULL`, no tienen `DEFAULT` exportado y los dos procedimientos de generación omiten esas columnas en el INSERT.
- `sql/schema/PresentacionBaproAuditoria.sql`: `SumarMora` es `NOT NULL`, sin valor predeterminado exportado, y el INSERT de generación lo omite.
- Los scripts no preservan filtros de índices ni valores predeterminados. El índice único de `PersonasRepositorio` no tiene filtro en el paquete; hay que confirmar su definición real, especialmente para movimientos manuales sin detalle bancario.

Solicitado:

1. Reexportar DDL con una herramienta que preserve definiciones, no reconstruir índices concatenando todas las columnas.
2. Incluir `DEFAULT`, `CHECK`, claves foráneas, columnas incluidas (`INCLUDE`), filtros, unicidad, orden y opciones relevantes.
3. Adjuntar inventario de `sys.indexes`, `sys.index_columns`, `sys.default_constraints`, `sys.check_constraints` y `sys.foreign_keys`, sin datos personales.
4. Probar la creación y generación de una presentación con desglose en una base vacía aislada. Entregar log de éxito o errores exactos; no inventar valores predeterminados para que compile.

### EXP-02 — Dependencias todavía ausentes

Faltan definiciones necesarias para el circuito exportado:

- `dbo.fnDatosDeConcepto`, llamada por ambos procedimientos de generación mediante `OUTER APPLY`.
- `dbo.MediosDePago`, usada por generación Nación para resolver persona.
- `dbo.Personas`, `dbo.TipoPlanesCs`, `dbo.TipoPlanesServicios`, `dbo.TipoPlanesAsistodo` y `dbo.Usuarios`, usadas por el resumen.
- `dbo.PresentacionIcbcAuditoriaDetalle`, `dbo.PresentacionIcbcAuditoria`, `dbo.PresentacionComercioAuditoria`, referenciadas por el resumen aunque la integración objetivo sea BAPRO/Nación.
- `dbo.UsuarioSesion` y su índice `IDX_UsuarioSesion_Token`, requerido explícitamente por `ObtenerIdUsuarioPorToken`.
- Objetos y contratos de creación de movimientos manuales/ajustes necesarios para la reversión que propone `pendientes.md`.

Solicitado: exportar esquemas y dependencias transitivas, sin usuarios, sesiones ni credenciales reales. Entregar orden de instalación completo. Si se propone un resumen reducido para bancos locales, entregarlo separado y documentar que es una adaptación, no una réplica literal.

### EXP-03 — Ejemplo BAPRO incompatible con su resultado esperado

En `ejemplos/BAPRO/caso-01/respuesta.txt`, ambas líneas contienen `00000000001205` en posiciones 11–24. El parser C# extrae ese campo como `NumeroSecuencial`; `Servicio.cs/ProcesarRespuestaBaproAsync` lo envía como `IdentificadorCliente`.

Sin embargo, `antes.json`/`despues_esperado.json` usan `IdentificadorCliente` `100052` y `100088`. El SQL requiere igualdad numérica con el identificador extraído: estos datos no justifican los dos actualizados esperados; con esas filas y sin otras coincidencias, serían no encontrados.

Además:

- El JSON usa `CBU` y `FechaCarga` en auditoría en lugar de las columnas efectivas de la tabla.
- `FechaVencimiento` aparece como fecha ISO, aunque la columna bancaria es `varchar(8)` y generación interpreta `DDMMAAAA`.
- `PersonasRepositorio` contiene `NroArchivo` y `Fecha`, columnas que no figuran en su DDL.
- `Monto` aparece en pesos y `TipoMovimiento = 'DEBITO'`; generación bancaria inserta el texto de centavos y deja `TipoMovimiento` nulo. El resumen considera manual cualquier valor no nulo y no atribuye cobertura bancaria a `DEBITO`.

Solicitado: regenerar TXT, filas iniciales y resultados desde un mismo caso consistente y con nombres/unidades reales. Separar DTO de presentación de filas de base de datos. Incluir el desglose y la salida real de cuenta corriente.

### EXP-04 — Ejemplo Nación con importes y estructura inconsistentes

Los campos de los detalles del TXT y del JSON son `000000000150000` y `000000000095000`. Expresados en centavos equivalen a **$1.500 y $950**, no a los **$15.000 y $9.500** de `caso.md` y del resultado esperado.

El pie contiene `000000000245000`: $2.450. Los JSON de cuenta corriente tienen además los problemas de nombres de columnas, pesos frente a centavos y `TipoMovimiento='DEBITO'` del caso BAPRO.

La cabecera JSON usa nombres simplificados (`TotalDebitar`, `FechaTopeRendicion`, etc.) que no son los nombres `Cab_...` y `Pie_...` del esquema exportado.

Solicitado: corregir coherentemente importes, pie, filas y salida esperada; adjuntar resultados ejecutados o marcar claramente `NO PROBADO`.

### EXP-05 — Formatos documentados no equivalen al parser implementado

- El documento describe ANSI/Windows-1252. Los controllers usan `new StreamReader(file.OpenReadStream())` sin esa codificación explícita. Precisar codificación efectivamente recibida y decodificada, con un ejemplo no ASCII; no dar por equivalentes los contratos.
- BAPRO omite líneas cortas, tipos no reconocidos y excepciones de parseo; no valida rígidamente 163 caracteres exactos.
- Nación usa `PadRight(128)` y no comprueba totales del pie en el parser recibido. Aclarar qué validaciones existen realmente y cuáles serían mejoras.
- Confirmar el significado real del pie Nación: el ejemplo nuevo totaliza todos los detalles; nuestro parser actual valida aplicados y rechazados por separado a partir de ejemplos anteriores. Entregar evidencia por variante para resolver la diferencia, no flexibilizarlo sin criterio.
- Confirmar moneda/sistema de cuenta Nación: el nuevo ejemplo usa moneda `1` y sistema `02`; nuestra implementación exige `P` y tiene su propia conversión de cuentas. Entregar catálogo y ejemplos de las variantes realmente utilizadas.
- Corregir la distinción entre campos BAPRO documentados como identificador/referencia y el campo que realmente se envía al SQL, evidenciada en EXP-03.

No hace falta inventar una especificación bancaria general: documentar la evidencia disponible y señalar dónde falta manual del banco. No tratar la afirmación «nunca hay pagos parciales bancarios» como prueba suficiente para reglas universales.

## 4. Diferencias funcionales que requieren decisión o corrección

### FUN-01 — Nación: ambigüedad y respuestas contradictorias

`ImputarRespuestaNacionLote.sql` aborta cuando `Pendientes > 1`, sin condicionar esa decisión a códigos distintos. El informe y `formatos/NACION.md` afirman lo contrario.

Por otra parte, el procedimiento calcula `CodigosDistintos` pero no lo utiliza. Con un único detalle pendiente y dos respuestas de la misma clave con códigos `0` y `9`, elige `MIN(CodigoRespuesta)`: seleccionaría `0`. Los duplicados también pueden inflar `NoEncontrados` porque resta cantidad de detalles actualizados a cantidad de filas recibidas.

Solicitado:

- Corregir la descripción del comportamiento vigente.
- Preparar pruebas de dos candidatos con códigos iguales, dos candidatos con códigos distintos y un candidato con respuestas contradictorias.
- Proponer rechazo transaccional de contradicciones, con decisión explícita sobre duplicados idénticos y semántica de contadores. Identificarlo como cambio respecto del SQL actual.

### FUN-02 — BAPRO: múltiples respuestas para un mismo detalle

La ambigüedad actual verifica cuántos detalles corresponden a cada fila. No impide que distintas filas de respuesta, con diferente `Orden`, apunten al mismo `IdUnico` y tengan códigos incompatibles. El `UPDATE ... JOIN #Imputables` no establece precedencia para ese caso.

Solicitado: confirmar regla para duplicados idénticos y contradictorios, entregar pruebas y una propuesta determinista que no elija arbitrariamente entre cobro y rechazo.

### FUN-03 — Reversión posterior bloqueada por idempotencia de lote

BAPRO permite `CodigoActual='OK' AND EsReversion=1` en la selección de imputables, pero antes rechaza cualquier lote que ya tenga marca `RESPUESTA`. Por ello, una segunda carga normal para revertir una respuesta exitosa del mismo lote no llega a esa regla.

Solicitado: mostrar el flujo real que permite una reversión posterior, con presentación, respuesta original, marca de archivo y segunda respuesta. Si solo funciona con datos históricos sin marca o mediante otro circuito, declararlo. Si requiere una extensión, proponer eventos de respuesta/reversión auditables y su idempotencia, sin borrar marcas históricas.

También definir qué sucede con respuestas incompletas y archivos totalmente ajenos: el SQL puede marcar el lote aunque no haya actualizado todos sus detalles, impidiendo otra carga normal.

### FUN-04 — Estado Nación `7` y otros: informe versus cuenta corriente

La imputación cuenta códigos distintos de `0`/`9` como `SinRespuesta`, pero guarda el código en el detalle y el movimiento. `sp_GetCuentaCorrienteResumen` considera `PENDIENTE` solo nulo/vacío, `COBRADO` solo `OK`/`0`, y todo otro código `RECHAZADO`. Por tanto, `7` aparece como rechazado en esa consulta, no como pendiente como afirma el informe.

Solicitado: definir estado canónico y transiciones, corregir documentación y, si corresponde, proponer cambios coordinados en SQL/UI. Incluir caso `7` seguido de resolución definitiva y explicar cómo supera el bloqueo de segunda respuesta del lote.

### FUN-05 — `PRESTAMO_CUOTA` no queda integrado automáticamente en el resumen

El informe recomienda agregar ese concepto y afirma que el resumen lo totalizará correctamente. Sin embargo:

- `#Conceptos` se llena únicamente con `CUOTA_SOCIAL`, `SERVICIO` y `ASISTODO`.
- El calendario se crea desde fechas de esos planes. Una persona que solo tenga préstamo puede quedar sin obligaciones de calendario, aunque su cobro sí incremente cobertura; esto puede producir un saldo negativo sin representar la deuda del préstamo.
- La obligación presentada se agrupa por concepto y mes, tomando el máximo entre presentaciones. No distingue cada préstamo/cuota como obligación independiente. Dos préstamos del mismo concepto en presentaciones separadas pueden quedar subcontados.
- La salida de conceptos no incorpora automáticamente el préstamo ni su cronograma.

Solicitado: diseñar una extensión explícita que obtenga obligaciones del cronograma contractual, diferencie préstamo/cuota y distinga reintentos de nuevas obligaciones. No usar la sola presencia de un débito presentado como fuente completa de deuda: también hay cuotas aún no presentadas.

Entregar casos con persona solo con préstamo, dos préstamos en el mismo mes, débito mixto, cuota no presentada, reintento rechazado, cuota variable, pago manual y reversión. Mostrar saldo de capital, saldo total y obligaciones por separado.

### FUN-06 — ID del préstamo incompatible con `PlanId INT`

En el sistema francés, `Prestamo.id` y `Cuota.id` son UUID en `String(36)`. El paquete recomienda guardar el ID del préstamo en `PlanId`, pero ese campo es `INT` tanto en el tipo tabla como en el desglose.

Solicitado: acordar un contrato de equivalencias o una referencia externa tipada. No truncar, convertir ni generar un hash entero del UUID. Propuesta a evaluar: tabla de correspondencias con sistema de origen, UUID de préstamo/cuota, ID externo estable y restricciones únicas. Separar identidad de plan, préstamo y cuota.

Definir también equivalencia entre `socios.id` local y `Personas.Id`, propietario de los números de presentación, colisiones entre bases, y trazabilidad de movimientos históricos. Los campos locales `movimiento_coopya_id`/`desglose_coopya_id` no resuelven por sí solos reintentos y múltiples eventos de una cuota.

### FUN-07 — Ajustes manuales y definición de resumen

`pendientes.md` propone `TipoMovimiento='AJUSTE'/'REVERSION'` para Nación, pero la fórmula de cobertura/cargos del resumen reconoce `PAGO_MANUAL`, `AJUSTE_NEGATIVO`, `CANCELACION_MORA`, `BONIFICACION` y `AJUSTE_POSITIVO`. Los tipos propuestos no tienen efecto explícito equivalente en esa fórmula.

Solicitado: exportar el circuito efectivo de ajustes, permisos, vínculo al original, signo, conceptos y efecto contable. Si no existe, proponerlo como nueva funcionalidad y probarlo. No añadir un texto de tipo de movimiento asumiendo que cambia el saldo.

El resumen devuelve **seis conjuntos**, no cuatro: cabecera, totales, conceptos, calendario, movimientos y desglose. `Gestion.cs` consume esos seis. Corregir el contrato documentado, incluido el nombre real `Saldo` y sus componentes.

## 5. Cambios necesarios en nuestro sistema francés

Estos cambios corresponden a nuestro repositorio; no se solicita que la IA de CoopYa los implemente sin acceso y autorización. Deben planificarse contra el contrato acordado, no contra ejemplos inconsistentes.

| Área local | Cambio requerido |
|---|---|
| `backend/app/features/respuestas_bancarias/service.py` | Reemplazar asignación manual Nación por relación previa con detalle de presentación persistido; alinear búsqueda BAPRO con referencia e identificador de cliente. |
| Generación/importación de presentaciones | Incorporar auditoría Nación y persistir persona, obligación y desglose antes de recibir respuesta. Conservar correspondencia bancaria sin inferir cuota por importe. |
| Modelos y migraciones | Incorporar equivalencias con IDs CoopYa y eventos/reintentos; no confundir UUID de carga con `RespuestaId` del detalle. Mapear `BNA` a `NACION` en el contrato. |
| Idempotencia y transacciones | Alinear contrato de lote y controles de ambigüedad; impedir dobles cobros entre circuitos. La regla actual única por hash de operación no reproduce eventos de reversión. |
| Contabilización | Sustituir reparto proporcional implícito por desglose contractual preexistente y regla acordada; revertir exactamente la aplicación original sin borrar otros pagos. |
| `backend/app/features/respuestas_bancarias/parser.py` | Resolver diferencias de moneda, pie, códigos, codificación, tolerancia y límite de tamaño con casos válidos. Toda validación más estricta debe documentarse como divergencia deliberada. |
| Archivo y permisos | Conservar TXT y hash con acceso protegido, operador y fechas separadas; permisos específicos por banco. Resolver fallo de almacenamiento sin repetir imputación. |
| `frontend/src/features/respuestas/RespuestasPanel.tsx` | Mantener vista previa, exigir presentación de origen y mostrar incidencias; quitar elección improvisada de cuota. Distinguir contadores del archivo de movimientos efectivamente actualizados. |
| Cuenta corriente/reportes | Separar deuda total, capital pendiente y desglose; conciliar cobros manuales, bancarios y reversión sin doble cómputo. |
| Migración de lo existente | Inventariar y conciliar respuestas ya aplicadas antes de habilitar el nuevo circuito; no reprocesarlas automáticamente ni eliminar historia. |

Archivos locales comprobados: `respuestas_bancarias/model.py`, `service.py`, `parser.py` y `prestamos/model.py`. El circuito actual usa UUID, asignación manual Nación, controles BAPRO de CBU/CUIT/importe, fecha de cobro elegida por usuario y contabilidad local por cuota. No es una réplica del modelo recibido.

## 6. Entregable V2 solicitado a la otra IA

Entregar `coopya-integracion-respuestas-v2-AAAA-MM-DD.zip`, con:

1. **`RESPUESTA_PARA_IA_INTEGRACION_COOPYA_V2.md`**: respuesta punto por punto a EXP-01…05 y FUN-01…07, con estado `CORREGIDO`, `CONFIRMADO COMO ACTUAL`, `PROPUESTA PENDIENTE` o `NO DISPONIBLE`, evidencia y limitaciones.
2. `sql/original_actual/`: exportación completa fiel y ejecutable con sus dependencias. Mantener separado el código histórico.
3. `sql/propuestas/`: migraciones sugeridas para defectos/extensiones, reversibilidad y efecto sobre datos existentes. No mezclarlas con objetos desplegados.
4. `pruebas/`: instalación aislada, datos sintéticos, comandos de ejecución, aserciones, resultados obtenidos y errores. No declarar una prueba ejecutada si solo se razonó sobre ella.
5. `ejemplos/`: TXT originales de formato preservado, TVP exacto producido por el parser, filas reales por tabla antes/después y los seis resultados de cuenta corriente; todo sintético o anonimizado coherentemente.
6. `contrato/`: correspondencias de persona/préstamo/cuota, tipos/unidades, estados, idempotencia y versión; definir si la futura integración será por API o base compartida y quién será responsable único de cada escritura. Si no está decidido, presentar alternativas y dejar la decisión abierta.
7. `manifest.json`: tamaños y SHA-256 recalculados; versión/commit del código, metadatos de extracción y objetos. Indicar qué evidencia demuestra coincidencia con la aplicación desplegada; aquí no se pudo verificar independientemente.

Matriz mínima de pruebas: éxito/rechazo por banco, duplicado idéntico, duplicado contradictorio, múltiples candidatos, cero coincidencias, carga simultánea, lote incompleto, segunda carga, reversión posterior, estado Nación `7`, fallo antes del commit y fallo de disco después, persona sin planes y con préstamo, dos préstamos, débito mixto y ajuste manual.

No incluir credenciales, tokens, sesiones, backups completos ni datos personales reales. No ejecutar migraciones ni cobros en producción. Para cada modificación funcional propuesta, pedir aprobación antes de desplegarla.

## 7. Condición para iniciar la réplica definitiva

Podemos avanzar con el diseño de interfaces, trazabilidad y pruebas de compatibilidad, pero no certificar equivalencia ni habilitar imputación real hasta contar con:

- DDL completo que se instale y funcione en una base aislada.
- Ejemplos que atraviesen parser → TVP → SQL → cuenta corriente con resultados coherentes.
- Decisión documentada sobre duplicados, reversiones y estados intermedios.
- Contrato viable de IDs y obligaciones de préstamos franceses.

**Conclusión:** hay cambios en ambos frentes: corregir/completar el paquete de origen y adaptar nuestro sistema. Copiar literalmente lo recibido hoy reproduciría contradicciones y no resolvería la deuda de préstamos franceses. La nueva respuesta debe volver en un `.md` para la IA receptora, respaldado por los archivos corregidos y pruebas.**
