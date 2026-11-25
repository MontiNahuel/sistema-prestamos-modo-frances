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
  tipo_prestamo: string;
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
      { key: 'lista_cobro', titulo: 'Lista recuperada' },
      { key: 'banco', titulo: 'Banco / canal' },
      { key: 'idprestamo', titulo: 'Préstamo', tipo: 'numero' },
      { key: 'idcuota', titulo: 'Cuota', tipo: 'numero' },
      { key: 'periodohaber', titulo: 'Período haber' },
      { key: 'fechageneracion', titulo: 'Generación', tipo: 'fecha-hora' },
      { key: 'tipo_prestamo', titulo: 'Tipo de préstamo' },
      { key: 'importe_cobrado_centavos', titulo: 'Importe cobrado', tipo: 'dinero' },
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
      'Fuente: base histórica Oracle. MV_PRESTAMOS_MORA_COMPLETA y respuestas bancarias BNA/MP. BNA: código 0; MP (BAPRO y otros canales): OK.',
      'Se suman importes de respuestas exitosas, sin multiplicarlos por las filas de mora. No se descuentan reversiones posteriores.',
      'Las fechas corresponden a generación de la presentación; la fecha tope incluye todo el día. No son fechas efectivas de cobro.',
      'Detalle y resumen corresponden a la misma consulta y lista seleccionada. Excel incluye todo el resultado, no sólo la página visible.',
    ],
    advertencias: [],
  };
}
