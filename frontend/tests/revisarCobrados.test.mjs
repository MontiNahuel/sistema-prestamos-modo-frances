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
    dni: '00123456', numero_cuenta: '0012345678901234567890', tipo_producto: 'Personal',
    fecha_aplicacion: '2026-11-06T09:15:00', fecha_movimiento: '2026-11-07T12:45:00',
  }));
  const todo = reporteCobrados(filas);
  assert.deepEqual(todo.columnas.slice(0, 6).map(c => c.titulo), [
    'DNI', 'N.º de cuenta', 'Fecha de aplicación', 'Fecha de movimiento', 'Monto cobrado', 'ID préstamo',
  ]);
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
  const detalle = copia.getWorksheet('Detalle');
  assert.equal(detalle.rowCount, 126);
  assert.equal(detalle.getCell('A2').value, '00123456');
  assert.equal(detalle.getCell('B2').value, '0012345678901234567890');
  assert.deepEqual(detalle.getCell('C2').value, new Date('2026-11-06T09:15:00Z'));
  assert.deepEqual(detalle.getCell('D2').value, new Date('2026-11-07T12:45:00Z'));
  assert.equal(detalle.getCell('E2').value, 100.27);
  assert.equal(detalle.getCell('F2').value, 10);
  assert.equal(copia.getWorksheet('Cobrado por lista').getCell('C3').value, 2506.75);
  assert.equal(reporteCobrados(filas, 'No existe').filas.length, 0);
});

test('las fechas se pueden leer sin cambiar el día registrado', () => {
  assert.equal(formatearFechaCobrado('2026-11-06T09:15:00'), '06/11/2026 09:15:00');
  assert.equal(formatearFechaCobrado('2026-11-05'), '05/11/2026');
  assert.equal(formatearFechaCobrado('2026-11-05T00:00:00'), '05/11/2026');
});
