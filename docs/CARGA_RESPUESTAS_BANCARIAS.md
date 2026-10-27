# Carga de respuesta bancaria: BAPRO y BNA

## Uso

En **Carga de respuesta**, elegir banco, número de lote, fecha efectiva del cobro y TXT. **Previsualizar** no registra pagos. Revisar las filas, elegir las cuotas de destino de BNA y presionar **Revalidar selección**. La confirmación informa cuántos cobros/rechazos se registrarán y cuántas filas quedarán sin imputar.

- COBRAR: acumula el importe en la cuota y actualiza el capital pendiente del préstamo.
- RECHAZAR: registra el rechazo; no reduce deuda ni borra cobros anteriores.
- REVISAR / CONFLICTO: no modifica saldos. Incluye referencias ambiguas, diferencias de datos, saldos insuficientes, reversiones y códigos especiales.
- DUPLICADA: operación previamente registrada, sin repetir el cobro.

La vista previa se puede descargar a Excel, incluyendo las filas que requieren revisión. El historial guarda las imputaciones, operador, archivo, lote, fecha y desglose en centavos. **Cuenta corriente local**, dentro del detalle de una carga, muestra exclusivamente los préstamos de esta aplicación (sin sumar los movimientos de CoopYa central).

No se importan préstamos ni se crean personas desde una respuesta. Los registros de personas/préstamos que sólo existen en los sistemas anteriores requieren conciliación/vinculación previa: no se asume equivalencia de IDs entre bases.

## Fuentes consultadas

ZIP `Pgurvi-coopya-bf80ecf28b7a.zip`:

- `CoopYa/Models/Presentaciones/Bapro/ParseadorRespuestaBapro.cs`.
- `CoopYa/Models/Presentaciones/Nacion/NacionRegistros.cs` y parser de respuesta Nación.
- `CoopYa/Controllers/PresentacionesController.cs`, `ResolverDatosBNADesdeCBU`.
- `CoopYa/Repositorios/ServicioNacion.cs` y `BD/copyaComp.sql` (catálogo `ArchivoBancoNacion`).
- Archivos reales de respuesta incluidos en `CoopYa/wwwroot/Presentaciones`.

Sistema anterior: `Sist Prest Win 11 2026/Clases/AdminCobrosBna.cls`, función `LecturaArchivoBNA` / lectura e imputación. El sistema anterior vincula `presentación-registro` con su préstamo/cuota; esos identificadores no son los UUID de las cuotas francesas.

Se verificó la lectura de 40 archivos BAPRO (9.767 filas) y 13 BNA (26.438 filas), sin cargarlos en ninguna base financiera. Tres archivos nombrados como respuesta en el ZIP no tienen un código de respuesta BAPRO admitido y se rechazan expresamente.

## Formatos y conciliación

BAPRO conserva el layout de 163 posiciones: CBU `[39:61]`, importe `[61:71]`, CUIT `[71:82]`, referencia `[92:107]`, código `[144:147]` (índices base cero). Se exige referencia exacta de la presentación local, CBU, CUIT e importe. No se concilia sólo por los últimos dígitos de una operación. Código 72 vacío/OK es cobro; los otros resultados normales son rechazo. Tipos 52, 54, 55, 68 y 69 quedan para revisión; no se automatizan reversiones.

BNA admite líneas de 128 o 172 posiciones, cabecera 1 con identificador D y moneda P, detalles 2 y pie 3. Los archivos reales totalizan en el pie los aplicados (estado 0) y rechazados (9) por separado. Otros estados, incluido 7, quedan para revisión. Se validan cantidades e importes contra esos grupos; no se ignoran líneas defectuosas.

La cuenta BNA se obtiene del CBU local 011 usando el catálogo de CoopYa: código BCRA `cbu[4:7]` → sucursal BNA, sistema CA, cuenta `cbu[10:21]`. La lectura del catálogo es sólo de consulta y usa la conexión CoopYa ya configurada. Si falta el catálogo/conexión, se informa y no se permiten coincidencias aproximadas. No se equiparan la sucursal BCRA y la sucursal BNA por su número.

Como todavía no hay presentaciones BNA locales que guarden el UUID de cuota, el operador elige el destino entre las cuotas compatibles con la cuenta completa; cuando el archivo trae vencimiento, también se verifica. Una fila puede imputarse a una cuota, no repartirse automáticamente entre préstamos o conceptos ajenos a este sistema. Importes mayores al saldo quedan para revisión.

## Integridad

Importes enteros en centavos. Las partes cobradas se acumulan: PARCIAL hasta completar la cuota; PAGADA al llegar al total; FINALIZADO al cancelar todas las cuotas por pago. Los rechazos posteriores no reemplazan ese estado si ya hubo cobros. Las nuevas presentaciones BAPRO y los cobros manuales usan el saldo restante.

Distribución proporcional acumulativa: capital = piso(pagado × capital / cuota); el resto se divide proporcionalmente entre interés e IVA, dejando el residual en IVA. Cada incremento es no negativo y al completar la cuota coincide exactamente con el contrato. Esta política está indicada en pantalla; no se presenta como una regla normativa del banco.

La cuenta corriente local calcula deuda total (capital + intereses + IVA) menos los cobros efectivos. El campo de saldo del préstamo sigue representando **capital pendiente**, por lo que no debe usarse para inferir el total ya cobrado.

Confirmación transaccional: encabezado, detalle, cuota, préstamo y resultado BAPRO se confirman o revierten juntos. Se vuelve a calcular la vista previa y se rechaza una revisión obsoleta. Bloqueo transaccional compartido con cobros manuales, cancelaciones y generación BAPRO (`sp_getapplock` en SQL Server; `BEGIN IMMEDIATE` en las pruebas SQLite). Índice único de operación bancaria como segunda barrera. Cambiar el nombre del archivo no permite duplicar operaciones; respuestas contradictorias requieren conciliación.

Las respuestas cargadas por el circuito BAPRO anterior con código ya registrado quedan para revisión, para no repetir cobranzas que no tienen un asiento en el nuevo historial. El endpoint anterior `/presentaciones-bapro/cargar-respuesta` devuelve 410 y el botón de presentación conduce a la pantalla unificada.

## Puesta en marcha

> **Actualización V2 (2026-10-27): no habilitar imputación productiva siguiendo únicamente este documento histórico.** Ver [CONTINUIDAD_COOPYA_V2.md](CONTINUIDAD_COOPYA_V2.md). La confirmación ahora está deshabilitada por defecto (`RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED=False`); Nación solo admite revisión y ya no permite selección manual de cuotas. El límite es 10 MB / 100.000 registros. Se aceptan las variantes Nación `P`/`1` y pies de aplicados/presentados, conservando validación. BAPRO exige también identificador de cliente y se bloquea el lote completo ante incidencias. La nueva migración `d27b10f6a501` conserva bytes originales transaccionalmente. Las reglas anteriores de este documento describen el prototipo, no una equivalencia homologada con CoopYa.

El frontend local usa `http://10.16.2.18:8001`; ese servidor debe recibir también estos cambios de backend. Mientras no esté actualizado, la pantalla informa que la funcionalidad todavía no está habilitada.

1. Instalar dependencias de `backend/requirements.txt` en el entorno del servidor.
2. Con su `DATABASE_URL` de **PrestamosDB**, ejecutar `python -m alembic upgrade head` **antes de arrancar la nueva versión**. La revisión `c19e62a4b230` añade `respuestas_bancarias` y `respuestas_bancarias_detalle`; no transforma cobranzas anteriores.
3. Reiniciar el backend y publicar el frontend compilado. El arranque existente también registra estos modelos en `Base.metadata`.
4. Verificar sesión CoopYa real y conexión de consulta a `ArchivoBancoNacion` para BNA. Las sesiones de desarrollo/fallback no autorizan estas operaciones. El cliente de conexión CoopYa existente usa autenticación de dominio Windows; otros entornos necesitan una conexión de dominio compatible antes de habilitar BNA.

No se aplicó la migración al servidor remoto ni se procesaron cobranzas reales durante el desarrollo. Sólo se modifican la cuenta corriente y los préstamos **locales**: esta carga no escribe en Oracle ni replica cobros al monolito central.

## Verificación

`backend/tests/test_respuestas_bancarias.py` usa SQLite y datos sintéticos: parsing, controles de archivo, vista sin escrituras, pagos parciales, centavos, rechazo, duplicados, revisión obsoleta, transacción revertida, asignación BNA, cobro manual restante, dos confirmaciones concurrentes y flujo HTTP hasta la cuenta corriente. Los casos del endpoint nuevo sustituyen al circuito de imputación BAPRO directo.

La semántica de bloqueo y el DDL de SQL Server quedan preparados; la prueba de concurrencia se ejecutó con SQLite, no contra el servidor financiero. También se compila el frontend y se ejecutan sus pruebas de reportes.
