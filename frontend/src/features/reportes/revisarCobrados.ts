import type { Reporte } from './reportes';

export interface Cobrado {
  fuente_cobro: string;
  banco: string;
  lista_cobro: string;
  id_lista: number;
  importe_cobrado_centavos: number;
  id_cobro: number;
  id_registro: number;
  idprestamo: number;
  idcuota: number;
  periodohaber: string;
  fechageneracion: string;
  fecha_aplicacion: string | null;
  fecha_movimiento: string | null;
  dni: string | null;
  numero_cuenta: string | null;
  tipo_producto: string | null;
  plan_producto: string | null;
  importe_aplicado_centavos: number | null;
  tipo_prestamo: string;
}

export function formatearFechaCobrado(valor: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?/.exec(valor);
  if (!iso) return valor;
  const [, anio, mes, dia, hora] = iso;
  const fecha = `${dia}/${mes}/${anio}`;
  return hora && !/^00:00(?::00)?$/.test(hora) ? `${fecha} ${hora}` : fecha;
}

/** Filtra y agrega exactamente el snapshot de respuestas exitosas consultado. */
export function reporteCobrados(filas: Cobrado[], lista = ''): Reporte {
  const detalle = filas.filter(f => !lista || f.lista_cobro === lista);
  const grupos = new Map<string, { lista: string; registros: number; cobrado: number }>();
  for (const fila of detalle) {
    const grupo = grupos.get(fila.lista_cobro) ?? { lista: fila.lista_cobro, registros: 0, cobrado: 0 };
    grupo.registros++;
    grupo.cobrado += fila.importe_cobrado_centavos;
    grupos.set(fila.lista_cobro, grupo);
  }
  const resumen = [...grupos.values()];
  return {
    titulo: 'Revisar cobrados',
    columnas: [
      { key: 'dni', titulo: 'DNI' },
      { key: 'numero_cuenta', titulo: 'N.º de cuenta' },
      { key: 'fecha_aplicacion', titulo: 'Fecha de aplicación', tipo: 'fecha-hora' },
      { key: 'fecha_movimiento', titulo: 'Fecha de movimiento', tipo: 'fecha-hora' },
      { key: 'importe_cobrado_centavos', titulo: 'Monto cobrado', tipo: 'dinero' },
      { key: 'idprestamo', titulo: 'ID préstamo', tipo: 'numero' },
      { key: 'tipo_producto', titulo: 'Tipo de producto' },
      { key: 'plan_producto', titulo: 'Plan del producto' },
      { key: 'importe_aplicado_centavos', titulo: 'Monto aplicado', tipo: 'dinero' },
      { key: 'lista_cobro', titulo: 'Lista recuperada' },
      { key: 'banco', titulo: 'Banco / canal' },
      { key: 'idcuota', titulo: 'Cuota', tipo: 'numero' },
      { key: 'periodohaber', titulo: 'Período haber' },
      { key: 'fechageneracion', titulo: 'Generación', tipo: 'fecha-hora' },
      { key: 'tipo_prestamo', titulo: 'Tipo de préstamo' },
      { key: 'fuente_cobro', titulo: 'Origen' },
      { key: 'id_lista', titulo: 'ID lista', tipo: 'numero' },
      { key: 'id_cobro', titulo: 'ID cobro', tipo: 'numero' },
      { key: 'id_registro', titulo: 'ID registro', tipo: 'numero' },
    ],
    filas: detalle.map(f => ({ ...f })),
    resumen: [
      { titulo: 'Respuestas cobradas', valor: detalle.length },
      { titulo: 'Listas', valor: grupos.size },
      { titulo: 'Total cobrado', valor: resumen.reduce((t, r) => t + r.cobrado, 0), dinero: true },
    ],
    anexos: [{ titulo: 'Cobrado por lista', columnas: [
      { key: 'lista', titulo: 'Lista' },
      { key: 'registros', titulo: 'Respuestas', tipo: 'numero' },
      { key: 'cobrado', titulo: 'Cobrado', tipo: 'dinero' },
    ], filas: resumen }],
    notas: [
      'Para Débito Directo (MP), se suma el importe ajustado de cada registro OK de la presentación, una sola vez. Período haber corresponde a la lista e incluye cuotas de períodos anteriores.',
      'En BNA se suman los importes de respuestas con código 0 verificadas en la vista de mora. El reporte no descuenta reversiones posteriores.',
      'Desde y Hasta filtran la generación de la presentación. Las fechas de aplicación y de movimiento se muestran en columnas separadas cuando están disponibles.',
      'El monto cobrado puede incluir cuota social.',
      'Detalle y resumen corresponden a la misma consulta y lista seleccionada. Excel incluye todo el resultado, no sólo la página visible.',
    ],
    advertencias: [],
  };
}
