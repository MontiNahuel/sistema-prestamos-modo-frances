import type { FiltrosReporte, Reporte, TablaReporte } from './reportes';

export async function crearLibroReporte(reporte: Reporte, filtros: FiltrosReporte, generado: string) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'CoopYa Préstamos';
  libro.created = new Date(generado);
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 42 }, { width: 110 }];
  resumen.addRow([reporte.titulo]);
  const todoPeriodo = filtros.tipo === 'otorgados' && filtros.todoPeriodo === true;
  resumen.addRow(['Desde', todoPeriodo ? 'Todo el historial' : filtros.desde]);
  resumen.addRow(['Hasta', todoPeriodo ? 'Sin límite de fecha' : filtros.hasta]);
  resumen.addRow(['Búsqueda', filtros.buscar || 'Toda la cartera']);
  resumen.addRow(['Estado préstamo', filtros.estadoPrestamo || 'Todos']);
  resumen.addRow(['Estado cuota', filtros.estadoCuota || 'Todos']);
  if (filtros.tipo === 'condiciones') resumen.addRow(['Plazo (meses)', filtros.plazo ? Number(filtros.plazo) : 'Todos']);
  resumen.addRow(['Generado (Buenos Aires)', new Date(generado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })]);
  resumen.addRow(['Fuente', 'API /api/v1/prestamos y detalle de cuotas. Consulta completa paginada.']);
  resumen.addRow([]);
  for (const dato of reporte.resumen) {
    const fila = resumen.addRow([dato.titulo, dato.dinero ? dato.valor / 100 : dato.valor]);
    fila.getCell(2).numFmt = dato.dinero ? '"$" #,##0.00' : '#,##0';
  }
  resumen.addRow([]);
  for (const nota of reporte.notas) {
    const fila = resumen.addRow(['Criterio / disponibilidad', nota]);
    fila.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    fila.height = Math.max(36, Math.ceil(nota.length / 100) * 16);
  }
  resumen.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
  function agregarTabla(nombre: string, tabla: TablaReporte) {
    const detalle = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
    detalle.columns = tabla.columnas.map(c => ({ header: c.titulo, key: c.key, width: c.key === 'prestamo' ? 40 : c.key === 'asociado' ? 32 : c.tipo === 'dinero' ? 24 : 27 }));
    for (const datos of tabla.filas) {
      const fila = detalle.addRow(tabla.columnas.map(c => {
        const valor = datos[c.key];
        if (valor === null || valor === undefined) return c.key === 'ultimoPago' ? 'Sin pagos registrados' : 'No disponible';
        if (c.tipo === 'dinero') return Number(valor) / 100;
        if (c.tipo === 'fecha') return new Date(`${valor}T12:00:00Z`);
        return valor;
      }));
      tabla.columnas.forEach((c, i) => {
        const celda = fila.getCell(i + 1);
        if (typeof celda.value === 'number') celda.numFmt = c.tipo === 'dinero' ? '"$" #,##0.00' : c.tipo === 'porcentaje' ? '0.00%' : '#,##0';
        if (c.tipo === 'fecha' && celda.value instanceof Date) celda.numFmt = 'dd/mm/yyyy';
        // Los textos se escriben como strings, nunca como fórmulas de Excel.
        celda.alignment = { vertical: 'middle' };
      });
    }
    detalle.getRow(1).height = 38;
    detalle.getRow(1).eachCell(celda => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      celda.alignment = { wrapText: true, vertical: 'middle' };
    });
    detalle.autoFilter = { from: { row: 1, column: 1 }, to: { row: tabla.filas.length + 1, column: tabla.columnas.length } };
  }
  agregarTabla('Detalle', reporte);
  for (const anexo of reporte.anexos ?? []) agregarTabla(anexo.titulo, anexo);
  return libro;
}

export async function descargarReporte(reporte: Reporte, filtros: FiltrosReporte, generado: string) {
  const libro = await crearLibroReporte(reporte, filtros, generado);
  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `reporte-${filtros.tipo}-${filtros.desde}-${filtros.hasta}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
