# Pedido a la IA que trabaja con CoopYa: paquete de integración de respuestas bancarias

## Tu tarea y el entregable principal

Necesito que analices la versión actual de CoopYa y su base SQL Server para documentar exactamente cómo procesa las respuestas de BAPRO y Banco Nación y cómo afectan la cuenta corriente.

**Escribí un archivo Markdown dirigido a la otra IA que implementa el sistema de préstamos franceses. Llamalo `RESPUESTA_PARA_IA_INTEGRACION_COOPYA.md`.** No alcanza con responder en el chat ni devolver solamente un backup. Ese `.md` debe ser autocontenido, explicar lo encontrado y enlazar los scripts y ejemplos exportados con rutas relativas.

El objetivo es implementar un contrato compatible para una futura unificación. No queremos inventar reglas de imputación, reversiones, saldos o identificación de personas. No modifiques la aplicación ni ejecutes imputaciones sobre datos reales: este pedido es de análisis y exportación de solo lectura.

Si no tenés acceso a algún objeto, declaralo como faltante. No reconstruyas procedimientos ausentes como si fueran originales. Diferenciá evidencia de código, evidencia de SQL, pruebas en entorno aislado e hipótesis.

## Contexto y discrepancia detectada

El ZIP recibido se llama `Pgurvi-coopya-bf80ecf28b7a.zip`. Su código C# llama a procedimientos actuales que no aparecen definidos en el dump SQL incluido, fechado el 2 de junio de 2026. Necesitamos la versión realmente desplegada y sus dependencias, no solamente el procedimiento antiguo `ActualizarRespuestaNacionDetalleLote`.

El circuito observado es presentación → detalle de presentación → movimiento de cuenta corriente → respuesta. La carga recibe `token`, `nroArchivo` y `file`. La imputación debe conservar ese vínculo; no elegir arbitrariamente una cuota al cargar el archivo.

## 1. Identificación de la versión

Incluí en tu Markdown:

- Fecha de extracción, zona horaria y entorno consultado (desarrollo/pruebas/producción, sin direcciones privadas ni credenciales).
- Commit, rama y versión de la aplicación analizada; indicá si coincide con lo desplegado.
- Versión de SQL Server y nivel de compatibilidad de la base.
- Qué fuente es autoritativa si el repositorio y la base difieren.
- Inventario de objetos exportados con esquema, nombre, tipo y fecha de modificación disponible.
- Faltantes, objetos cifrados, dependencias externas, SQL dinámico y permisos de lectura insuficientes.

## 2. SQL actual completo y dependencias

Exportá definiciones íntegras y sin truncar, incluyendo parámetros, valores predeterminados, tipos, índices, restricciones, claves, triggers, funciones y vistas necesarias. Respetá los esquemas originales. Si un objeto no existe o cambió de nombre, documentalo.

### Procesamiento de respuestas

- `ImputarRespuestaBaproLote`.
- `ImputarRespuestaNacionLote`.
- `dbo.RespuestaBaproImputacionType`.
- `dbo.RespuestaNacionDetalleType_Resp`.
- `VerificarExisteRespuestaNacion` y controles equivalentes de BAPRO.
- Procedimientos auxiliares llamados por estos objetos, incluidos los de reversión y registro de archivos.
- Si existe `ActualizarRespuestaNacionDetalleLote`, exportalo identificado como histórico o vigente, aclarando si todavía tiene llamadores.

### Generación e importación de presentaciones

- `InsertarPresentacionBaproAuditoria`.
- `InsertarPresentacionNacionAuditoria`.
- Procedimientos de importación de archivos de presentación ya generados.
- `dbo.DesgloseConceptoType` y objetos que crean o actualizan el desglose.
- Generación de `NroArchivo`, secuenciales, referencias de débito e identificadores de cliente.

### Esquema y cuenta corriente

- `PresentacionBaproAuditoria` y `PresentacionBaproArchivos`.
- `PresentacionNacionAuditoria`, `PresentacionNacionAuditoriaDetalle` y `PresentacionNacionArchivos`.
- `PersonasRepositorio` y `CuentaCorrienteDesglose`.
- `sp_GetCuentaCorrientePersona` y `sp_GetCuentaCorrienteResumen`.
- Tablas y objetos relacionados con pagos manuales, bonificaciones, mora, reversión, períodos y conceptos cuando intervengan en el saldo.
- Estructura mínima de personas, planes, cuentas bancarias y catálogos necesaria para entender las relaciones; no exportar sus datos completos.

Seguí todas las dependencias hasta que el circuito pueda entenderse sin objetos omitidos. Revisá también referencias construidas dinámicamente, que pueden no aparecer en el catálogo de dependencias.

## 3. Código actual y contrato de intercambio

Adjuntá los archivos relevantes de controladores, servicios/repositorios, parsers, DTO y pantallas de carga. Incluí al menos el equivalente vigente de:

- `CoopYa/Controllers/Procesos.cs`.
- `CoopYa/Repositorios/Servicio.cs` y `ServicioNacion.cs`.
- `CoopYa/Models/Presentaciones/Bapro/ParseadorRespuestaBapro.cs`.
- `CoopYa/Models/Presentaciones/Nacion/NacionProcesoModels.cs`.
- `DesgloseConceptoDto.cs` y `CuentaCorrienteResumenDto.cs`.
- Métodos de cuenta corriente de `Gestion.cs` y `PersonasController.cs`.
- Vistas `ProcesoPresentacionBapro.cshtml` y `ProcesoPresentacionNacion.cshtml`.

Documentá endpoints, método HTTP, campos multipart/JSON, permisos requeridos, validaciones, respuestas de éxito/error, límites de archivo y códigos de retorno. Usá ejemplos sin tokens reales. Explicá cuándo se considera confirmado el procesamiento y qué sucede si falla el guardado del TXT después del commit.

## 4. Formato exacto de archivos BAPRO y Nación

Para cada formato y variante admitida, generá una tabla con: campo, posición inicial basada en 1, longitud, tipo, relleno, unidad monetaria, obligatoriedad y ejemplo sintético. Aclarar si las posiciones cuentan bytes o caracteres.

Incluí:

- Codificación, BOM, finales de línea, longitud admitida y tratamiento de líneas vacías, cortas, largas o inválidas.
- Cabecera, detalle y cierre; validación de cantidades e importes del cierre.
- Fechas, moneda, decimales implícitos, ceros iniciales y normalización de referencias/cuentas.
- Catálogo completo de códigos bancarios y efecto real de cada uno, incluido desconocido o vacío.
- BAPRO: tratamiento de tipos `72`, `52`, `54`, `55`, `68`, `69`; referencia, identificador de cliente y reversión.
- Nación: estados `0`, `9` y otros como `7`; variantes de longitud observadas de 128/172 caracteres; uso o no del concepto de débito.
- Relación entre datos del archivo enviado y del recibido; controles que impiden cargar un archivo en la presentación equivocada.

No deduzcas reglas del nombre del código: verificá el efecto en el código/SQL actual. Adjuntá manuales bancarios o su referencia y versión si están disponibles; marcá cualquier diferencia entre especificación e implementación.

## 5. Reglas de imputación y cuenta corriente

Explicá con pseudocódigo fiel y referencias a archivos/objetos:

1. Clave y orden de búsqueda para localizar el detalle de presentación en cada banco; normalizaciones y alternativas de búsqueda.
2. Manejo de coincidencias cero, una o múltiples, repetidos dentro del archivo y filas de otras presentaciones.
3. Clave de idempotencia: repetición del mismo archivo, archivo renombrado, respuesta parcial posterior y respuesta modificada.
4. Alcance de la transacción y los bloqueos; condiciones de rollback total, procesamiento parcial, reintento y carga simultánea.
5. Matriz de transiciones: pendiente, cobrado, rechazado y revertido, incluyendo un rechazo/reversión posterior a un éxito.
6. Qué tablas y columnas cambian en cada caso y qué permanece inmutable.
7. Significado y unidad de `Monto`; significado de `RespuestaId`, `PresentacionId_Det`, `IdMovimiento`, `NroArchivo` y su unicidad por banco.
8. Diferencias entre fecha de vencimiento, impacto, cobranza, respuesta y carga; zona horaria utilizada.
9. Cómo se genera el desglose previo, cómo se asigna el cobro a conceptos y cómo se calcula saldo/cobertura/mora después.
10. Pagos parciales, anticipos, cancelaciones y devoluciones: indicá expresamente si no están soportados.
11. Redondeo, precisión, importes negativos, ajustes y conciliación de totales.
12. Compatibilidad de `BAPRO`/`NACION` con la etiqueta `BNA` del sistema nuevo.

No asumir que el importe completo de un débito pertenece a una cuota de préstamo: puede contener cuota social, servicios u otros conceptos. Si no existe el concepto de préstamo francés, proponé una extensión separada de la descripción del comportamiento actual.

## 6. Casos reproducibles con resultado esperado

Prepará casos sintéticos o anonimizados coherentes para ambos bancos. Cada caso debe contener: presentación enviada, respuesta recibida, filas relacionadas antes, filas esperadas después, resultado devuelto y saldo/desglose esperado.

Cubrir, cuando esté soportado:

- Cobro exitoso y rechazo.
- Reprocesamiento del mismo archivo y del mismo contenido con otro nombre.
- Registro sin coincidencia, coincidencia ambigua y repetido dentro del archivo.
- Respuesta con registros de varias presentaciones.
- Reversión posterior al éxito y rechazo posterior al éxito, distinguiéndolos.
- Importe distinto del presentado y pago parcial.
- Débito que contiene varios conceptos.
- Código desconocido, archivo mal formado y cierre inconsistente.
- Fallo durante la transacción, cargas simultáneas y fallo de archivo posterior al commit.

Para casos no reproducidos, marcá `NO PROBADO` y explicá el comportamiento leído en el código, sin presentarlo como verificado. Las pruebas de escritura solo pueden hacerse en una base aislada autorizada, nunca en producción.

## 7. Formato de entrega

Entregá un ZIP llamado `coopya-integracion-respuestas-AAAA-MM-DD.zip` con esta estructura:

```text
RESPUESTA_PARA_IA_INTEGRACION_COOPYA.md
manifest.json
sql/
  schema/                 # CREATE de tablas, claves e índices
  types/                  # tipos tabla usados por parámetros
  procedures/             # un archivo por procedimiento
  functions_views/        # funciones y vistas dependientes
  triggers/               # triggers, si existen
codigo/                   # archivos relevantes con sus rutas originales
formatos/
  BAPRO.md
  NACION.md
ejemplos/
  BAPRO/caso-01/
    caso.md
    presentacion.txt
    respuesta.txt
    antes.json
    despues_esperado.json
    resultado_esperado.json
  NACION/caso-01/
    ...
pendientes.md
```

Reglas de formato:

- Markdown, JSON y SQL en UTF-8. Los TXT bancarios deben conservar la codificación y los finales de línea del formato probado, declarados en `caso.md`.
- SQL completo por objeto, idealmente generado con SQL Server Management Studio: Generate Scripts → objetos seleccionados → Schema only, incluyendo índices, triggers y restricciones. No entregar únicamente capturas ni resultados truncados de una grilla.
- No ejecutar los scripts exportados en la base de origen. Indicá versión requerida y orden de creación para una base aislada.
- `manifest.json`: fecha UTC de exportación, commit, versión SQL Server y lista de archivos con ruta relativa, tamaño y SHA-256 para verificar integridad.
- JSON de filas: un arreglo por tabla con nombres de columnas originales; `null` real, fechas ISO 8601 y montos decimales como cadenas para no perder precisión. Declarar unidad (pesos/centavos), escala y zona horaria. No convertir identificadores con ceros iniciales a números.
- Los ejemplos esperados deben mostrar únicamente las filas relacionadas necesarias, no volcar toda la base. Preservar relaciones e IDs consistentes entre archivos.
- Si falta una categoría, mantenerla documentada en `pendientes.md` con motivo e impacto; no completar con datos inventados.

## 8. Privacidad y seguridad

No incluyas contraseñas, cadenas de conexión, tokens, claves privadas, certificados, `.env`, backups completos ni datos personales reales innecesarios.

Usá personas, documentos, CUIT/CUIL y cuentas bancarias sintéticos. La anonimización debe preservar longitud, relleno, ceros iniciales, relaciones entre filas y validaciones de formato cuando correspondan. Recalculá totales de control si cambiás importes. No adjuntes la tabla que permite revertir la anonimización.

Si un caso no puede anonimizarse sin perder una condición relevante, describí esa condición y prepará un ejemplo sintético equivalente. Los ejemplos no deben enviarse a ningún banco ni importarse en producción.

## 9. Estructura obligatoria de tu Markdown de respuesta

En `RESPUESTA_PARA_IA_INTEGRACION_COOPYA.md`, incluí:

1. Resumen para la IA receptora y estado de completitud.
2. Versiones y fuentes autoritativas.
3. Circuito completo de presentación, respuesta y cuenta corriente.
4. Contratos BAPRO y Nación, con enlaces a sus formatos.
5. Diccionario de tablas, identificadores, unidades y relaciones.
6. Reglas exactas de imputación, duplicados, transacciones y reversiones.
7. Cálculo de cuenta corriente y desglose por concepto.
8. Casos de prueba y resultados esperados, distinguiendo lo ejecutado de lo inferido.
9. Contrato recomendado para integrar préstamos franceses sin romper la compatibilidad; separar propuestas de reglas existentes.
10. Inventario de archivos exportados y orden de carga en un entorno aislado.
11. Faltantes y preguntas concretas que todavía impiden reproducir el comportamiento.

Cada afirmación relevante debe citar el objeto SQL o archivo y método que la respalda. Si código y base discrepan, explicá ambos y no elijas silenciosamente uno.

## Criterio de aceptación

El paquete debe permitir que la IA receptora siga un renglón desde la presentación hasta el resultado bancario y el saldo de la persona, conozca las reglas de repetición/reversión y pueda escribir pruebas reproducibles sin consultar datos reales ni adivinar lógica ausente.

**Tu entrega principal es un `.md` para la otra IA, acompañado de la evidencia exportada. Si no podés generar el ZIP completo, entregá igualmente ese Markdown con todo lo confirmado y una lista precisa de lo que falta.**
