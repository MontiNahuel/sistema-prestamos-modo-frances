import type { CuotaItem } from '../../types/simulacion';
import type { TablaReporte } from '../../features/reportes/reportes';
import { agregarTablaExcel, descargarLibroExcel } from '../../features/reportes/exportarReporte.ts';

/** Exporta todas las cuotas calculadas con el formato y descarga de Reportes. */
export async function exportarCronogramaExcel(cronograma: CuotaItem[]) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const tabla: TablaReporte = {
    titulo: 'Amortización',
    columnas: [
      { titulo: 'N°', key: 'numero', tipo: 'numero' },
      { titulo: 'Vencimiento', key: 'fecha', tipo: 'fecha' },
      { titulo: 'Días del período', key: 'dias', tipo: 'numero' },
      { titulo: 'Saldo inicial', key: 'saldoInicial', tipo: 'dinero' },
      { titulo: 'Capital amortizado', key: 'capital', tipo: 'dinero' },
      { titulo: 'Interés', key: 'interes', tipo: 'dinero' },
      { titulo: 'IVA s/intereses', key: 'iva', tipo: 'dinero' },
      { titulo: 'Costo operativo', key: 'costoOp', tipo: 'dinero' },
      { titulo: 'Cuota sin IVA', key: 'pura', tipo: 'dinero' },
      { titulo: 'Cuota total', key: 'total', tipo: 'dinero' },
      { titulo: 'Saldo deudor final', key: 'saldoFinal', tipo: 'dinero' },
    ],
    filas: cronograma.map(c => ({
      numero: c.numero_cuota,
      fecha: c.fecha_vencimiento || null,
      dias: c.dias_periodo,
      saldoInicial: c.saldo_inicial_centavos,
      capital: c.capital_centavos,
      interes: c.interes_centavos,
      iva: c.iva_interes_centavos,
      costoOp: c.costo_operativo_centavos ?? 0,
      pura: c.cuota_pura_centavos,
      total: c.cuota_total_centavos,
      saldoFinal: c.saldo_final_centavos,
    })),
  };
  agregarTablaExcel(libro, tabla.titulo, tabla);
  await descargarLibroExcel(libro, 'simulacion-amortizacion.xlsx');
}
