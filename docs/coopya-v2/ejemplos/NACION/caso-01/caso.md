# Caso 01 - BNA (Banco Nación): Débito Cobrado Exitoso y Rendición de Lote (V2)

## Descripción del Escenario
Se presenta un lote de Débito Directo BNA (NroArchivo 1935) con 2 movimientos:
1. Operación 201: Cliente 100052, Sucursal BNA 0015, Sistema Cuenta 02 (Caja de Ahorro), Cuenta 00012345678, Importe $15.000,00 (1.500.000 centavos).
2. Operación 202: Cliente 100088, Sucursal BNA 0022, Sistema Cuenta 02 (Caja de Ahorro), Cuenta 00098765432, Importe $9.500,00 (950.000 centavos).

La entidad bancaria Banco Nación rinde la respuesta (Identificador `D`):
* Movimiento 1: Estado `0` (Cobrado / Aplicado).
* Movimiento 2: Estado `9` (Rechazado) con motivo `FONDOS INSUFICIENTES         `.

Totales de pie en Rendición (Alineación matemática en centavos - EXP-04):
* Total Debitar: $24.500,00 = 2.450.000 centavos (`000000002450000`, 15 chars)
* Cantidad Registros: 2 (`000002`, 6 chars)
* Total No Aplicados: $9.500,00 = 950.000 centavos (`000000000950000`, 15 chars)
* Cantidad No Aplicados: 1 (`000001`, 6 chars)

## Metadatos Técnicos
* **Codificación:** ASCII / Windows-1252.
* **Fin de línea:** CRLF (`\r\n`).
* **Longitud fija de renglón:** 128 caracteres exactos.
