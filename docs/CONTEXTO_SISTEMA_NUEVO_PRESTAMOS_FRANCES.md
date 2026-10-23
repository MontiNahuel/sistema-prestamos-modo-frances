# Contexto: sistema nuevo, personas y préstamos franceses

Actualizado: 23/10/2026. Contexto reconstruido de conversaciones accesibles y del trabajo registrado en este chat. No sustituye la definición funcional original ni el contrato de la API.

## 1. Objetivo inmediato

El usuario pidió que desde «Buscar personas» se pueda también crear una persona, usando la definición del sistema nuevo, y continuar con el otorgamiento de un préstamo francés.

Flujo solicitado: buscar persona → seleccionar una existente o crear una nueva → continuar con esa persona para simular y otorgar el préstamo. La creación de una persona no debe confundirse con la creación de una línea de crédito ni con el otorgamiento efectivo del préstamo.

La referencia mencionada por el usuario es «definición del sistema nuevo (breve)». No se recuperó un documento o conversación con ese título exacto. Los campos obligatorios y el contrato de alta siguen pendientes de confirmación; no deben inventarse a partir de los campos que devuelve una búsqueda.

## 2. Ubicaciones y entorno

- Carpeta compartida de Sistemas: `Z:\`, correspondiente a `\\SVRDC1\Sistemas`.
- Repositorio: https://github.com/MontiNahuel/sistema-prestamos-modo-frances
- Copia activa del proyecto: `C:\Users\lparlavecchio\Documents\proyectos\sistema-prestamos-modo-frances`.
- Carpeta inicial del chat: `C:\Users\lparlavecchio\Documents\ChatGPT\SISTEMA CANAL PROPIO`. No confundirla con la copia activa.
- Frontend de desarrollo configurado para `http://localhost:5173`.
- Backend indicado por el usuario: `http://10.16.2.19:8001`.
- Documentación de API: `http://10.16.2.19:8001/docs`.
- OpenAPI consultado: `http://10.16.2.19:8001/api/v1/openapi.json`.
- Configuración solicitada en `frontend/.env`: `VITE_BACKEND_URL=http://10.16.2.19:8001`.
- El backend local tuvo impedimentos por ODBC17/LocalDB; se trabajó contra el backend remoto.

Estas direcciones describen el entorno utilizado, no garantizan que los servicios estén levantados al leer este archivo. Hay cambios locales que deben preservarse; no se informó un push ni despliegue remoto de esos cambios.

## 3. Personas: situación relevada

Archivos identificados en el proyecto:

- `frontend/src/components/personas/PersonasBuscador.tsx`.
- `frontend/src/services/api/personasApi.ts`.
- `backend/app/features/personas/controller.py` y su servicio.
- `backend/app/integrations/coopya_client.py`.

La integración relevada permite buscar personas y consultar su cuenta corriente:

- `POST /api/v1/personas/buscar`.
- `GET /api/v1/personas/{id}/cuenta-corriente`.

El cliente del backend consulta CoopYa mediante `/Personas/BuscarPersona` y `/Personas/GetCuentaCorrienteResumen`. En la API inspeccionada no se encontró un endpoint de alta de personas.

La respuesta de búsqueda incluye datos como `idPersona`, `numeroDoc`, `cuil`, `apellido`, `nombre`, `estadoNombre`, `nroSocio`, `calle`, `localidadId` y medios de pago. Son campos de lectura: no constituyen un esquema validado para crear personas.

El alta integrada todavía no está implementada. Antes de implementarla hay que confirmar:

1. Servicio responsable y endpoint real de alta en el sistema nuevo.
2. Campos requeridos, catálogos y validaciones.
3. Reglas para documentos/CUIL duplicados y relación persona–socio.
4. Identificador que devuelve el alta y que utilizará el préstamo.
5. Permisos y manejo de errores, sin duplicar personas al reintentar.

Propuesta de continuidad, aún no implementada: al completar el alta, dejar seleccionada la persona retornada y habilitar la simulación/solicitud del préstamo; confirmar el otorgamiento como acción separada.

## 4. Cambios registrados en este chat

### Simulador y líneas de préstamo

Se unificó la creación de líneas con el simulador: calcular condiciones y ofrecer debajo la acción «Crear línea con esta simulación». El formulario conserva motor, tasa e IVA calculados y permite completar los datos comerciales de la línea.

El usuario aclaró que, si se está simulando con una línea ya existente, no debe aparecer el botón para crear otra línea con esa simulación. Esa condición quedó incorporada. Cambiar parámetros invalida el resultado previo para no guardar condiciones desactualizadas.

### Reportes de seguimiento y control

Se agregó una pantalla de reportes con consulta, filtros y descarga Excel. Código principal registrado en `frontend/src/features/reportes/`.

Requisitos del usuario:

1. **Caída de cuotas:** asociado/préstamo, número, vencimiento, importe, capital, intereses y estado; cantidad de cuotas e importe total del período.
2. **Último pago:** asociado/préstamo, fecha e importe del último pago, capital pendiente, cuotas pendientes y vencidas.
3. **Préstamos otorgados:** otorgamiento, asociado, capital, tasa, plazo, cuota, gastos administrativos, total a devolver, saldo de capital y estado.
4. **Cobranzas aplicadas:** fecha, asociado/préstamo/cuota, importe y distribución a capital/intereses/IVA/otros, medio de pago si existe, saldo posterior y estado de cuota. Identificar pagos parciales, anticipos y cancelaciones cuando los datos lo permitan.

La implementación registrada contempla filtros por período, persona/documento/identificador y estado, paginación y exportación `.xlsx` con hojas de resumen y detalle. Se registraron 12 pruebas de reportes aprobadas y compilación correcta; esto describe la comprobación realizada, no una nueva ejecución al redactar este documento.

Limitaciones observadas en el backend consultado:

- Había cuotas sin `fecha_vencimiento`; no es válido inferir vencimientos ni mostrar mora cero por ausencia de datos.
- No estaban disponibles todos los datos de gastos reales, medios de pago o un historial detallado de imputaciones parciales.
- Saldos y estados corresponden a la situación actual; filtrar un período no reconstruye por sí solo un cierre histórico.
- No inventar desglose de pagos, saldos posteriores ni fechas faltantes. Mostrar la limitación al operador.

## 5. Contexto del sistema nuevo recuperado de otra conversación

Fuente: conversación **«Preparar migración CoopYa desde COBR»**, identificador `01a136bc-2f5d-71c3-b3c2-00d086c9df08`, y el texto aportado por el usuario en esa conversación.

El pedido de migración describe el sistema nuevo como **CoopYa (.NET 8 + SQL Server)**, y el sistema anterior con **Oracle 10g**. El objetivo era migrar socios, planes, servicios y cuenta corriente histórica, conservando saldos e imputaciones.

El texto menciona en el sistema nuevo personas, planes CS/Servicios/Asistodo, adhesiones, medios de pago, `PersonasRepositorio`, `CuentaCorrienteDesglose` y auditorías de presentaciones. Esto es contexto de migración, no una especificación de campos para el formulario de alta.

Reglas expresamente señaladas en ese pedido:

- No asumir equivalencias por nombres o números parecidos.
- Número de socio, DNI y CUIL pueden repetirse en los datos históricos.
- No confundir presentación al banco con cobro efectivo.
- Validar signos, estados, imputaciones y anulaciones antes de reconstruir saldos.
- Separar cuenta del socio de cuenta del préstamo cuando sean distintas.
- No modificar producción para probar migraciones ni pagos.

La entrega de migración se trabajó en `F:\PABLO`. Allí se registraron respaldos y fuentes históricos; su existencia no prueba que el alta de personas del sistema nuevo esté disponible en el backend de préstamos.

## 6. Fuentes y límites de recuperación

- Chat actual **«Hacé un pull del repo»**, identificador `01a16953-8f40-75d3-82cb-169d01aaa582`: repositorio, entorno, simulador, reportes y pedido de alta de personas.
- **«Preparar migración CoopYa desde COBR»**: contexto de arquitectura y precauciones de migración indicados arriba. Texto original consultado: `C:\Users\lparlavecchio\.codex\attachments\5649be9b-b696-432a-8158-b2755bb7c383\Texto pegado.txt`.
- **«Documentar rangos de socios»**, identificador `01a159ec-e87c-7de1-a2f6-069d69645163`: confirmó el uso de `Z:\` como carpeta de Sistemas. Existe además `Z:\CONTEXTO_REGISTRO_SOCIOS_HOJAS_RUBRICADAS.md`, referido a un módulo legado distinto.
- Se revisaron las conversaciones recientes accesibles y el listado de conversaciones archivadas de ChatGPT disponible, que no devolvió resultados. El navegador de ChatGPT estaba sin sesión iniciada. La búsqueda no cubre todo el historial de la cuenta.

No se encontró la definición breve original. Este archivo conserva lo recuperado y permite retomar el trabajo sin presentar como confirmados contratos o reglas todavía desconocidos. No contiene credenciales, tokens ni registros personales.

## 7. Próximo paso

Localizar la definición breve original o el contrato real de alta de personas de CoopYa. Con esa evidencia, agregar la creación desde «Buscar personas», conservar automáticamente la persona creada y continuar al flujo de préstamo francés, verificando validaciones, duplicados y errores sin generar personas ni préstamos de prueba en producción.
