import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  TIPOS_REPORTE_EXTRA,
  clasificarEstadoCatalinas,
  construirPayloadCatalinas,
  construirTablaExcelCatalinas,
  normalizarListaDnis,
  normalizarPeriodoAAAAMM,
} from '../src/features/reportes_extra/reportesExtra.ts';
import { agregarTablaExcel } from '../src/features/reportes/exportarReporte.ts';

test('TIPOS_REPORTE_EXTRA incluye el control Catalinas Oracle por defecto', () => {
  assert.ok(TIPOS_REPORTE_EXTRA.length >= 1);
  assert.equal(TIPOS_REPORTE_EXTRA[0].id, 'catalinas-cobros');
});

test('normalizarPeriodoAAAAMM convierte formato YYYY-MM y AAAAMM correctamente', () => {
  assert.equal(normalizarPeriodoAAAAMM('2026-05'), '202605');
  assert.equal(normalizarPeriodoAAAAMM(' 202706 '), '202706');
  assert.equal(normalizarPeriodoAAAAMM(''), null);
  assert.equal(normalizarPeriodoAAAAMM('202613'), null);
  assert.equal(normalizarPeriodoAAAAMM('2026-00'), null);
});

test('normalizarListaDnis limpia separadores y rechaza valores no numericos', () => {
  assert.deepEqual(normalizarListaDnis('  '), { dnis: null });
  assert.deepEqual(normalizarListaDnis('28701648, 34776005; 12345678\n99887766'), {
    dnis: '28701648,34776005,12345678,99887766',
  });
  const invalido = normalizarListaDnis('28701648, abc123');
  assert.ok(invalido.error);
});

test('construirPayloadCatalinas arma payload Oracle y valida rango y tolerancia', () => {
  const okSingleMonth = construirPayloadCatalinas({
    periodoDesde: '2026-05',
    periodoHasta: '',
    dnis: '',
    toleranciaPctPorcentaje: '5',
    verSinLote: 'S',
  });
  assert.deepEqual(okSingleMonth.payload, {
    periodo_desde: '202605',
    periodo_hasta: null,
    dnis: null,
    tolerancia_pct: 0.05,
    ver_sin_lote: 'S',
  });

  const okConRangoYDnis = construirPayloadCatalinas({
    periodoDesde: '202605',
    periodoHasta: '2027-06',
    dnis: '28701648, 34776005',
    toleranciaPctPorcentaje: '7.5',
    verSinLote: 'N',
  });
  assert.deepEqual(okConRangoYDnis.payload, {
    periodo_desde: '202605',
    periodo_hasta: '202706',
    dnis: '28701648,34776005',
    tolerancia_pct: 0.075,
    ver_sin_lote: 'N',
  });

  const rangoInvertido = construirPayloadCatalinas({
    periodoDesde: '2026-07',
    periodoHasta: '2026-05',
    dnis: '',
    toleranciaPctPorcentaje: '5',
    verSinLote: 'S',
  });
  assert.ok(rangoInvertido.error);

  const toleranciaFueraDeRango = construirPayloadCatalinas({
    periodoDesde: '2026-05',
    periodoHasta: '',
    dnis: '',
    toleranciaPctPorcentaje: '150',
    verSinLote: 'S',
  });
  assert.ok(toleranciaFueraDeRango.error);
});

test('clasificarEstadoCatalinas asigna clases semanticas correctas', () => {
  assert.equal(clasificarEstadoCatalinas('YA SE COBRO'), 'ok');
  assert.equal(clasificarEstadoCatalinas('SIN LOTE CARGADO (Cuota 2 - ACTIVO)'), 'pendiente');
  assert.equal(clasificarEstadoCatalinas('TODAVIA NO SE COBRO (SIN APLICAR)'), 'vencida');
});

test('construirTablaExcelCatalinas genera hoja Excel valida con importes exactos en pesos', async () => {
  const respuesta = {
    parametros: {
      periodo_desde: '202605',
      periodo_hasta: '202606',
      dnis: '28701648',
      tolerancia_pct: 0.05,
      ver_sin_lote: 'S',
    },
    resumen: {
      total_filas: 2,
      cobrados: 1,
      no_cobrados: 0,
      sin_lote: 1,
      importe_total: 25000.5,
      importe_cobrados: 12500.25,
      importe_no_cobrados: 0,
      importe_sin_lote: 12500.25,
    },
    filas: [
      {
        periodo_haber: '202606',
        dni: '28701648',
        nombre_persona: 'PEREZ JUAN',
        estado: 'YA SE COBRO',
        importe_cobro: 12500.25,
        idcobro: 901,
        fecha_cobro: '2026-06-15',
        idprestamo: 4412,
      },
      {
        periodo_haber: '202605',
        dni: '28701648',
        nombre_persona: 'PEREZ JUAN',
        estado: 'SIN LOTE CARGADO',
        importe_cobro: 12500.25,
        idcobro: null,
        fecha_cobro: null,
        idprestamo: null,
      },
    ],
  };

  const libro = new ExcelJS.Workbook();
  const tabla = construirTablaExcelCatalinas(respuesta);
  agregarTablaExcel(libro, 'Catalinas Oracle', tabla);

  const buffer = await libro.xlsx.writeBuffer();
  const libroLeido = new ExcelJS.Workbook();
  await libroLeido.xlsx.load(buffer);

  const hoja = libroLeido.getWorksheet('Catalinas Oracle');
  assert.ok(hoja);
  assert.equal(hoja.getCell('A2').value, '202606');
  assert.equal(hoja.getCell('B2').value, '28701648');
  assert.equal(hoja.getCell('E2').value, 12500.25);
  assert.equal(hoja.getCell('F3').value, 'No disponible');
});
