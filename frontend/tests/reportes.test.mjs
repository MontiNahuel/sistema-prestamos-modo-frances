import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { construirReporte, fechaArgentina } from '../src/features/reportes/reportes.ts';
import { crearLibroReporte } from '../src/features/reportes/exportarReporte.ts';
import { cargarCartera } from '../src/features/reportes/reportesApi.ts';

const filtros = (tipo, otros = {}) => ({ tipo, desde: '2026-10-01', hasta: '2026-10-31', buscar: '', estadoPrestamo: '', estadoCuota: '', ...otros });
const cuota = (numero, otros = {}) => ({ id: `c${numero}`, numero_cuota: numero, fecha_vencimiento: `2026-10-${String(numero * 10).padStart(2, '0')}`, capital_centavos: 10000, interes_centavos: 1000, iva_interes_centavos: 210, cuota_total_centavos: 11210, estado: 'PENDIENTE', monto_pagado_centavos: 0, fecha_pago: null, ...otros });
const prestamo = (otros = {}) => ({ id: 'prestamo-1', persona_id: 42, persona_nombre: 'Asociado de prueba', persona_doc: '001234', fecha_alta: '2026-10-01T12:00:00', monto_solicitado_centavos: 20000, total_capital_centavos: 20000, plazo_meses: 2, tna_pactada: '0.6', total_a_pagar_centavos: 22420, saldo_deudor_actual_centavos: 20000, estado: 'ACTIVO', cuotas: [cuota(1), cuota(2)], ...otros });
const generar = (tipo, cartera = [prestamo()], otros = {}) => construirReporte(cartera, filtros(tipo, otros), '2026-10-23');

test('fechas: vencimientos sin desfase y datetimes UTC convertidos a Buenos Aires', () => {
  assert.equal(fechaArgentina('2026-10-01'), '2026-10-01');
  assert.equal(fechaArgentina('2026-10-01T02:30:00'), '2026-09-30');
  assert.equal(fechaArgentina('2026-11-01T02:59:59Z'), '2026-10-31');
});

test('caída: límites inclusivos, vencidas, pagadas, cancelados y totales exactos', () => {
  const p = prestamo({ cuotas: [cuota(1, { fecha_vencimiento: '2026-10-01', estado: 'PAGADA', monto_pagado_centavos: 11210 }), cuota(2, { fecha_vencimiento: '2026-10-31', monto_pagado_centavos: 100 })] });
  const r = generar('caida', [p]);
  assert.equal(r.filas.length, 2);
  assert.deepEqual(r.filas.map(f => f.estado), ['PAGADA', 'PENDIENTE']);
  assert.equal(r.resumen[1].valor, 22420);
  assert.equal(r.resumen[2].valor, 11110);
  assert.equal(generar('caida', [prestamo({ estado: 'CANCELADO' })]).resumen[2].valor, 0);
  assert.equal(generar('caida', [prestamo()], { estadoCuota: 'VENCIDA' }).filas.length, 2);
  assert.equal(generar('caida', [prestamo({ cuotas: [cuota(1, { fecha_vencimiento: null })] })]).filas.length, 0);
});

test('último pago usa solo el registro más reciente, conserva sin pagos y cuenta vencidas', () => {
  const p = prestamo({ saldo_deudor_actual_centavos: 10000, cuotas: [cuota(1, { estado: 'PAGADA', monto_pagado_centavos: 11210, fecha_pago: '2026-10-10T14:00:00' }), cuota(2)] });
  const r = generar('ultimo-pago', [p, prestamo({ id: 'sin-pago' })]);
  assert.equal(r.filas[0].importe, 11210);
  assert.equal(r.filas[0].ultimoPago, '2026-10-10');
  assert.equal(r.filas[0].pendientes, 1);
  assert.equal(r.filas[0].vencidas, 1);
  assert.equal(r.filas[1].ultimoPago, null);
  assert.equal(r.resumen[1].valor, 1);
  assert.equal(generar('ultimo-pago', [p], { desde: '2026-10-11' }).filas.length, 0);
});

test('último pago no suma pagos anteriores del mismo día', () => {
  const p = prestamo({ cuotas: [cuota(1, { estado: 'PAGADA', monto_pagado_centavos: 11210, fecha_pago: '2026-10-10T14:00:00' }), cuota(2, { estado: 'PAGADA', monto_pagado_centavos: 11210, fecha_pago: '2026-10-10T15:00:00' })] });
  assert.equal(generar('ultimo-pago', [p]).filas[0].importe, 11210);
});

test('vencimientos ausentes se advierten y no se interpretan como cero cuotas vencidas', () => {
  const p = prestamo({ cuotas: [cuota(1, { fecha_vencimiento: null }), cuota(2)] });
  assert.match(generar('caida', [p]).advertencias[0], /1 cuotas sin fecha/);
  const r = generar('ultimo-pago', [p]);
  assert.equal(r.filas[0].vencidas, null);
  assert.equal(r.advertencias.length, 1);
});

test('otorgados: fecha local de alta, tasas decimales y gastos no disponibles', () => {
  const r = generar('otorgados', [prestamo(), prestamo({ id: 'septiembre', fecha_alta: '2026-10-01T02:59:59' })]);
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0].tasa, .6);
  assert.equal(r.filas[0].gastos, null);
  assert.equal(r.filas[0].primeraCuota, 11210);
});

test('cobranzas: capital, intereses e IVA concilian y saldo respeta orden real de pagos', () => {
  const p = prestamo({ saldo_deudor_actual_centavos: 0, cuotas: [cuota(1, { estado: 'PAGADA', monto_pagado_centavos: 11210, fecha_pago: '2026-10-15T14:00:00' }), cuota(2, { estado: 'PAGADA', monto_pagado_centavos: 11210, fecha_pago: '2026-10-05T14:00:00' })] });
  const r = generar('cobranzas', [p]);
  assert.equal(r.filas[0].cuota, 2);
  assert.equal(r.filas[0].saldo, 10000);
  assert.equal(r.filas[1].saldo, 0);
  assert.equal(r.filas[0].tipoPago, 'Cuota anticipada');
  assert.equal(r.filas[0].medio, null);
  for (const f of r.filas) assert.equal(f.capital + f.interes + f.iva + f.otros, f.importe);
  assert.equal(r.resumen[1].valor, 22420);
});

test('cobranzas parciales o saldos no conciliados no fabrican imputaciones', () => {
  const p = prestamo({ cuotas: [cuota(1, { monto_pagado_centavos: 3000, fecha_pago: '2026-10-05T12:00:00' }), cuota(2)] });
  const r = generar('cobranzas', [p]);
  assert.equal(r.filas[0].importe, null);
  assert.equal(r.filas[0].capital, null);
  assert.equal(r.filas[0].saldo, null);
  assert.equal(r.resumen[1].valor, 0);
  assert.equal(generar('ultimo-pago', [p]).filas[0].importe, null);
});

test('búsqueda, estados, rangos inválidos y cartera vacía', () => {
  assert.equal(generar('caida', [prestamo()], { buscar: '001234' }).filas.length, 2);
  assert.equal(generar('caida', [prestamo()], { buscar: 'prestamo-1' }).filas.length, 2);
  assert.equal(generar('otorgados', [prestamo()], { estadoPrestamo: 'MORA' }).filas.length, 0);
  assert.equal(generar('caida', []).resumen[2].valor, 0);
  assert.throws(() => generar('caida', [], { desde: '2026-11-01' }), /período válido/);
});

test('Excel real: roundtrip preserva números, centavos, fechas, documentos y textos sin fórmulas', async () => {
  const r = generar('otorgados', [prestamo({ persona_nombre: '=HYPERLINK("unsafe")' })]);
  const libro = await crearLibroReporte(r, filtros('otorgados'), '2026-10-23T15:00:00Z');
  const leido = new ExcelJS.Workbook();
  await leido.xlsx.load(await libro.xlsx.writeBuffer());
  assert.equal(leido.worksheets.length, 2);
  const hoja = leido.getWorksheet('Detalle');
  assert.equal(hoja.getCell('B2').value, '=HYPERLINK("unsafe")');
  assert.equal(hoja.getCell('C2').value, '001234');
  assert.equal(hoja.getCell('F2').value, 200);
  assert.equal(hoja.getCell('G2').value, .6);
  assert.equal(hoja.getCell('I2').value, 112.1);
  assert.equal(hoja.getCell('K2').value, 'No disponible');
  assert.ok(hoja.getCell('A2').value instanceof Date);
  assert.equal(hoja.getCell('A2').numFmt, 'dd/mm/yyyy');
  assert.ok(hoja.autoFilter);
  assert.equal(hoja.views[0].ySplit, 1);
});

test('API: carga más de 500 préstamos sin truncar y rechaza páginas fallidas', async t => {
  globalThis.localStorage = { getItem: () => null };
  const lista = Array.from({ length: 501 }, (_, i) => prestamo({ id: `p-${i}` }));
  const offsets = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const offset = Number(new URL(url, 'http://test').searchParams.get('offset'));
    offsets.push(offset);
    return Response.json(lista.slice(offset, offset + 500));
  });
  assert.equal((await cargarCartera(new AbortController().signal, () => {})).length, 501);
  assert.deepEqual(offsets, [0, 500]);
  globalThis.fetch = async () => new Response('Error', { status: 500 });
  await assert.rejects(cargarCartera(new AbortController().signal, () => {}), /500/);
});

test('API: cronograma faltante se recupera del detalle; incompleto impide totales parciales', async t => {
  globalThis.localStorage = { getItem: () => null };
  t.mock.method(globalThis, 'fetch', async url => Response.json(url.includes('?') ? [prestamo({ cuotas: null })] : prestamo()));
  assert.equal((await cargarCartera(new AbortController().signal, () => {}))[0].cuotas.length, 2);
  globalThis.fetch = async () => Response.json([prestamo({ cuotas: [] })]);
  await assert.rejects(cargarCartera(new AbortController().signal, () => {}), /cronograma incompleto/);
});
