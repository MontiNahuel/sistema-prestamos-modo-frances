import type { DesgloseCuentaCorriente } from '../../types/persona';

export function estadoBadgeVariant(
  estado: string
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  const upper = (estado || '').toUpperCase();
  if (upper === 'COBRADO' || upper === 'PAGADA') return 'success';
  if (upper === 'EN_MORA' || upper === 'RECHAZADA' || upper === 'RECHAZADO') return 'danger';
  if (upper === 'PARCIAL') return 'info';
  if (upper === 'CANCELADA' || upper === 'CANCELADO') return 'neutral';
  return 'warning';
}

function esEspejoFrancesLegacy(d: DesgloseCuentaCorriente): boolean {
  const origen = (d.origen || '').toUpperCase();
  const concepto = (d.concepto || '').toUpperCase();
  if (origen === 'SISTEMA_FRANCES' || concepto === 'PRESTAMO_FRANCES') return true;
  const banco = (d.banco || '').toUpperCase();
  const motivo = (d.motivo || '').toLowerCase();
  return (banco === 'MANUAL' || origen === 'MANUAL') &&
    (motivo.includes('sistema francés') || motivo.includes('sistema frances'));
}

export function particionarDesglose(
  desglose?: DesgloseCuentaCorriente[],
  desglosePrestamos?: DesgloseCuentaCorriente[],
  desgloseCentral?: DesgloseCuentaCorriente[]
) {
  if (Array.isArray(desglosePrestamos) && Array.isArray(desgloseCentral)) {
    return { cuotasPrestamos: desglosePrestamos, cuotasCentral: desgloseCentral };
  }
  const todos = desglose || [];
  const cuotasPrestamos = Array.isArray(desglosePrestamos)
    ? desglosePrestamos
    : todos.filter(
        (d) =>
          (d.origen || '').toUpperCase() === 'SISTEMA_FRANCES' ||
          (d.concepto || '').toUpperCase() === 'PRESTAMO_FRANCES'
      );
  const cuotasCentral = Array.isArray(desgloseCentral)
    ? desgloseCentral
    : todos.filter((d) => !esEspejoFrancesLegacy(d));
  return { cuotasPrestamos, cuotasCentral };
}

export interface FiltrosCuotaDesglose {
  numeroCuota?: string;
  estado?: string;
  fecha?: string;
  prestamo?: string;
}

export function clavePrestamoDesglose(d: DesgloseCuentaCorriente): string {
  return d.prestamoId || String(d.numeroPrestamo || d.planNombre || 'PRESTAMO');
}

export function estadosDisponiblesCuotas(cuotas: DesgloseCuentaCorriente[]): string[] {
  const vistos = new Set<string>();
  for (const c of cuotas) {
    if (c.estado) vistos.add(c.estado);
  }
  return Array.from(vistos);
}

export function filtrarCuotasDesglose(
  cuotas: DesgloseCuentaCorriente[],
  filtros: FiltrosCuotaDesglose
): DesgloseCuentaCorriente[] {
  const numFiltro = (filtros.numeroCuota || '').trim();
  const estadoFiltro = (filtros.estado || '').trim();
  const fechaFiltro = (filtros.fecha || '').trim();
  const prestamoFiltro = (filtros.prestamo || '').trim();

  return cuotas.filter((c) => {
    if (prestamoFiltro && prestamoFiltro !== 'TODOS' && clavePrestamoDesglose(c) !== prestamoFiltro) {
      return false;
    }
    if (numFiltro && String(c.numeroCuota ?? '') !== numFiltro) {
      return false;
    }
    if (estadoFiltro && estadoFiltro !== 'TODOS' && c.estado !== estadoFiltro) {
      return false;
    }
    if (fechaFiltro) {
      const fechaItem = (c.periodoObligacion || '').slice(0, 10);
      if (fechaItem !== fechaFiltro) return false;
    }
    return true;
  });
}
