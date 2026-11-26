import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { formatearFechaCobrado, reporteCobrados } from '../src/features/reportes/revisarCobrados.ts';
import { agregarTablaExcel } from '../src/features/reportes/exportarReporte.ts';

test('detalle, filtro de lista, agregación y Excel usan todos los registros del snapshot', async () => {
  const filas = Array.from({ length: 125 }, (_, i) => ({
    fuente_cobro: 'MP', banco: 'BAPRO', lista_cobro: i < 100 ? 'MP / BAPRO - 1' : 'MP / BAPRO - 2',
    id_lista: i < 100 ? 1 : 2, id_cobro: 1, id_registro: i + 1, idprestamo: 10, idcuota: 1,
    periodohaber: '202610', fechageneracion: '2026-11-05T23:59:00', tipo_prestamo: 'Prueba', importe_cobrado_centavos: 10027,
    fecha_aplicacion: '2026-11-06T09:15:00', numero_cuenta: '0012345678901234567890', tipo_producto: 'Personal',
  }));
  const todo = reporteCobrados(filas);
  assert.equal(todo.filas.length, 125);
  assert.equal(todo.resumen[2].valor, 1253375);
  assert.equal(todo.anexos[0].filas.length, 2);
  const filtrado = reporteCobrados(filas, 'MP / BAPRO - 2');
  assert.equal(filtrado.filas.length, 25);
  assert.equal(filtrado.resumen[2].valor, 250675);
  const libro = new ExcelJS.Workbook();
  agregarTablaExcel(libro, 'Detalle', todo);
  agregarTablaExcel(libro, 'Cobrado por lista', todo.anexos[0]);
  const copia = new ExcelJS.Workbook();
  await copia.xlsx.load(await libro.xlsx.writeBuffer());
  assert.equal(copia.getWorksheet('Detalle').rowCount, 126);
  assert.equal(copia.getWorksheet('Detalle').getCell('B2').value, 100.27);
  assert.equal(copia.getWorksheet('Detalle').getCell('C2').value, '0012345678901234567890');
  assert.equal(copia.getWorksheet('Cobrado por lista').getCell('C3').value, 2506.75);
  assert.equal(reporteCobrados(filas, 'No existe').filas.length, 0);
});

test('aplicación y generación se pueden leer sin cambiar la fecha registrada', () => {
  assert.equal(formatearFechaCobrado('2026-11-06T09:15:00'), '06/11/2026 09:15:00');
  assert.equal(formatearFechaCobrado('2026-11-05'), '05/11/2026');
  assert.equal(formatearFechaCobrado('2026-11-05T00:00:00'), '05/11/2026');
});
