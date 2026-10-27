# Contrato de Integración Técnica: Préstamos Franceses y CoopYa (V2)

## 1. Principios Arquitectónicos
1. **Responsable Único de Escritura (Single Writer Principle):**
   * Las tablas bancarias compartidas (`PersonasRepositorio`, `CuentaCorrienteDesglose`, `Presentacion{Banco}Auditoria`) son gestionadas en sus transacciones de rendición por los procedimientos almacenados de CoopYa (`ImputarRespuestaBaproLote`, `ImputarRespuestaNacionLote`).
   * El sistema francés no debe actualizar directamente las columnas `Resultado`, `RespuestaId` ni `FechaModif` mediante UPDATEs aislados.
2. **Exclusión Mutua y Serialización:**
   * La concurrencia se garantiza a nivel de motor SQL Server mediante `sp_getapplock` exclusivo por archivo (`@LockOwner='Transaction'`, timeout 15s).
   * La idempotencia se asegura verificando la existencia previa del registro `'RESPUESTA'` en `Presentacion{Banco}Archivos`.
3. **Atomicidad de Débito Bancario:**
   * Los débitos automáticos operan bajo la premisa de Todo o Nada: no existen cobros bancarios parciales en la rendición de BAPRO o Nación.

---

## 2. Diccionario de Tipos, Unidades y Restricciones

| Atributo / Campo | Tipo en Base de Datos | Unidad / Formato | Regla de Validación Activa |
|---|---|---|---|
| `PersonasRepositorio.Monto` | `varchar(20)` | **Centavos como texto numérico** (ej. `'0001250000'`) | `CK_PersonasRepositorio_MontoNumerico`: `NOT Monto LIKE '%[^0-9]%'`. Prohibido decimal con punto o coma. |
| `PersonasRepositorio.TipoMovimiento` | `varchar(20)` | Literal de ajuste manual | `CK_PersonasRepositorio_TipoMovimiento`: Solo `NULL` (para bancos), `'BONIFICACION'`, `'CANCELACION_MORA'`, `'AJUSTE_NEGATIVO'`, `'AJUSTE_POSITIVO'`, `'PAGO_MANUAL'`. |
| `CuentaCorrienteDesglose.ImportePresentado` | `decimal(18,2)` | **Pesos con 2 decimales** (ej. `12500.00`) | Debe coincidir exactamente con `TRY_CAST(pd.Importe AS DECIMAL(18,2)) / 100.0`. |
| `CuentaCorrienteDesglose.Concepto` | `varchar(30)` | Literal de concepto | `CK_CCDesglose_Concepto`: Solo conceptos válidos cooperativos. En propuesta 01 se amplía a `'PRESTAMO_CUOTA'`. |
| `Banco` | `varchar(20)` o `varchar(50)` | Literal de entidad | Estrictamente `'BAPRO'` o `'NACION'`. El sistema francés debe mapear bidireccionalmente `'BNA' <-> 'NACION'`. |

---

## 3. Resolución de Identificadores (UUID vs INT)
* **Problema:** En el Sistema Francés, `Prestamo.id` y `Cuota.id` son UUID `String(36)`. En CoopYa, `PlanId` y `NumeroCuota` son `INT`.
* **Regla Mandatoria:** **Jamás truncar, castear ni calcular hash de un UUID a un INT.**
* **Solución de Integración:**
  * Utilizar la tabla de correspondencia `dbo.EquivalenciasPrestamos` (ver `sql/propuestas/02_tabla_equivalencias_uuid_prestamos.sql`).
  * Asignar un `PlanId INT` secuencial por contrato de préstamo y registrar el mapeo unívoco con `PrestamoId_UUID` y `CuotaId_UUID`.
  * Vincular `socio_id` (UUID) con `Personas.Id` (INT) mediante el índice unívoco en `Personas.NumeroDoc` / `Cuil`.

---

## 4. Máquina de Estados y Transiciones de Cobranza

```
                ┌──────────────────────────────────┐
                │             PENDIENTE            │
                │  (CodigoRespuesta IS NULL / '')  │
                └─────────────────┬────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       ┌────────────────────┐          ┌────────────────────┐
       │      COBRADO       │          │     RECHAZADO      │
       │ ('OK' / '0')       │          │ (Códigos Rxx / '9')│
       └──────────┬─────────┘          └────────────────────┘
                  │ (Solo BAPRO)
                  ▼
       ┌────────────────────┐
       │     REVERTIDO      │
       │ (Transacc. 52..69) │
       └────────────────────┘
```

* **Código Nación `'7'`:** Actualmente el motor lo clasifica como `RECHAZADO` en `sp_GetCuentaCorrienteResumen`. La propuesta 05 documenta su tratamiento como `PENDIENTE_REINTENTO`.
