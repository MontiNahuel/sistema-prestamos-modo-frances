import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aCuotaSocialCentavos,
  aplicarValorCuotaSocialEnItems,
  claveItemPresentable,
  esItemCuotaSocial,
  incluyeCuotaSocial,
  partirIdsSeleccionados,
} from '../src/utils/presentacionHelpers.ts';
import { construirReporte } from '../src/features/reportes/reportes.ts';

test('partirIdsSeleccionados separa correctamente cuotas de préstamo y cuotas sociales', () => {
  const items = [
    { cuota_id: 'cuota-1', cuota_social_id: null, tipo_item: 'CUOTA_PRESTAMO', numero_cuota: 1 },
    { cuota_id: null, cuota_social_id: 'cs-1', tipo_item: 'CUOTA_SOCIAL', periodo: '2026-12', numero_cuota: null },
    { cuota_id: 'cuota-2', cuota_social_id: null, tipo_item: 'CUOTA_PRESTAMO', numero_cuota: 2 },
  ];
  const seleccion = new Set([claveItemPresentable(items[0]), claveItemPresentable(items[1])]);

  assert.equal(esItemCuotaSocial(items[1]), true);
  assert.equal(esItemCuotaSocial(items[0]), false);

  const partido = partirIdsSeleccionados(items, seleccion);
  assert.deepEqual(partido.cuota_ids, ['cuota-1']);
  assert.deepEqual(partido.cuota_social_ids, ['cs-1']);
});

test('reportes muestran costo operativo y cft reales cuando el préstamo los registra', () => {
  const cartera = [
    {
      id: 'p-con-cft',
      numero_prestamo: 300,
      persona_id: 10,
      persona_nombre: 'Socio CFT',
      persona_doc: '30111222',
      fecha_alta: '2026-10-05T12:00:00',
      monto_solicitado_centavos: 100000,
      total_capital_centavos: 100000,
      total_interes_centavos: 5000,
      total_iva_centavos: 1050,
      total_costo_operativo_centavos: 2000,
      total_a_pagar_centavos: 108050,
      cft_tea: 0.95,
      plazo_meses: 1,
      tna_pactada: 0.6,
      tem_pactada: 0.05,
      alicuota_iva: 0.21,
      saldo_deudor_actual_centavos: 0,
      estado: 'FINALIZADO',
      cuotas: [
        {
          id: 'c1',
          numero_cuota: 1,
          fecha_vencimiento: '2026-10-20',
          saldo_inicial_centavos: 100000,
          capital_centavos: 100000,
          interes_centavos: 5000,
          iva_interes_centavos: 1050,
          costo_operativo_centavos: 2000,
          cuota_pura_centavos: 105000,
          cuota_total_centavos: 108050,
          saldo_final_centavos: 0,
          estado: 'PAGADA',
          monto_pagado_centavos: 108050,
          fecha_pago: '2026-10-20T12:00:00',
        },
      ],
    },
  ];

  const filtrosBase = {
    desde: '2026-10-01',
    hasta: '2026-10-31',
    buscar: '',
    numeroPrestamo: '',
    estadoPrestamo: '',
    estadoCuota: '',
  };

  const cond = construirReporte(cartera, { ...filtrosBase, tipo: 'condiciones' }, '2026-10-25');
  assert.equal(cond.filas[0].gastos, 2000);
  assert.equal(cond.filas[0].cft, 0.95);
  assert.equal(cond.advertencias.length, 0);

  const cob = construirReporte(cartera, { ...filtrosBase, tipo: 'cobranzas' }, '2026-10-25');
  assert.equal(cob.filas[0].otros, 2000);
  assert.equal(cob.filas[0].capital + cob.filas[0].interes + cob.filas[0].iva + cob.filas[0].otros, cob.filas[0].importe);
});

test('helpers de cuota social en presentaciones validan visibilidad, centavos y actualizacion de items', () => {
  assert.equal(incluyeCuotaSocial('CUOTA_PRESTAMO'), false);
  assert.equal(incluyeCuotaSocial('CUOTA_SOCIAL'), true);
  assert.equal(incluyeCuotaSocial('PRESTAMO_Y_CUOTA_SOCIAL'), true);

  assert.equal(aCuotaSocialCentavos('', 5500), 550000);
  assert.equal(aCuotaSocialCentavos(10000, 5500), 1000000);
  assert.equal(aCuotaSocialCentavos(0, 5500), null);
  assert.equal(aCuotaSocialCentavos(-100, 5500), null);

  const items = [
    { cuota_id: 'c-1', cuota_social_id: null, tipo_item: 'CUOTA_PRESTAMO', numero_cuota: 1, estado: 'PENDIENTE', monto_centavos: 120000, monto_pesos: 1200 },
    { cuota_id: null, cuota_social_id: 'cs-1', tipo_item: 'CUOTA_SOCIAL', numero_cuota: null, estado: 'PENDIENTE', monto_centavos: 550000, monto_pesos: 5500 },
    { cuota_id: null, cuota_social_id: 'cs-2', tipo_item: 'CUOTA_SOCIAL', numero_cuota: null, estado: 'PAGADA', monto_centavos: 550000, monto_pesos: 5500 },
    { cuota_id: null, cuota_social_id: 'cs-3', tipo_item: 'CUOTA_SOCIAL', numero_cuota: null, estado: 'PRESENTADA', monto_centavos: 550000, monto_pesos: 5500 },
    { cuota_id: null, cuota_social_id: 'cs-4', tipo_item: 'CUOTA_SOCIAL', numero_cuota: null, estado: 'PRESENTADA', monto_centavos: 550000, monto_pesos: 5500 },
  ];
  const seleccion = new Set(['CS:cs-1', 'CS:cs-3']);
  const actualizados = aplicarValorCuotaSocialEnItems(items, 1000000, seleccion);
  assert.equal(actualizados[0].monto_centavos, 120000);
  assert.equal(actualizados[1].monto_centavos, 1000000);
  assert.equal(actualizados[1].monto_pesos, 10000);
  assert.equal(actualizados[2].monto_centavos, 550000);
  // cs-3 es PRESENTADA y está seleccionada -> toma el nuevo monto
  assert.equal(actualizados[3].monto_centavos, 1000000);
  assert.equal(actualizados[3].monto_pesos, 10000);
  // cs-4 es PRESENTADA y NO está seleccionada -> conserva su monto original
  assert.equal(actualizados[4].monto_centavos, 550000);
});
