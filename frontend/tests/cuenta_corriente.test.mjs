import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoBadgeVariant,
  estadosDisponiblesCuotas,
  filtrarCuotasDesglose,
  particionarDesglose
} from '../src/components/personas/cuentaCorrienteHelpers.ts';

test('particionarDesglose usa listas explícitas del backend cuando están presentes', () => {
  const prestamoItem = {
    concepto: 'PRESTAMO_FRANCES',
    origen: 'SISTEMA_FRANCES',
    importePresentado: 12000,
    importeCobrado: 0,
    importePendiente: 12000,
    estado: 'PENDIENTE'
  };
  const centralItem = {
    concepto: 'CUOTA_SOCIAL',
    origen: 'BANCARIO',
    importePresentado: 5500,
    importeCobrado: 5500,
    importePendiente: 0,
    estado: 'COBRADO'
  };

  const res = particionarDesglose(
    [prestamoItem, centralItem],
    [prestamoItem],
    [centralItem]
  );

  assert.equal(res.cuotasPrestamos.length, 1);
  assert.equal(res.cuotasPrestamos[0].concepto, 'PRESTAMO_FRANCES');
  assert.equal(res.cuotasCentral.length, 1);
  assert.equal(res.cuotasCentral[0].concepto, 'CUOTA_SOCIAL');
});

test('particionarDesglose separa y filtra espejos legacy cuando el backend envía solo desglose', () => {
  const desglose = [
    {
      concepto: 'CUOTA_SOCIAL',
      banco: 'BAPRO',
      origen: 'BANCARIO',
      importePresentado: 5500,
      importeCobrado: 0,
      importePendiente: 5500,
      estado: 'PENDIENTE'
    },
    {
      concepto: 'SERVICIO',
      banco: 'MANUAL',
      origen: 'MANUAL',
      motivo: 'Cuota 1/12 Sistema Francés (Cap: $6,282.54)',
      importePresentado: 12332.54,
      importeCobrado: 0,
      importePendiente: 12332.54,
      estado: 'PENDIENTE'
    },
    {
      concepto: 'PRESTAMO_FRANCES',
      origen: 'SISTEMA_FRANCES',
      planNombre: 'Préstamo Personal Tradicional',
      importePresentado: 12332.54,
      importeCobrado: 0,
      importePendiente: 12332.54,
      estado: 'PENDIENTE'
    }
  ];

  const { cuotasPrestamos, cuotasCentral } = particionarDesglose(desglose);
  assert.equal(cuotasPrestamos.length, 1);
  assert.equal(cuotasPrestamos[0].planNombre, 'Préstamo Personal Tradicional');
  assert.equal(cuotasCentral.length, 1);
  assert.equal(cuotasCentral[0].concepto, 'CUOTA_SOCIAL');
});

test('estadoBadgeVariant asigna colores correctos por estado', () => {
  assert.equal(estadoBadgeVariant('COBRADO'), 'success');
  assert.equal(estadoBadgeVariant('EN_MORA'), 'danger');
  assert.equal(estadoBadgeVariant('RECHAZADO'), 'danger');
  assert.equal(estadoBadgeVariant('PARCIAL'), 'info');
  assert.equal(estadoBadgeVariant('CANCELADA'), 'neutral');
  assert.equal(estadoBadgeVariant('PENDIENTE'), 'warning');
});

test('filtrarCuotasDesglose filtra por numeroCuota, estado y fecha de cuota', () => {
  const cuotas = [
    { prestamoId: 'p1', numeroCuota: 1, periodoObligacion: '2026-12-10', concepto: 'PRESTAMO_FRANCES', importePresentado: 1000, importeCobrado: 1000, importePendiente: 0, estado: 'COBRADO' },
    { prestamoId: 'p1', numeroCuota: 2, periodoObligacion: '2027-01-10T00:00:00', concepto: 'PRESTAMO_FRANCES', importePresentado: 1000, importeCobrado: 0, importePendiente: 1000, estado: 'PENDIENTE' },
    { prestamoId: 'p2', numeroCuota: 1, periodoObligacion: '2027-01-10', concepto: 'PRESTAMO_FRANCES', importePresentado: 2000, importeCobrado: 0, importePendiente: 2000, estado: 'EN_MORA' },
  ];

  assert.deepEqual(estadosDisponiblesCuotas(cuotas), ['COBRADO', 'PENDIENTE', 'EN_MORA']);
  assert.equal(filtrarCuotasDesglose(cuotas, { numeroCuota: '1' }).length, 2);
  assert.equal(filtrarCuotasDesglose(cuotas, { estado: 'PENDIENTE' }).length, 1);
  assert.equal(filtrarCuotasDesglose(cuotas, { fecha: '2027-01-10' }).length, 2);
  assert.equal(
    filtrarCuotasDesglose(cuotas, { numeroCuota: '1', estado: 'EN_MORA', fecha: '2027-01-10' }).length,
    1
  );
});
