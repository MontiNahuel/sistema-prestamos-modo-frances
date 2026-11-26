import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  TIPOS_REPORTE_EXTRA,
  claseBadgeEstadoCatalinas,
  clasificarEstadoCatalinas,
  construirPayloadCatalinas,
  construirTablaExcelCatalinas,
  descomponerEstadoCatalinas,
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
  const okSinTolerancia = construirPayloadCatalinas({
    periodoDesde: '2026-05',
    periodoHasta: '',
    dnis: '',
    usarTolerancia: 'N',
    toleranciaPctPorcentaje: '5',
    verSinLote: 'S',
  });
  assert.deepEqual(okSinTolerancia.payload, {
    periodo_desde: '202605',
    periodo_hasta: null,
    dnis: null,
    tolerancia_pct: 0,
    ver_sin_lote: 'S',
  });

  const okConRangoYDnis = construirPayloadCatalinas({
    periodoDesde: '202605',
    periodoHasta: '2027-06',
    dnis: '28701648, 34776005',
    usarTolerancia: 'S',
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
    usarTolerancia: 'N',
    toleranciaPctPorcentaje: '5',
    verSinLote: 'S',
  });
  assert.ok(rangoInvertido.error);

  const toleranciaFueraDeRango = construirPayloadCatalinas({
    periodoDesde: '2026-05',
    periodoHasta: '',
    dnis: '',
    usarTolerancia: 'S',
    toleranciaPctPorcentaje: '150',
    verSinLote: 'S',
  });
  assert.ok(toleranciaFueraDeRango.error);
});

test('clasificarEstadoCatalinas y claseBadgeEstadoCatalinas asignan colores pastel correctos', () => {
  assert.equal(clasificarEstadoCatalinas('YA SE COBRO'), 'ok');
  assert.equal(clasificarEstadoCatalinas('SIN LOTE CARGADO (Cuota 2 - ACTIVO)'), 'pendiente');
  assert.equal(clasificarEstadoCatalinas('TODAVIA NO SE COBRO (SIN APLICAR)'), 'vencida');

  assert.equal(claseBadgeEstadoCatalinas('YA SE COBRO'), 'reportes-estado reportes-estado-pagada');
  assert.equal(
    claseBadgeEstadoCatalinas('TODAVIA NO SE COBRO (Error -1: posible Catalinas -> Préstamo 1)'),
    'reportes-estado reportes-estado-vencida'
  );
  assert.equal(
    claseBadgeEstadoCatalinas('SIN LOTE CARGADO'),
    'reportes-estado reportes-estado-pendiente'
  );
});

test('descomponerEstadoCatalinas separa estado, error/detalle y suposicion', () => {
  assert.deepEqual(descomponerEstadoCatalinas('YA SE COBRO'), {
    estadoBase: 'YA SE COBRO',
    detalleError: null,
    suposicion: null,
  });

  assert.deepEqual(
    descomponerEstadoCatalinas(
      'TODAVIA NO SE COBRO (Error -1: posible Catalinas -> Préstamo 328424 $2989.75 SALDADO)'
    ),
    {
      estadoBase: 'TODAVIA NO SE COBRO',
      detalleError: 'Error -1',
      suposicion: 'Posible Catalinas → Préstamo 328424 $2989.75 SALDADO',
    }
  );

  assert.deepEqual(
    descomponerEstadoCatalinas('TODAVIA NO SE COBRO (Error 68: CUOTA INEXISTENTE)'),
    {
      estadoBase: 'TODAVIA NO SE COBRO',
      detalleError: 'Error 68: CUOTA INEXISTENTE',
      suposicion: null,
    }
  );

  assert.deepEqual(
    descomponerEstadoCatalinas('SIN LOTE CARGADO (Cuota 3 - ACTIVO)'),
    {
      estadoBase: 'SIN LOTE CARGADO',
      detalleError: 'Cuota 3 - ACTIVO',
      suposicion: null,
    }
  );
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
  assert.equal(hoja.getCell('D2').value, 'YA SE COBRO');
  assert.equal(hoja.getCell('G2').value, 12500.25);
  assert.equal(hoja.getCell('H3').value, 'No disponible');
});
