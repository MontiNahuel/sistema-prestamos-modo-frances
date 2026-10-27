# Caso 01 - BAPRO: Débito Cobrado Exitoso y Débito Rechazado por Saldo Insuficiente (V2)

## Descripción del Escenario
Se presenta un lote de Débito Directo BAPRO (NroArchivo 1205) con 2 movimientos correspondientes a cuotas sociales/servicios:
1. Operación 101: Cliente 100052, CBU 0140303703694950708052, Importe $12.500,00 (1.250.000 centavos).
2. Operación 102: Cliente 100088, CBU 0140186403520350520506, Importe $8.300,00 (830.000 centavos).

La entidad bancaria rinde la respuesta con los siguientes resultados:
* Movimiento 1 (Referencia `014cs0000000101`): Procesado con Código `OK ` (Cobro Exitoso).
* Movimiento 2 (Referencia `014cs0000000102`): Rechazado con Código `R10` (Fondos Insuficientes).

## Sincronización Crítica de Mapeo C# <-> SQL (EXP-03)
* En el formato BAPRO (posiciones 1-based):
  * **Posición 11-24 (14 chars):** Es extraída por `ParseadorRespuestaBapro.cs` como `NumeroSecuencial = linea.Substring(10, 14).Trim().TrimStart('0')`.
  * En `Servicio.cs`, esa propiedad se mapea a la columna `IdentificadorCliente` del tipo estructurado `dbo.RespuestaBaproImputacionType`.
  * En `ImputarRespuestaBaproLote.sql`, se compara numéricamente: `TRY_CAST(a.IdentificadorCliente AS BIGINT) = TRY_CAST(r.IdentificadorCliente AS BIGINT)`.
* Para asegurar la correspondencia unívoca:
  * Línea 1 lleva en posiciones 11-24 el valor `00000000100052` (que coincide con el `IdentificadorCliente` de la auditoría).
  * Línea 2 lleva en posiciones 11-24 el valor `00000000100088`.

## Metadatos Técnicos
* **Codificación:** ASCII / Windows-1252.
* **Fin de línea:** CRLF (`\r\n`).
* **Longitud fija de renglón:** 163 caracteres exactos.
