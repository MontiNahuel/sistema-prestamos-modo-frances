# Auditoría inicial — Backend Sistema Francés

- **Fecha:** 19/10/2026
- **Alcance:** `backend/` + contrato con `frontend/` + integración CoopYa + revisión de specs (inexistentes).
- **Método:** auditoría estática, **sin ejecutar código, tests ni llamadas al monolito**. Toda afirmación tiene evidencia `ruta:línea`. Cuando algo no fue verificable, se marca explícitamente.
- **Contexto de negocio (confirmado por el usuario):**
  - Sistema de préstamos en **prototipo**, pero el monolito CoopYa **ya tiene datos reales de socios**; uso interno previsto en producción.
  - Según la línea de producto se usa **TNA o TEA** → el sistema debe soportar ambas convenciones.
  - El token de CoopYa es de test/sandbox, pero está hardcodeado.
  - No hay planillas ni casos de oro del negocio: la matemática se validó contra la teoría del sistema francés.
- **Escala de severidad:** Crítico (compromete datos/credenciales o impide operar con dinero real) · Alto (resolver antes del primer préstamo real) · Medio (afecta operación, calidad o contrato) · Bajo (higiene/robustez) · Informativo (contexto).

> **Nota de método e integridad de la evidencia:** el código **cambió en disco durante la auditoría**. Los archivos del backend fueron modificados entre las 16:42 y las 16:56, y `frontend/src/App.tsx` a las 17:05 (fechas de modificación de esta máquina). Todo lo que sigue corresponde a la versión vigente a esa hora (migración a centavos ya aplicada, `/auth/login` agregado). Como **no hay repositorio git**, no fue posible diffear ni auditar historial. Recomendación inmediata: versionar el proyecto y congelar la revisión para que esta evidencia siga siendo válida.

---

## 1. Veredicto ejecutivo

**Las bases del motor de cálculo están bien planteadas; las bases del sistema, no.**

El corazón financiero (sistema francés, centavos enteros, redondeo, última cuota) está correctamente implementado y fue verificado a mano de forma independiente. La migración a centavos está completa y es coherente entre motor, modelos y tests.

Por el contrario, el sistema **no está listo para tocar el primer préstamo real** ni para seguir exponiendo datos del monolito: no tiene autenticación propia, filtra la credencial de servicio al cliente en errores upstream, viaja sin verificación TLS, tiene CORS efectivamente abierto, no persiste nada, no tiene pagos ni auditoría, y su modelo de datos carece de las garantías mínimas de un sistema financiero (idempotencia, concurrencia, constraints, migraciones).

### Top de hallazgos

| # | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| 1 | **Crítico** | API sin autenticación con token de servicio como fallback: cualquiera puede leer PII real de socios | `router.py:41-64,67-80`; `coopya_client.py:37,55`; `config.py:11` |
| 2 | **Crítico** | Fuga del token CoopYa al cliente vía `str(e)` (la URL del error incluye `?token=`) | `router.py:24,64,80`; `coopya_client.py:38,56`; httpx `_models.py:816` |
| 3 | **Crítico** | El motor no puede expresar TEA: solo existe `tna` y `TEM = TNA/12` | `simulacion.py:15`; `sistema_frances.py:59`; `prestamo.py:33-34` |
| 4 | **Crítico** | No hay pagos ni imputaciones: el cobro es un acumulador sobre la cuota | `prestamo.py:67-69` |
| 5 | **Crítico** | Sin idempotencia, sin unique `(prestamo_id, numero_cuota)` y sin control de concurrencia | `prestamo.py:47,54-55,69` |
| 6 | **Crítico** | Modelo desconectado + sin migraciones + `DATABASE_URL` por defecto a LocalDB | `database.py:5-21`; `config.py:14-17`; `requirements.txt:1-8` |
| 7 | **Alto** | `verify=False` en las 3 llamadas al monolito, incluido el login que envía la contraseña | `coopya_client.py:25,45,58` |
| 8 | **Alto** | CORS: cualquier origen con credenciales (verificado en Starlette 1.9.0 instalado) | `main.py:13-20` |
| 9 | **Alto** | `monto_centavos`/`tna`/`alicuota_iva` sin cotas superiores → 500 con Decimal, datos basura | `simulacion.py:13,15,16`; `router.py:37-38`; `sistema_frances.py:66` |
| 10 | **Alto** | Respuestas de personas/login sin `response_model`: PII cruda del monolito sin contrato | `router.py:20,62,78` |
| 11 | **Alto** | Login proxy sin rate limiting ni protección anti fuerza bruta | `router.py:10-24`; `requirements.txt` |
| 12 | **Alto** | Frontend: carrera en cuenta corriente puede mostrar datos de un socio en la ficha de otro | `App.tsx:192-213` |

---

## 2. Seguridad

### S-01 — Crítico — API de PII sin autenticación y con token de servicio por defecto

**Evidencia**
- `router.py:41-46` — `POST /personas/buscar` acepta `token` opcional por query y `authorization` opcional por header; no hay `Depends`/`Security` en ningún endpoint.
- `router.py:51-53` — si no viene token, `auth_token` queda `None` y se envía igual.
- `coopya_client.py:37` y `:55` — `auth_token = token or self.default_token`.
- `config.py:11` — `COOPYA_DEFAULT_TOKEN` hardcodeado (valor no reproducido).
- `router.py:67-80` — mismo esquema en `GET /personas/{id_persona}/cuenta-corriente`, con `id_persona` enumerable.

**Impacto:** cualquier cliente que alcance el puerto 8001 obtiene, sin credenciales, datos de socios reales (documento, CUIL, domicilio, CBU, estado) y su situación crediticia (`saldo`, `algunaConMora`; ver `App.tsx:36-61`), atribuidos a la credencial de servicio del backend y sin trazabilidad de quién consultó.

**Recomendación:** authn propia (JWT corto del operador o validación server-side de la sesión CoopYa) en todos los endpoints de negocio; eliminar el fallback a `default_token` (sin token ⇒ 401); no aceptar token por query; autorización por rol; registrar auditoría por operador y por socio consultado.

### S-02 — Crítico — Fuga del token CoopYa al cliente en errores upstream

**Evidencia**
- `coopya_client.py:38` y `:56` — la URL se construye con `?token={auth_token}`.
- `coopya_client.py:47,60` — `resp.raise_for_status()`.
- httpx 0.28.1 instalado (`backend/.venv/.../httpx/_models.py:816`) — el mensaje de `HTTPStatusError` incluye la URL completa.
- `router.py:24,64,80` — `detail=f"... {str(e)}"` devuelve ese texto al cliente.

**Impacto:** al provocar un 4xx/5xx del monolito (p. ej. token vencido), la respuesta expone el token —el del servidor si no se envió ninguno— y permite al atacante operar directamente contra CoopYa, fuera de los controles de este servicio. Precisión verificada: la fuga ocurre por `HTTPStatusError`; en `ConnectError`/timeout el mensaje no contiene la URL.

**Recomendación:** nunca interpolar excepciones en `detail`; respuesta genérica + `requestId` correlacionable en logs; no poner el token en la URL (header `Authorization` hacia CoopYa); redactar URLs en logs; rotar la credencial (aunque sea de test).

### S-03 — Alto — TLS sin verificación en las 3 llamadas al monolito

**Evidencia:** `coopya_client.py:25,45,58` — `httpx.AsyncClient(verify=False, timeout=10.0)`. La primera es el login, que envía usuario y contraseña en el body (`:20-26`).

**Impacto:** cualquier intermediario de red puede leer o modificar credenciales de operador, tokens y datos de socios sin detección. Es la combinación exacta que agrava S-01/S-02.

**Recomendación:** `verify=True` con CA confiable (si el certificado del monolito es corporativo, inyectar esa CA); nunca desactivar la verificación en producción; rotar credenciales que hayan transitado por el canal.

### S-04 — Alto — Secreto hardcodeado, sin `.env` ni `.env.example`

**Evidencia:** `config.py:11`; `config.py:19` (`env_file=".env"`); ausencia confirmada de `.env`, `.env.example` y `.gitignore` de backend. Existe bytecode `app/core/__pycache__/config.cpython-313.pyc` que puede contener el literal (no legible con las herramientas de lectura; a verificar).

**Impacto:** la credencial vive en el código y en cualquier zip/backup/imagen; sin plantilla de entorno no hay camino claro para separar dev/prod. El usuario indica que es token de test/sandbox; igualmente la cadena S-02/S-03 lo deja comprometido.

**Recomendación:** sacar el valor del código; `.env.example` con placeholders; `.gitignore` para `.env`, `.venv`, `__pycache__`, `*.pyc`; secret manager; rotación.

### S-05 — Alto — CORS: cualquier origen con credenciales

**Evidencia:** `main.py:13-20` — `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`, con comentario "para desarrollo" sin condicional de entorno.

**Efecto real verificado en Starlette 1.9.0 instalado** (`starlette/middleware/cors.py:151-177`): con `allow_all_origins=True` y `allow_credentials=True`, el middleware **refleja el `Origin` de cada request** y responde `Access-Control-Allow-Credentials: true`. No es el caso clásico de "wildcard con credenciales que el navegador rechaza": la política efectiva es "cualquier origen, con credenciales".

**Impacto:** combinado con S-01, cualquier página web puede leer PII de socios desde el navegador de un operador.

**Recomendación:** orígenes explícitos por entorno; `allow_credentials=False` (no hay cookies); métodos/headers acotados; el proxy de producción como única puerta.

### S-06 — Alto — `/auth/login` como proxy sin rate limiting

**Evidencia:** `router.py:10-24` delega en `coopya_client.validar_login` (`coopya_client.py:13-28`); no hay limitador en `requirements.txt` ni middleware. El 401 (`router.py:19`) vs 502 (`router.py:24`) funciona como oráculo.

**Impacto:** fuerza bruta/credential stuffing contra cuentas de operador, con la IP del servicio como origen aparente; el 502 con `str(e)` agrega fuga (S-02).

**Recomendación:** rate limit por IP+usuario, backoff, monitoreo, mensajes uniformes; evaluar delegar el login directamente al monolito en lugar de proxear credenciales.

### S-07 — Medio — IDOR/enumeración por `id_persona`

**Evidencia:** `router.py:67-70`; `schemas/simulacion.py:23`. No hay verificación de que el llamador tenga derecho sobre ese socio.

**Impacto:** hoy subsumido por S-01; cuando exista autenticación, si es solo "¿estás logueado?", cualquier operador puede recorrer toda la base. **Recomendación:** autorización por recurso/rol; auditoría de accesos; evitar IDs secuenciales expuestos sin control.

### S-08 — Medio — Respuestas crudas del monolito sin `response_model`

**Evidencia:** `router.py:20` (login devuelve `res`), `:62` y `:78` devuelven JSON crudo; el único `response_model` está en `:27`. El frontend tipa a mano campos como `cuil`, `mediosDePago[].valor` (CBU) (`App.tsx:36-47`).

**Impacto:** over-fetching de PII, acoplamiento silencioso y contrato inexistente: si el monolito agrega campos sensibles, se exponen solos. **Recomendación:** modelos Pydantic de respuesta con allowlist de campos.

### S-09 — Medio — Búsqueda sin criterio mínimo, sin límite ni paginación

**Evidencia:** `schemas/simulacion.py:21-23` (todos opcionales con default `""`/`None`); `router.py:56-62` reenvía y devuelve la lista completa; `App.tsx:170-174` envía siempre, inclusive vacío; los inputs de búsqueda no son `required` (los `required` de `App.tsx:270,283,611,625,638,651` son de login y simulador).

**Impacto:** un submit vacío puede disparar un listado masivo en el monolito (depende de su validación, no verificable desde aquí) y colgar la tabla del operador. **Recomendación:** exigir criterio mínimo (≥3 caracteres o documento válido), paginar/limitar resultados, orden determinístico y alertas de volumen.

### S-10 — Medio — Token aceptado por query en la API propia

**Evidencia:** `router.py:44,70` (`token: Optional[str] = Query(...)`); `coopya_client.py:38,56`. El frontend usa `Authorization` (`App.tsx:168,200`), pero el contrato admite y documenta la query.

**Impacto:** tokens en logs de acceso de uvicorn/proxies e historiales. **Recomendación:** aceptar solo `Authorization: Bearer`; deprecar `?token=`; redactar query strings en logs.

### S-11 — Medio — Token de sesión en `localStorage` sin revocación

**Evidencia:** `App.tsx:83,112-118,146-151`. El logout solo borra el estado local. **Impacto:** XSS o dependencia comprometida exfiltra una sesión que opera contra datos reales. **Recomendación:** `sessionStorage` o cookie `HttpOnly` vía BFF; expiración; CSP.

### S-12 — Bajo — Superficie y metadatos expuestos

**Evidencia:** `main.py:8-10` (`/docs`, `/redoc`, `/openapi.json` sin protección); `main.py:25-27` (nombre de servicio en `/health`). **Recomendación:** cerrar docs por entorno; health sin detalle de servicio.

### S-13 — Bajo — Posible eco de la contraseña en respuestas 422 (confianza media)

**Evidencia:** `schemas/simulacion.py:7-9` (`LoginRequest` con `contrasena`); el handler de validación de FastAPI 0.149.0 devuelve `jsonable_encoder(exc.errors())`, que incluye `input`. Un request inválido puede reflejar el body con la contraseña. No ejecutado: inferido de librerías instaladas. **Recomendación:** handler global que redacte `contrasena`/tokens; no loguear cuerpos de login.

### S-14 — Bajo — Parseo frágil de `Authorization`

**Evidencia:** `router.py:53,75` — `authorization.replace("Bearer ", "").strip()`. Un header `bearer x` (válido por RFC, case-insensitive) se reenvía crudo. **Recomendación:** `HTTPBearer` de FastAPI.

### S-15 — Informativo — Dependencias y CVEs

`requirements.txt:1-8` usa solo cotas inferiores (`>=`), sin lock. Versiones instaladas reales: FastAPI 0.149.0, Starlette 1.9.0, Pydantic 2.14.1, httpx 0.28.1, SQLAlchemy 2.1.5, pyodbc 5.3.0, pytest 9.1.1 (leídas de `.venv/*.dist-info`). No se ejecutaron scanners: **CVEs no verificados**. `pytest` figura como dependencia de runtime.

---

## 3. Dominio y matemática

### D-01 — Crítico — No existe el concepto de TEA; el motor asume `TEM = TNA/12`

**Evidencia:** `simulacion.py:15` (único campo `tna`); `sistema_frances.py:59`; `prestamo.py:33-34` (`tna_pactada`, `tem_pactada`); sin campo de tipo de tasa en ningún lado.

**Verificación manual (sin ejecutar):**
- Monto $100.000, 12 cuotas, **TNA 60%** → TEM 5% → cuota pura **$11.282,54**; total a pagar **$142.822,48**.
- Monto $100.000, 12 cuotas, **TEA 60%** → TEM = 1,6^(1/12)−1 ≈ **3,994411%** → cuota pura ≈ **$10.651,76**; primera fila: interés $3.994,41 + IVA $838,83 + capital $6.657,35 = **$11.490,59**.
- Diferencia: la cuota con TNA es **≈ 5,92% más alta**; los intereses totales del caso TNA superan a los del caso TEA en **≈ $7.569** por cada $100.000.

**Impacto:** si una línea se pacta a TEA y se carga como TNA, el sistema cobra de más de forma sistemática y la respuesta (y la base) quedan semánticamente falsas. Dado que el negocio usa ambas convenciones, es un defecto de corrección, no una limitación.

**Recomendación:** agregar `tipo_tasa: Literal["TNA","TEA"]` (default `"TNA"` retrocompatible); derivar `TEM = tasa/12` o `TEM = (1+tasa)^(1/12)-1`; persistir el tipo y la TEM usada con precisión suficiente para reproducir el cronograma.

### D-02 — Alto — Sin cotas superiores y con excepciones aritméticas no capturadas

**Evidencia:** `simulacion.py:13` (`monto_centavos` sin techo), `:15` (`tna` sin techo), `:16` (`alicuota_iva` sin techo, solo `ge=0`); `router.py:37-38` solo captura `ValueError`; `sistema_frances.py:66` (potencia y división por `factor - 1`) y `:7-9` (`quantize`).

**Casos razonados (no ejecutados):** `tna = 1e-30` ⇒ `1+tem` se redondea a `1` con la precisión 28 por defecto ⇒ `factor - 1 = 0` ⇒ `decimal.DivisionByZero` (no es `ValueError`) ⇒ **500**. `tna` o `monto_centavos` enormes ⇒ `decimal.InvalidOperation`/`Overflow` en `round_cents` ⇒ **500**. `alicuota_iva = 1e6` pasa validación y produce totales absurdos.

**Recomendación:** cotas de negocio (`alicuota_iva le=1`, TNA y monto máximos), capturar `decimal.DecimalException` ⇒ 400/422, validación defensiva en el dominio y tests de robustez.

### D-03 — Medio — Política de fechas incompleta

**Evidencia:** `sistema_frances.py:100-103` — aritmética de mes correcta (rollover dic→ene) pero `dia = min(..., 28)` para todos los vencimientos; sin feriados ni fines de semana; sin validación de fecha pasada; sin fecha de desembolso. El frontend no envía `fecha_primer_vencimiento` (`App.tsx:229-234`) ni declara/muestra `fecha_vencimiento` (`App.tsx:3-12`).

**Impacto:** un vencimiento "los 31" se convierte en 28 todos los meses; la funcionalidad de fechas es hoy código muerto para el operador. **Recomendación:** política configurable por producto (día fijo / fin de mes / día hábil siguiente), calendario de feriados, y exponer la fecha en la UI.

### D-04 — Medio — Política de redondeo implícita

**Evidencia:** `sistema_frances.py:63-66` (cuota teórica redondeada una vez), `:76-77` (interés e IVA redondeados por fila), `:79-83` (última cuota absorbe).

**Análisis verificado:** no hay deriva ilimitada; `Σ capital = monto` se garantiza por construcción. En el caso TNA 60%/12 cuotas la última cuota pura queda en $11.282,55 (+1 centavo por diseño) y el IVA total por fila ($7.431,99) difiere en 1,29 centavos del 21% del interés total. **Recomendación:** documentar la política en el contrato y en la base, y testear los invariantes de forma parametrizada.

### D-05 — Bajo — Camino de amortización anticipada no consistente

**Evidencia:** `sistema_frances.py:85-88` — si `capital > saldo_inicial` se clampea, pero `cuota_pura` sigue siendo la teórica (`:89`), generando filas con `cuota_total = 0` y `cuota_pura > 0` en casos de monto mínimo (p. ej. 1 centavo a 2 cuotas, tasa 0). **Recomendación:** definir y testear la política para esos bordes.

### D-06 — Bajo — La calculadora no acota plazo ni importes por sí misma

**Evidencia:** `sistema_frances.py:52-57` (solo `> 0` / `>= 0`); el `le=120` vive en el schema (`simulacion.py:14`). Un uso directo (script/notebook) con `plazo` gigante itera sin control. **Recomendación:** cotas defensivas en el dominio.

### D-07 — Informativo — Precisión de columnas vs motor y comentario contradictorio

**Evidencia:** `prestamo.py:14` — comentario "Las tasas siguen siendo porcentajes" cuando el sistema usa tanto por uno (0.60 = 60%); `:33-34` — `Numeric(10,4)`/`Numeric(10,6)` pueden truncar la TEM efectiva (ej. TEA 60% → TEM 0,039944108...) e impedir reproducir el cronograma desde la base. **Recomendación:** documentar la convención y guardar la TEM usada con escala ≥ 10, o la cuota teórica como fuente de verdad.

### D-08 — Informativo — Plazos inconsistentes entre capas

**Evidencia:** `simulacion.py:14` (`le=120`) vs `prestamo.py:17` (`plazo_max_meses = 72`) y `TasaConfig` sin uso. **Recomendación:** unificar por producto.

### D-09 — Informativo — Etiqueta "IVA (21%)" fija en la UI

**Evidencia:** `App.tsx:694` — aunque el operador puede cambiar la alícuota y el backend usa el valor enviado. **Recomendación:** mostrar `resultado.alicuota_iva`.

---

## 4. Datos y persistencia

> Grep exhaustivo: **ningún módulo importa `app.models` ni `app.core.database`**; no hay `create_all`, no hay Alembic, `get_db` no se usa en ningún endpoint. La base de datos no recibe ni un byte del sistema hoy. El modelo es código muerto de la app (aunque el `.pyc` sugiere que alguien lo importó manualmente alguna vez).

### P-01 — Crítico — No existen pagos ni imputaciones

**Evidencia:** `prestamo.py:67-69` — la cuota tiene `estado`, `fecha_pago` y `monto_pagado_centavos`; no hay tabla de pagos, medios, comprobantes, ni imputación por concepto.

**Impacto:** no se puede auditar caja, reconstruir saldos, anular/reversar un cobro, manejar pagos parciales, punitorios ni quitas. Bloqueante para producción. **Recomendación:** tablas `pagos` e `imputaciones_pago` como fuente de verdad; `monto_pagado_centavos` solo como caché derivada.

### P-02 — Crítico — Sin idempotencia ni control de concurrencia

**Evidencia:** `prestamo.py:54-55` — FK + `numero_cuota` sin `UniqueConstraint`; `:41` — `saldo_deudor_actual_centavos` denormalizado; `:69` — acumulador; ninguna tabla tiene `version`/`rowversion`.

**Impacto:** doble submit o reintento puede duplicar cuotas o préstamos; dos cobros concurrentes sobre la misma cuota hacen read-modify-write y uno se pierde. **Recomendación:** `UNIQUE (prestamo_id, numero_cuota)`, `rowversion`/update optimista, actualizaciones atómicas de saldo, `Idempotency-Key` con constraint unique.

### P-03 — Crítico — Sin migraciones y con `DATABASE_URL` por defecto a LocalDB

**Evidencia:** `requirements.txt:1-8` (sin Alembic; sin `alembic.ini`/carpeta); `config.py:14-17` (LocalDB + `trusted_connection` como default en código); `database.py:5-21`; `main.py` sin `lifespan` que valide conexión/esquema.

**Impacto:** no hay forma repetible de crear/versionar el esquema; si en producción falta la variable de entorno, el servicio apunta silenciosamente a una DB local. **Recomendación:** Alembic, `DATABASE_URL` obligatoria sin default productivo, chequeo de esquema al arrancar.

### P-04 — Alto — Faltan entidades del ciclo de vida del préstamo

**Evidencia:** `prestamo.py:9-71` solo define `TasaConfig`, `Prestamo`, `Cuota`. No hay solicitudes, desembolsos, productos, mora/punitorios, cancelación anticipada, refinanciación, usuarios/roles, sucursales ni historial de estados.

**Recomendación (núcleo mínimo):** `productos_credito`, `prestamos`, `cuotas`, `pagos`, `imputaciones_pago`, `prestamo_eventos`; solicitudes y refinanciación pueden sumarse después.

### P-05 — Alto — `TasaConfig` huérfana: no gobierna nada

**Evidencia:** `prestamo.py:9-19` (sin FK ni unique); `router.py:31-35` recibe `tna`/`alicuota_iva` directo del request. **Impacto:** cualquier simulación/alta puede pactar cualquier tasa; sin producto no hay topes de monto/plazo por destino. **Recomendación:** convertirla en catálogo de productos y referenciarla desde `Prestamo`, manteniendo el snapshot contractual.

### P-06 — Alto — Identidad del socio sin integridad

**Evidencia:** `prestamo.py:26` (`persona_id` sin FK, correcto por ser otra base, pero sin validación en el alta); `:27-28` (`persona_nombre`/`persona_doc` nullable). **Impacto:** préstamos a IDs inexistentes y pérdida del snapshot del deudor. **Recomendación:** validar contra CoopYa antes de persistir y hacer obligatorio el snapshot.

### P-07 — Alto — Estados como strings libres y nulabilidad laxa

**Evidencia:** `prestamo.py:43,67` (estados sin `CheckConstraint` ni enum); `:56` (`fecha_vencimiento` nullable, lo que rompe mora); sin `UniqueConstraint`/`CheckConstraint` en el archivo. **Recomendación:** CHECK de estados, montos ≥ 0, alícuota entre 0 y 1, `fecha_vencimiento NOT NULL`, catálogo o CHECK según SQL Server.

### P-08 — Alto — Falta de moneda, desembolso y primer vencimiento

**Evidencia:** `prestamo.py:22-45`; el frontend ya muestra CBU de desembolso (`App.tsx:36-47`). **Impacto:** no se registra cuándo ni cómo salió el dinero (el hecho financiero clave), ni se puede recalcular mora. **Recomendación:** `moneda`, `fecha_desembolso`, medio/referencia, `fecha_primer_vencimiento` en `prestamos`.

### P-09 — Alto — Fechas naive y `datetime.utcnow` deprecado

**Evidencia:** `prestamo.py:19,44,68`; Python 3.13.15 (`.venv/pyvenv.cfg`). **Impacto:** UTC naive mezclado con operación argentina (UTC−3) puede correr el corte de mora un día; un solo `fecha_pago` no distingue acreditación de imputación. **Recomendación:** `DateTimeOffset`/`timezone=True` o `func.now()`; separar fechas de acreditación/imputación; definir el corte diario en hora local.

### P-10 — Alto — Saldo denormalizado sin mecanismo de sincronización

**Evidencia:** `prestamo.py:41`; no hay capa de servicios ni triggers. **Impacto:** cualquier fallo a mitad de imputación desincroniza saldo y cuotas; no contempla punitorios. **Recomendación:** actualizarlo en la misma transacción que imputa, o calcularlo al vuelo; test de invariante `saldo == total_a_pagar − imputado`.

### P-11 — Medio — Sesiones, transacciones y pool

**Evidencia:** `database.py:5-9` (sin `pool_size`, `pool_timeout`, `pool_recycle`, `connect_args`, `fast_executemany`); `:16-21` (`get_db` cierra pero no hace rollback explícito; sin Unit of Work). **Recomendación:** política de commit/rollback explícita, tuning del pool y timeout de conexión.

### P-12 — Medio — PK `String(36)` con UUID4 en SQL Server

**Evidencia:** `prestamo.py:25,53` vs `:12` (`TasaConfig` int). **Impacto:** fragmentación de la PK clustered con UUID aleatorios e inconsistencia de estrategia. **Recomendación:** decidir una sola estrategia (identity interno o `NEWSEQUENTIALID`).

### P-13 — Medio — `cascade delete-orphan` y FK sin `ondelete`

**Evidencia:** `prestamo.py:47,54`. **Impacto:** un delete por ORM borra el historial financiero. **Recomendación:** prohibir borrado físico (anulación con motivo + evento) y `ondelete="RESTRICT"`.

### P-14 — Medio — Índices insuficientes para cobranza y mora

**Evidencia:** `prestamo.py:43` (`estado`), `:56` (`fecha_vencimiento`) sin índice; falta unique compuesto. **Recomendación:** `(estado, fecha_vencimiento)` en cuotas, `(persona_id, estado)` en préstamos.

### P-15 — Medio — Sin auditoría de operaciones ni usuario

**Evidencia:** `prestamo.py:44` (solo `fecha_alta`); el login delega en CoopYa (`router.py:10-24`) y la identidad del operador no llega a ningún registro local. **Recomendación:** `usuario_alta/modificacion`, timestamps y tabla de eventos.

### P-16 — Medio — Defaults solo del lado Python

**Evidencia:** `prestamo.py:19,25,43,44,53,69` usan `default=` de SQLAlchemy, no `server_default`. **Impacto:** cargas externas/migraciones deben proveer todo. **Recomendación:** `server_default` para campos simples.

### P-17 — Bajo — Empaquetado y documentación de esquema

Ausencia de `__init__.py` en todos los paquetes (namespace implícito), `.env.example` y README de backend. **Recomendación:** agregarlos y documentar el flujo de migraciones.

### P-18 — Alto — Cero tests de persistencia

**Evidencia:** `tests/` solo contiene calculadora y API de simulación; no hay `conftest.py` ni fixtures de DB; ningún test importa `app.models`. **Qué cubrir:** esquema por migraciones, constraints, atomicidad de alta + cuotas, concurrencia de imputaciones, idempotencia de pagos, reconciliación de saldos, mora y round-trip del plan simulado → persistido.

---

## 5. API, contrato y frontend

### A-01 — Alto — Semántica de errores pobre e inconsistente

**Evidencia:** `router.py:24,64,80` (todo error upstream ⇒ 502 con `str(e)`); `router.py:37-38` (ValueError ⇒ 400 con `str`); FastAPI 422 con `detail` array; 500 por defecto en texto plano. En el frontend: `App.tsx:133-135,178-180,238-239` asumen `detail` string; un 422 produce `"[object Object]"` en pantalla.

**Impacto:** el operador no distingue credenciales inválidas de caída/timeout; los mensajes técnicos filtran internals; soporte no tiene correlación. **Recomendación:** mapear `HTTPStatusError` (401/403/404), `TimeoutException` (504), `ConnectError` (503); handler global `{code, message, requestId, fields}`; renderizar `fields` en la UI.

### A-02 — Medio — Convención de nombres mixta y campos extra ignorados

**Evidencia:** `simulacion.py:12-17` (snake_case) vs `:20-23` (camelCase: `nombreApellido`, `idPersona`); Pydantic v2 ignora extras por defecto. **Impacto:** un typo o cambio de casing no da error: el filtro queda vacío y la búsqueda se ejecuta sin criterios. **Recomendación:** una sola convención, `extra="forbid"` y tests de contrato.

### A-03 — Medio — Cuenta corriente silenciada y con condición de carrera

**Evidencia:** `App.tsx:192-213` — si `!res.ok` no se hace nada y el `catch` solo imprime en consola; `setCcResumen(data)` no verifica que la respuesta corresponda a la persona seleccionada (sin `AbortController` ni "última petición gana").

**Impacto:** el operador puede ver "No se pudo obtener el resumen" sin causa, y con clics rápidos el resumen de un socio puede pintarse en la ficha de otro: **riesgo de decidir sobre el socio equivocado**. **Recomendación:** manejar 401/errores con mensaje, y asociar cada respuesta a `idPersona` (AbortController o secuencia).

### A-04 — Medio — URL del backend no configurable

**Evidencia:** `App.tsx:127,164,198,226` usan rutas relativas `/api/v1/...`; `vite.config.ts:9-14` proxya a `http://localhost:8001`; no hay uso de `import.meta.env`/`VITE_*` en `src`. **Impacto:** el frontend solo funciona detrás del proxy same-origin de desarrollo. **Recomendación:** `VITE_API_BASE_URL` con fallback; documentar topología de despliegue.

### A-05 — Bajo — Unidades heterogéneas sin documentar

**Evidencia:** simulación en centavos enteros (`App.tsx:63-70,230`) vs cuenta corriente en pesos crudos (`App.tsx:72-79`); el contrato de respuesta de CC no está tipado por el backend. **Recomendación:** documentar unidad por campo y normalizar en el borde.

### A-06 — Bajo — Conversión de tasas con aritmética de punto flotante

**Evidencia:** `App.tsx:222-223` — `(tnaPorcentaje / 100).toString()`. **Impacto:** posible ruido binario en casos límite; bajo, pero contradictorio con el objetivo de exactitud. **Recomendación:** `toFixed(4)/toFixed(6)` y validación de rangos en cliente.

### A-07 — Bajo — Documentación viva incompleta

**Evidencia:** `main.py:8-10`; `router.py:44,70` documentan `?token=` sin `SecurityScheme`. **Recomendación:** `HTTPBearer` en OpenAPI, ejemplos, códigos de error, y restringir docs en producción.

### A-08 — Informativo — El frontend no duplica el cálculo

**Evidencia:** `App.tsx:226-248` — delega todo el cálculo al backend y solo formatea. Es una decisión correcta que elimina la divergencia cliente/servidor. **Mantenerlo.**

---

## 6. Operación, tests y reproducibilidad

### O-01 — Alto — Cobertura de tests insuficiente y sin CI

**Evidencia:** `tests/test_simulaciones_api.py:4` (TestClient a nivel módulo, sin fixtures/aislamiento), `:7-26` (solo health y simulación); `tests/test_sistema_frances.py:6-46` (calculadora). No hay `conftest.py`, `pytest.ini` ni `pyproject.toml`; no hay CI ni git. **Impacto:** desalineaciones de contrato, errores de integración, seguridad y persistencia no se detectan. **Recomendación:** fixtures, mock del monolito (respx/MockTransport), tests de 400/401/404/422/502/timeout, contrato y concurrencia; CI con lint+tests de ambos proyectos.

### O-02 — Medio — `/health` estático

**Evidencia:** `main.py:25-27` no toca DB ni CoopYa (la DB ni siquiera se importa). **Recomendación:** liveness vs readiness; chequear upstream con timeout corto y reportar por dependencia.

### O-03 — Medio — Sin logging, request-id, métricas ni handler global

**Evidencia:** no hay `logging`/middleware propio en `app/` ni en `main.py`. **Impacto:** ante "me dio error" no hay traza; un 500 en texto plano rompe el `res.json()` del frontend. **Recomendación:** middleware de `X-Request-ID`, logging estructurado con usuario/acción/duración, handler global JSON, métricas por endpoint/upstream.

### O-04 — Medio — Dependencias no reproducibles

**Evidencia:** `requirements.txt:1-8` (solo `>=`, sin lock, `pytest` en runtime). **Impacto:** un rebuild puede traer breaking changes (ya hay saltos mayores: Starlette 1.9.0, FastAPI 0.149.0). **Recomendación:** lockfile + `requirements-dev.txt` con techo de versiones.

### O-05 — Medio — Configuración dependiente del CWD y con defaults de test

**Evidencia:** `config.py:10` (`COOPYA_BASE_URL` default a `test.coopya.com.ar`), `:19` (`env_file=".env"` relativo al directorio de ejecución). **Impacto:** iniciar desde otro directorio deja el sistema apuntando silenciosamente al ambiente de test. **Recomendación:** ruta absoluta o variables de proceso, sin defaults productivos, fail-fast en producción.

### O-06 — Medio — Sin git, README ni specs; código cambiado durante la auditoría

**Evidencia:** no hay `.git`, `.github`, README de backend ni specs en la raíz (solo `backend/` y `frontend/`). Las modificaciones detectadas durante la sesión (16:42–17:05) obligan a tratar esta evidencia como una foto de ese momento. **Recomendación:** inicializar git, README raíz con arquitectura/runbook/variables, y congelar versiones para auditorías.

### O-07 — Bajo — Imports dependientes del directorio de ejecución

Ausencia de `__init__.py` y de configuración de pytest: `from main import app` / `from app...` funcionan solo si pytest se ejecuta desde `backend/`. **Recomendación:** agregar `__init__.py` y `pytest.ini`/`pyproject.toml` fijando `pythonpath`.

### O-08 — Bajo — Artefactos dentro del proyecto

`.venv/`, `__pycache__/` y `.pytest_cache/` viven dentro de `backend/`; no hay `.gitignore` de backend. **Recomendación:** ignorarlos/versionar solo fuentes.

### O-09 — Informativo — `PORT` declarado y sin uso

**Evidencia:** `config.py:7`. No hay script de arranque/Dockerfile/nginx en el repo: no es verificable cómo se sirve en producción (bind, TLS, proxy, rate limits de infra).

---

## 7. Puntos positivos (lo que está bien planteado)

1. **Motor francés correcto y verificado a mano**: fórmula `C = V·i·(1+i)^n / ((1+i)^n − 1)` (`sistema_frances.py:65-66`), última cuota que absorbe el residual (`:79-83`), `Σ capital = monto` y saldo final 0 garantizados por construcción.
2. **Dinero en centavos enteros + `ROUND_HALF_UP`**, sin floats en el dominio (`sistema_frances.py:7-9,40`; `prestamo.py:30-31,58-65`). Es la decisión correcta para un sistema financiero.
3. **Migración a centavos completa y coherente** entre schema, motor, modelo y tests.
4. **Snapshot de condiciones pactadas** (`tna_pactada`, `tem_pactada`, `alicuota_iva`) y de identidad del socio: buen instinto para reproducibilidad y auditoría.
5. **Tests existentes verifican lo mínimo valioso**: exactitud de capital, saldo final, consistencia por fila y tasa 0 (`tests/test_sistema_frances.py:20-27,42-46`; `tests/test_simulaciones_api.py:23-26`).
6. **Frontend delega el cálculo al backend** y usa `Authorization: Bearer` en lugar de `?token=` (`App.tsx:168,200`).
7. **Sin SQLi, command injection ni path traversal** en el código actual: no hay queries, ni shell, ni archivos con input de usuario. **SSRF no aplicable hoy**: `base_url` viene de settings.
8. **Timeout de 10 s** en todas las llamadas salientes, `pool_pre_ping=True`, cierre de sesión en `finally`, versionado `/api/v1` y separación por capas (`core/domain/schemas/integrations/api`).

---

## 8. Verificación independiente (agente escéptico)

| Punto | Veredicto | Evidencia |
|---|---|---|
| Ningún endpoint tiene auth | **Confirmado** | `router.py` completo; login es passthrough a CoopYa |
| Sin token ⇒ usa el default del servidor | **Confirmado** (incluso token vacío por truthiness) | `coopya_client.py:37,55`; `router.py:51-53,73-75` |
| `verify=False` | **Confirmado**, en **3** llamadas (no 2), incluida la del login | `coopya_client.py:25,45,58` |
| Fuga del token vía `str(e)` | **Confirmado** con precisión: solo en `HTTPStatusError` (URL incluida); no en timeouts/connect | `router.py:64,80`; httpx `_models.py:794-829` |
| CORS "*" + credenciales | **Confirmado y agravado**: Starlette 1.9.0 refleja el `Origin` y manda `Allow-Credentials: true` (política "todo origen con credenciales") | `starlette/middleware/cors.py:151-177` |
| Caso 100.000/12/TNA 60%/IVA 21% | **Confirmado fila por fila** a mano: suma capital exacta, saldo final 0, total a pagar $142.822,48 | `sistema_frances.py:59-89` |
| TEA | **Confirmado: la API no puede expresar TEA**; difiere ~5,92% en la cuota | `simulacion.py:15`; `sistema_frances.py:59` |
| Tasa 0 / monto 100.000 / n=3 | **Confirmado**: rama propia y última cuota absorbe el residuo | `sistema_frances.py:62-63,79-83` |
| Invariantes contables | **Se cumplen**; lo que falla son entradas extremas no acotadas ⇒ 500 | `system_frances.py:66`; `router.py:37` |
| Modelo y DB desconectados | **Confirmado y más fuerte**: `database.py` completo (engine incluido) es código muerto | grep sin imports; `database.py:5-21` |
| La API no persiste nada | **Confirmado** (5 endpoints, ninguno toca DB) | `router.py` completo |

---

## 9. Anexo — Cálculo manual de referencia (sin ejecutar código)

### Caso 1: $100.000,00 (10.000.000 centavos), 12 cuotas, TNA 60% (TEM 5%), IVA 21%

Cuota pura teórica: `10.000.000 × 0,05 × 1,05^12 / (1,05^12 − 1)` = 1.128.254,0987… → **1.128.254 centavos ($11.282,54)**.

| # | Saldo inicial | Interés | Capital | IVA | Cuota total | Saldo final |
|---|---|---|---|---|---|---|
| 1 | 10.000.000 | 500.000 | 628.254 | 105.000 | 1.233.254 | 9.371.746 |
| 2 | 9.371.746 | 468.587 | 659.667 | 98.403 | 1.226.657 | 8.712.079 |
| 3 | 8.712.079 | 435.604 | 692.650 | 91.477 | 1.219.731 | 8.019.429 |
| ... | | | | | | |
| 12 | 1.074.529 | 53.726 | 1.074.529 | 11.282 | 1.139.537 | 0 |

- Totales: capital **10.000.000** (exacto), interés **3.539.049**, IVA **743.199**, total a pagar **14.282.248** ($142.822,48). Σ cuota_total = total_a_pagar ✔
- La última cuota pura es **1.128.255** (+1 centavo), por la regla de absorción: es comportamiento esperado.
- El equipo de verificación reprodujo las 12 filas a mano y coinciden con la lógica del código.

### Caso 2: $100.000,00, 12 cuotas, TEA 60%

TEM = 1,6^(1/12) − 1 ≈ **0,0399441079** (3,994411%); cuota pura ≈ **1.065.176 centavos ($10.651,76)**.
Primera fila: interés 399.441 + IVA 83.883 + capital 665.735 = **1.149.059 centavos ($11.490,59)**.
**La API actual no puede expresar este caso**; enviar `tna: 0.60` produce el Caso 1, unos **$630,78 más por cuota**.

### Caso 3: tasa 0, $100.000, 3 cuotas

`round(10.000.000/3) = 3.333.333` ⇒ cuotas: 3.333.333 / 3.333.333 / **3.333.334** ⇒ suma exacta, saldo final 0.

---

## 10. Roadmap de remediación sugerido

### Fase 0 — Antes de seguir exponiendo el sistema (inmediato)
1. Rotar el token de CoopYa y sacarlo del código (S-04).
2. Eliminar el fallback a `default_token`; sin token ⇒ 401 (S-01).
3. `verify=True` con CA confiable (S-03); no devolver `str(e)` (S-02); token solo por header (S-10).
4. CORS por entorno con orígenes explícitos y sin credenciales (S-05).
5. Auth real + rate limit en login y endpoints de PII (S-01, S-06); sacar token de `localStorage` (S-11) si es viable.
6. Inicializar git y congelar esta versión (O-06).

### Fase 1 — Antes del primer préstamo real
7. `tipo_tasa` TNA/TEA y derivación de TEM (D-01).
8. Cotas de entrada + captura de `DecimalException` (D-02).
9. Alembic + wiring de DB + `DATABASE_URL` obligatoria (P-03).
10. Constraints (`unique` de cuota, checks de estado/montos), índices y `rowversion` (P-02, P-07, P-14).
11. Pagos + imputaciones + idempotencia + concurrencia (P-01, P-02).
12. Auditoría de operaciones y usuario (P-15); moneda/desembolso (P-08); fechas UTC/Argentina (P-09).

### Fase 2 — Antes de abrir a operadores
13. `response_model` y allowlist de PII (S-08); paginación y criterio mínimo (S-09); errores estructurados y `requestId` (A-01, O-03).
14. Tests de persistencia/concurrencia/contrato + CI + lockfile (O-01, O-04, P-18).
15. Fixes de frontend: carrera de CC, 422 en pantalla, URL configurable, IVA dinámico, fechas visibles (A-03, A-04, A-06, D-03, D-09).

---

## 11. Limitaciones de esta auditoría

1. **No se ejecutó código ni tests ni llamadas al monolito**: todo es análisis estático y cálculo manual. Las afirmaciones sobre comportamiento de librerías se basan en leer el código instalado en `.venv`.
2. **El código cambió durante la auditoría** y no hay git: esta evidencia corresponde a los archivos con mtime 16:42–17:05 del 19/10/2026.
3. **No verificable sin el monolito**: si `BuscarPersona` con criterios vacíos devuelve todo, qué campos exactos retorna y si el token de test sigue activo.
4. **No se ejecutaron scanners de CVEs**: versiones reportadas sin veredicto de vulnerabilidades.
5. **Confianza media en**: eco de contraseña en 422 (inferido de FastAPI/Pydantic), contenido del `.pyc` de config, y valores exactos que disparan excepciones decimal (razonados, no ejecutados).

---

*Informe generado a partir de auditoría estática multi-agente (dominio, seguridad, datos, contrato y verificador independiente). La única escritura realizada en el proyecto es este archivo.*
