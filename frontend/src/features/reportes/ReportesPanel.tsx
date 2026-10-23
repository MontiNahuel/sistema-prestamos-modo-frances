import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { construirReporte, hoyArgentina, TIPOS_REPORTE } from './reportes';
import type { Columna, FiltrosReporte, Reporte, Valor } from './reportes';
import { cargarCartera } from './reportesApi';
import { descargarReporte } from './exportarReporte';
import { formatMoney, formatPct } from '../../utils/formatters';
import './reportes.css';

function mostrar(valor: Valor | undefined, columna: Columna): string {
  if (valor === null || valor === undefined) return columna.key === 'ultimoPago' ? 'Sin pagos registrados' : 'No disponible';
  if (columna.tipo === 'dinero') return formatMoney(Number(valor));
  if (columna.tipo === 'porcentaje') return formatPct(valor);
  if (columna.tipo === 'fecha') return String(valor).split('-').reverse().join('/');
  return String(valor);
}

export function ReportesPanel() {
  const hoy = hoyArgentina();
  const [anio, mes] = hoy.split('-').map(Number);
  const finMes = `${hoy.slice(0, 7)}-${new Date(Date.UTC(anio, mes, 0)).getUTCDate()}`;
  const [filtros, setFiltros] = useState<FiltrosReporte>({ tipo: 'caida', desde: `${hoy.slice(0, 7)}-01`, hasta: finMes, buscar: '', estadoPrestamo: '', estadoCuota: '' });
  const [resultado, setResultado] = useState<{ reporte: Reporte; filtros: FiltrosReporte; generado: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const peticion = useRef<AbortController | null>(null);
  useEffect(() => () => peticion.current?.abort(), []);

  function cambiar(cambios: Partial<FiltrosReporte>) {
    peticion.current?.abort();
    peticion.current = null;
    setCargando(false);
    setFiltros(f => ({ ...f, ...cambios }));
    setResultado(null);
    setError('');
    setPagina(1);
  }

  async function consultar(e: FormEvent) {
    e.preventDefault();
    if (filtros.desde > filtros.hasta) { setError('La fecha Desde no puede ser posterior a Hasta.'); return; }
    peticion.current?.abort();
    const control = new AbortController();
    peticion.current = control;
    setCargando(true);
    setError('');
    setResultado(null);
    setProgreso(0);
    setPagina(1);
    try {
      const cartera = await cargarCartera(control.signal, cantidad => { if (!control.signal.aborted) setProgreso(cantidad); });
      if (control.signal.aborted) return;
      const generado = new Date().toISOString();
      setResultado({ reporte: construirReporte(cartera, filtros), filtros: { ...filtros }, generado });
    } catch (err) {
      if (control.signal.aborted) return;
      control.abort();
      if (peticion.current === control) setError(err instanceof Error ? err.message : 'No se pudo generar el reporte. Reintentá la consulta.');
    } finally {
      if (peticion.current === control) setCargando(false);
    }
  }

  async function exportar() {
    if (!resultado) return;
    setExportando(true);
    setError('');
    try { await descargarReporte(resultado.reporte, resultado.filtros, resultado.generado); }
    catch { setError('No se pudo generar el Excel. Volvé a intentar la descarga.'); }
    finally { setExportando(false); }
  }

  const reporte = resultado?.reporte;
  const paginas = Math.max(1, Math.ceil((reporte?.filas.length ?? 0) / 50));
  return (
    <section className="reportes" aria-labelledby="reportes-titulo">
      <div className="reportes-encabezado">
        <div><h2 id="reportes-titulo">Reportes de seguimiento y control</h2><p>Consultá la cartera, los vencimientos y las cobranzas. Descargá el resultado completo en Excel.</p></div>
        <span className="reportes-etiqueta">Seguimiento mensual</span>
      </div>

      <div className="reportes-tipos" aria-label="Tipo de reporte">
        {TIPOS_REPORTE.map((tipo, i) => (
          <button key={tipo.id} type="button" aria-pressed={filtros.tipo === tipo.id} onClick={() => cambiar({ tipo: tipo.id, estadoCuota: '' })}>
            <span className="reportes-numero">0{i + 1}</span><strong>{tipo.titulo}</strong><span>{tipo.descripcion}</span>
          </button>
        ))}
      </div>

      <form onSubmit={consultar} className="reportes-filtros">
        <label>Mes de referencia<input type="month" aria-label="Mes de referencia" value={filtros.desde.slice(0, 7)} onChange={e => {
          const mes = e.target.value;
          if (!mes) return;
          const [anio, numeroMes] = mes.split('-').map(Number);
          const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
          cambiar({ desde: `${mes}-01`, hasta: `${mes}-${ultimoDia}` });
        }} /></label>
        <label>Desde<input type="date" required value={filtros.desde} onChange={e => cambiar({ desde: e.target.value })} /></label>
        <label>Hasta<input type="date" required value={filtros.hasta} onChange={e => cambiar({ hasta: e.target.value })} /></label>
        <label className="reportes-busqueda">Asociado o préstamo<input type="search" placeholder="Nombre, documento o ID…" value={filtros.buscar} onChange={e => cambiar({ buscar: e.target.value })} /></label>
        <label>Estado del préstamo<select value={filtros.estadoPrestamo} onChange={e => cambiar({ estadoPrestamo: e.target.value })}>
          <option value="">Todos</option><option value="ACTIVO">Activo</option><option value="MORA">Mora</option><option value="FINALIZADO">Finalizado</option><option value="CANCELADO">Cancelado</option>
        </select></label>
        {(filtros.tipo === 'caida' || filtros.tipo === 'cobranzas') && <label>Estado de la cuota<select value={filtros.estadoCuota} onChange={e => cambiar({ estadoCuota: e.target.value })}>
          <option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="PAGADA">Pagada</option><option value="VENCIDA">Vencida</option>
        </select></label>}
        <button className="reportes-primario" type="submit" disabled={cargando}>{cargando ? 'Consultando…' : 'Consultar reporte'}</button>
      </form>

      {error && <div className="reportes-error" role="alert">{error}</div>}
      {cargando && <div className="reportes-vacio" role="status">Consultando la cartera completa… {progreso} préstamos recuperados.</div>}
      {!cargando && !resultado && <div className="reportes-vacio">Elegí el reporte y el período, y presioná “Consultar reporte”.</div>}
      {!cargando && reporte && resultado && <>
        {reporte.advertencias.map(mensaje => <div key={mensaje} role="status" className="reportes-advertencia">{mensaje}</div>)}
        <div className="reportes-resumen">
          {reporte.resumen.map(dato => <div key={dato.titulo}><span>{dato.titulo}</span><strong>{dato.dinero ? formatMoney(dato.valor) : dato.valor.toLocaleString('es-AR')}</strong></div>)}
        </div>
        <div className="reportes-resultado">
          <div className="reportes-barra">
            <div><h3>{reporte.titulo}</h3><p>{reporte.filas.length.toLocaleString('es-AR')} registros · Generado el {new Date(resultado.generado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p></div>
            <button type="button" className="reportes-excel" disabled={exportando || reporte.filas.length === 0} onClick={exportar}>{exportando ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}</button>
          </div>
          <div className="reportes-tabla" tabIndex={0} aria-label="Resultados del reporte, desplazamiento horizontal">
            <table><thead><tr>{reporte.columnas.map(c => <th key={c.key} scope="col">{c.titulo}</th>)}</tr></thead>
              <tbody>{reporte.filas.slice((pagina - 1) * 50, pagina * 50).map((fila, i) => <tr key={`${fila.prestamo}-${fila.cuota ?? ''}-${i}`}>
                {reporte.columnas.map(c => <td key={c.key} className={c.tipo === 'dinero' || c.tipo === 'numero' || c.tipo === 'porcentaje' ? 'reportes-numerico' : ''}>
                  {c.key === 'estado' || c.key === 'estadoPrestamo' ? <span className={`reportes-estado reportes-estado-${String(fila[c.key]).toLowerCase()}`}>{mostrar(fila[c.key], c)}</span> : mostrar(fila[c.key], c)}
                </td>)}
              </tr>)}{reporte.filas.length === 0 && <tr><td colSpan={reporte.columnas.length} className="reportes-sin-datos">No se encontraron registros con los filtros seleccionados.</td></tr>}</tbody>
            </table>
          </div>
          <div className="reportes-paginacion"><span>Página {pagina} de {paginas} · 50 registros por página. Excel incluye todos los resultados.</span><div>
            <button type="button" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button><button type="button" disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
          </div></div>
        </div>
        <aside className="reportes-notas"><h4>Criterios y disponibilidad de datos</h4><ul>{reporte.notas.map(nota => <li key={nota}>{nota}</li>)}</ul></aside>
      </>}
    </section>
  );
}
