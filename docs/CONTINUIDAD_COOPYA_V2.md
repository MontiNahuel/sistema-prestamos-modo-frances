# Continuidad para la siguiente IA — respuestas bancarias / CoopYa V2

Fecha: 2026-10-27. Repositorio: `MontiNahuel/sistema-prestamos-modo-frances`.

## Leer primero

El usuario pidió adaptar lo posible a V2, dejar pendientes claros y pushear para continuar desde otra IA. **Preparado para continuar desarrollo no significa habilitado para cobranzas productivas.** No se procesaron pagos reales ni se ejecutaron migraciones en CoopYa o en el servidor de préstamos.

La auditoría V1 queda en `REVISION_Y_PEDIDO_CORRECCIONES_INTEGRACION_COOPYA.md`, ahora con aviso de actualización. La evidencia V2 seleccionada está versionada en `docs/coopya-v2/`; no hace falta depender de una carpeta temporal de Windows para leer SQL, tipos y ejemplos.

## Implementado localmente en esta continuación

1. Parser BAPRO conserva identificador de cliente de posiciones 11–24 y normaliza ceros iniciales. La conciliación exige lote + referencia + cliente numérico. Conservamos controles adicionales de CBU/CUIT/importe por seguridad: divergencia explícita respecto del SP original.
2. Se integró desde la actualización de `origin/main` el módulo de presentación Nación: genera y persiste cabecera/detalles locales con cuota asociada. La carga unificada concilia por concepto de débito de la presentación y verifica cuenta e importe, sin asignación manual.
3. Parser Nación admite `BNA`/`NACION`, moneda `P`/`1`, sistemas `CA`/`CC`/`01`/`02`, líneas 128/172. Valida dos convenciones observadas de pie (aplicados o presentados) y expone cuál reconoció. No infiere equivalencias.
3. Límite 10 MB / 100.000 registros. Conservamos rechazo explícito de líneas inválidas: no copiamos las omisiones silenciosas del parser C#.
4. Eliminada asignación manual Nación del servicio y pantalla. La presentación Nación local provee la relación persona/cuota; lotes importados sin esa relación quedan para revisión.
5. BAPRO bloquea toda confirmación si una fila queda en revisión/conflicto; no aplica un subconjunto silencioso. Mantiene protección transaccional compartida con otras cobranzas. Rechaza una segunda carga de la misma presentación; reversión incremental pendiente.
6. Nueva configuración `RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED=False` por defecto, verificada en el servicio además de informar a la UI. Solo se activa en pruebas aisladas. La sincronización a CoopYa ocurre después del commit local, por lo que no es una transacción distribuida y un fallo remoto requiere reconciliación; hasta homologarla, mantener desactivado.
7. `RespuestaBancaria.archivo_original`: conserva bytes en la misma transacción que encabezado, detalles y saldos. Migración aditiva `d27b10f6a501` después de `c19e62a4b230`; históricos pueden tener NULL. Descarga autenticada `GET /api/v1/respuestas-bancarias/{id}/archivo`, sin caché.
8. `contrato.py`: conversión pura a campos TVP, sin llamadas SQL; exportación de cronograma independiente de presentaciones, importes en cadenas decimales, IDs de cuota/préstamo sin conversiones a INT. Lectura autenticada `GET /api/v1/respuestas-bancarias/contrato/prestamos/{prestamo_id}`. Es propuesta versionada, no sincronización central.
9. Pruebas de formatos V2, atomicidad, bloqueo por configuración, ausencia de asignación manual, identidad de cliente, conservación del original y exportación contractual.
10. Verificador reproducible `backend/scripts/verificar_aislado.py`: SQLite temporal, integraciones externas deshabilitadas y conexiones socket bloqueadas. El lint frontend excluye bundles generados para revisar solo fuente, tests y Vite.

Se preservan cambios previos del usuario: migración visual Tailwind, unificación de reportes/préstamos otorgados y prototipo de cuenta corriente/carga de respuestas. No atribuir todos esos cambios a V2.

## Hallazgos V2 que siguen pendientes

- **EXP-01/02:** el paquete corrige DEFAULT, INCLUDE, filtros y aporta dependencias. No hemos ejecutado una instalación completa en SQL Server. El script de prueba recibido no hace ese recorrido: sus seis batches prueban tablas simplificadas/inserts, no los SP originales. Validar en una base realmente aislada.
- **EXP-03/04:** TXT corregidos permiten comparar campos TVP. El JSON Nación agrega `Det_DescripcionRechazo`, que no es columna de `RespuestaNacionDetalleType_Resp`; el adaptador usa solo campos reales. No afirmar que todos los JSON de saldo esperado se ejecutaron.
- **EXP-05:** preservamos variantes anteriores y V2; la moneda numérica no justifica rechazar la variante `P` ya observada. Diferencias de encoding y tolerancia quedan explícitas. Obtener casos bancarios homologados antes de reducir variantes.
- **FUN-01/02:** el SQL actual sigue escogiendo MIN en contradicciones Nación y puede actualizar de modo no determinista BAPRO. Las propuestas no son procedimientos completos. Nuestro flujo bloquea filas repetidas, pero debe existir una política equivalente en el escritor central.
- **FUN-03:** la segunda respuesta sigue bloqueada por lote. La tabla de rendiciones propuesta no implementa reversión, aplicación inversa, eventos ni reintentos. No habilitar por el mero hecho de crear esa tabla.
- **FUN-04:** código `7` queda para revisión local. CoopYa lo registra como rechazado en su resumen y no permite reemplazarlo ordinariamente. Requiere decisión común y prueba de transición posterior.
- **FUN-05:** `PRESTAMO_CUOTA` está prohibido por el CHECK actual; ampliar el CHECK no basta. Falta integrar obligaciones contractuales y dos préstamos del mismo concepto/mes sin colapsarlos con MAX.
- **FUN-06:** V2 sigue diciendo `SocioId_UUID`, pero `Socio.id` local es **INTEGER**. Además, la tabla propuesta no impone que un préstamo tenga un único PlanId para todas sus cuotas ni que el mapeo sea reversible por sistema. No ejecutar la propuesta 02 sin corregir modelo y restricciones.
- **FUN-07:** tipos de ajuste válidos están aclarados, pero falta un circuito completo auditado de reversión/ajuste con permisos y efecto exacto por concepto.

## Orden de trabajo para continuar

### P0 — Evitar escrituras centrales incompatibles

Auditar `backend/app/integrations/coopya_db_client.py` y los flujos ya existentes de otorgamiento/cobro manual (`PrestamoService.otorgar`/`pagar_cuota`). Hay llamadas previas a `impactar_cuotas_prestamo` y `registrar_cobro_cuota`; **la bandera nueva protege la carga de respuesta, no todas las escrituras históricas del sistema**. Resolver escritor único, equivalencias y transacciones antes de habilitar integración productiva. No insertar PRESTAMO_CUOTA en un CHECK que todavía lo prohíbe; no ignorar errores de sincronización como si el asiento se hubiera registrado.

### P1 — Desglose contractual y conciliación Nación

La presentación Nación local ya guarda cabecera/detalles y UUID de cuota para lotes generados localmente. Validar importaciones históricas y bordes de concepto truncado/duplicado. Mantener clave de conciliación por presentación + concepto de débito vinculado + cuenta + importe, con campos texto y ceros. Falta persistir el desglose inmutable contractual de capital/interés/IVA por renglón en ambas presentaciones y soportar reintentos sin duplicar la obligación.

El reparto proporcional acumulado actual de `prestamos/cobros.py` es una política local del prototipo, NO una regla demostrada por V2. Reemplazarlo por desglose contractual cuando ese snapshot exista; conciliar pagos históricos en una migración explícita, sin recalcular silenciosamente asientos anteriores.

### P2 — Identidades y sincronización

Diseñar equivalencias por sistema, socio INT, préstamo UUID y cuota UUID. No convertir UUID a INT ni inferir identidad por documento sin validar unicidad. Definir quién asigna NroArchivo y PlanId central, versión de contrato y estrategia de reintentos entre bases. El endpoint de contrato exporta equivalencias centrales nulas deliberadamente; no afirma que los IDs locales coincidan con CoopYa.

### P3 — Eventos, reversiones y permisos

Implementar ledger de eventos y referencia a aplicación original. Reversión debe deshacer exactamente sus componentes, no otros cobros de la cuota. Definir alcance de idempotencia por banco/presentación/evento y eventos duplicados o contradictorios. El índice único local actual por hash de operación no resuelve reversiones ni IDs de detalle centrales. No eliminarlo sin una migración y alternativa de integridad.

Agregar permisos específicos de consulta/carga/reversión por banco: hoy se exige sesión verificada, no se homologaron permisos granulares. Definir retención/cifrado/acceso de originales; ahora se guardan transaccionalmente en la base local, no en `wwwroot` como CoopYa.

### P4 — Homologación y despliegue

Pruebas en SQL Server aislado con DDL y SP reales, incluyendo repetidos, contradicciones, concurrentes, rollback, segunda carga, código 7, reversión, persona solo préstamo, dos préstamos, débitos mixtos y manuales. Validar los seis result sets de cuenta corriente contra obligaciones y dinero efectivo. Mantener deshabilitada la confirmación hasta completar esas pruebas y las equivalencias.

## Verificación y Git

Tras el pull de `origin/main` hasta `edce3f6`: 54 pruebas backend aisladas pasan, 16 pruebas de reportes pasan, frontend compila y lint termina con avisos existentes de efectos React. El backend aislado informa que Oracle Client configurado tiene arquitectura incorrecta; no fue necesario para las pruebas porque la integración está apagada. El build frontend mantiene aviso de bundle ExcelJS grande.

El pull incorporó los nuevos commits de presentaciones Nación, conciliación por presentación, sincronización de cobros y compatibilidad Linux. La rama de continuidad actual es `respuesta_astra`, basada en `origin/main`; queda pushear sus commits al remoto para que la otra IA continúe desde esa rama. No usar force push.

Comandos reproducibles desde sus carpetas:

```text
backend:  .venv/Scripts/python scripts/verificar_aislado.py
frontend: npm ci
frontend: npm run build
frontend: npm run test:reportes
frontend: npm run lint
```

No ejecutar la suite histórica completa directamente con el `.env` del servidor: varios tests escriben por `SessionLocal`. Usar el verificador aislado, que prepara base y semillas. No se ejecutó ninguna migración remota. La configuración de confirmación debe permanecer en False en el despliegue de continuidad.

## Entregable esperado de la siguiente IA

Continuar por P0–P4, actualizar este Markdown y la auditoría anterior al completar cada punto. Diferenciar pruebas locales de homologación SQL/CoopYa y preservar todas las referencias históricas. Si requiere cambios del monolito, devolver otro `.md` con procedimientos completos requeridos, contrato de IDs correcto y pruebas esperadas; no presentar fragmentos SQL comentados como una integración terminada.
