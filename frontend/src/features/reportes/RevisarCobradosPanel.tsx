import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiClient } from '../../services/api/client';
import { formatMoney } from '../../utils/formatters';
import { agregarTablaExcel, descargarLibroExcel } from './exportarReporte';
import { hoyArgentina } from './reportes';
import { reporteCobrados } from './revisarCobrados';
import type { Cobrado } from './revisarCobrados';

function mensajeConsulta(error: unknown, alternativo: string) {
  if (error instanceof ApiError && error.status === 401) {
    return `CoopYa rechazó la sesión. ${error.message} Si ya ingresaste, volvé a abrir Préstamos desde CoopYa.`;
  }
  return error instanceof Error ? error.message : alternativo;
}

/** Reporte del sistema nuevo que consulta exclusivamente la base vieja Oracle. */
export function RevisarCobradosPanel() {
  const hoy = hoyArgentina();
  const [filtros, setFiltros] = useState({ periodo_haber: hoy.slice(0, 7).replace('-', ''), fecha_desde: '', fecha_hasta: '', tipo_prestamo: '' });
  const [tipos, setTipos] = useState<string[]>([]);
  const [errorTipos, setErrorTipos] = useState('');
  const [resultado, setResultado] = useState<{ filas: Cobrado[]; generado: string; filtros: typeof filtros } | null>(null);
  const [lista, setLista] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const peticion = useRef<AbortController | null>(null);
  const [intentoTipos, setIntentoTipos] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setErrorTipos('');
    apiClient<string[]>('/api/v1/reportes/revisar-cobrados/tipos', { signal: control.signal })
      .then(setTipos).catch(err => { if (!control.signal.aborted) setErrorTipos(mensajeConsulta(err, 'No se pudieron cargar los tipos.')); });
    return () => control.abort();
  }, [intentoTipos]);
  useEffect(() => () => peticion.current?.abort(), []);

  const reporte = useMemo(() => reporteCobrados(resultado?.filas ?? [], lista), [resultado, lista]);
  const listas = useMemo(() => [...new Set(resultado?.filas.map(f => f.lista_cobro) ?? [])], [resultado]);
  const paginas = Math.max(1, Math.ceil(reporte.filas.length / 50));

  /** Invalida la consulta anterior cuando cambian sus condiciones. */
  function cambiar(cambio: Partial<typeof filtros>) {
    peticion.current?.abort();
    peticion.current = null;
    setFiltros(prev => ({ ...prev, ...cambio }));
    setResultado(null); setLista(''); setPagina(1); setCargando(false); setError('');
  }

  /** Recupera una vez el conjunto completo para filtrar y agregar localmente. */
  async function consultar() {
    peticion.current?.abort();
    const control = new AbortController(); peticion.current = control;
    setCargando(true); setError(''); setResultado(null); setLista(''); setPagina(1);
    try {
      const datos = await apiClient<{ filas: Cobrado[]; generado: string }>('/api/v1/reportes/revisar-cobrados', {
        method: 'POST', signal: control.signal,
        body: JSON.stringify({
          periodo_haber: filtros.periodo_haber || null,
          fecha_desde: filtros.fecha_desde || null,
          fecha_hasta: filtros.fecha_hasta || null,
          tipo_prestamo: filtros.tipo_prestamo.trim() || null,
        }),
      });
      if (!control.signal.aborted) setResultado({ ...datos, filtros: { ...filtros } });
    } catch (err) {
      if (!control.signal.aborted) setError(mensajeConsulta(err, 'No se pudo consultar Oracle.'));
    } finally { if (peticion.current === control) setCargando(false); }
  }

  /** Reutiliza las hojas y descarga Excel del sistema para detalle y resumen. */
  async function exportar() {
    if (!resultado) return;
    setExportando(true); setError('');
    try {
      const { default: ExcelJS } = await import('exceljs');
      const libro = new ExcelJS.Workbook();
      const resumen = libro.addWorksheet('Condiciones');
      resumen.columns = [{ width: 30 }, { width: 100 }];
      resumen.addRows([
        ['Reporte', 'Revisar cobrados'], ['Fuente', 'Oracle histórico'],
        ['Período haber', resultado.filtros.periodo_haber || 'Todos'],
        ['Generación desde', resultado.filtros.fecha_desde || 'Sin límite'], ['Generación hasta (inclusive)', resultado.filtros.fecha_hasta || 'Sin límite'],
        ['Tipo de préstamo', resultado.filtros.tipo_prestamo || 'Todos'], ['Lista', lista || 'Todas las listas recuperadas'],
        ['Consulta realizada', resultado.generado], ...reporte.notas.map(n => ['Criterio', n]),
      ]);
      agregarTablaExcel(libro, 'Detalle', reporte);
      agregarTablaExcel(libro, 'Cobrado por lista', reporte.anexos![0]);
      const { periodo_haber, fecha_desde, fecha_hasta } = resultado.filtros;
      const referencia = [periodo_haber, fecha_desde, fecha_hasta].filter(Boolean).join('_');
      await descargarLibroExcel(libro, `revisar-cobrados-${referencia}.xlsx`);
    } catch { setError('No se pudo generar el Excel. Intentá nuevamente.'); }
    finally { setExportando(false); }
  }

  return <>
    <h3>Revisar cobrados · base histórica Oracle</h3>
    <p className="reportes-ayuda">Ingresá un período haber o un rango de generación completo. Con período, podés dejar vacías las fechas. La fecha hasta incluye todo el día.</p>
    <form className="reportes-filtros" onSubmit={e => { e.preventDefault(); void consultar(); }}>
      <label>Período haber (AAAAMM)<input inputMode="numeric" pattern="[0-9]{4}(0[1-9]|1[0-2])" maxLength={6} placeholder="Ej. 202611" value={filtros.periodo_haber} onChange={e => cambiar({ periodo_haber: e.target.value })} /></label>
      <label>Generación desde{filtros.periodo_haber ? ' (opcional)' : ' (obligatoria)'}<input type="date" required={!filtros.periodo_haber} max={filtros.fecha_hasta || undefined} value={filtros.fecha_desde} onChange={e => cambiar({ fecha_desde: e.target.value })} /></label>
      <label>Generación hasta{filtros.periodo_haber ? ' (opcional)' : ' (obligatoria)'}<input type="date" required={!filtros.periodo_haber} min={filtros.fecha_desde || undefined} value={filtros.fecha_hasta} onChange={e => cambiar({ fecha_hasta: e.target.value })} /></label>
      <label>Tipo de préstamo (opcional)<input list="revisar-cobrados-tipos" maxLength={200} value={filtros.tipo_prestamo} placeholder="Todos los tipos" onChange={e => cambiar({ tipo_prestamo: e.target.value })} /><datalist id="revisar-cobrados-tipos">{tipos.map(t => <option key={t} value={t} />)}</datalist></label>
      <button className="reportes-primario" type="submit" disabled={cargando}>{cargando ? 'Consultando Oracle…' : 'Consultar cobrados'}</button>
    </form>
    {errorTipos && <div className="reportes-advertencia" role="status">No se pudo cargar el catálogo de tipos. {errorTipos} <button type="button" onClick={() => setIntentoTipos(n => n + 1)}>Reintentar catálogo</button></div>}
    {error && <div className="reportes-error" role="alert">{error}</div>}
    {cargando && <p role="status">Consultando respuestas exitosas de la base vieja…</p>}
    {resultado && <>
      <div className="reportes-resumen" aria-label="Agregaciones del reporte de cobrados">
        {reporte.resumen.map(item => <div key={item.titulo}><span>{item.titulo}</span><strong>{item.dinero ? formatMoney(item.valor) : item.valor.toLocaleString('es-AR')}</strong></div>)}
      </div>
      <div className="reportes-barra">
        <label>Lista recuperada (opcional)<select value={lista} onChange={e => { setLista(e.target.value); setPagina(1); }}><option value="">Todas las listas recuperadas</option>{listas.map(l => <option key={l}>{l}</option>)}</select></label>
        <button type="button" className="reportes-excel" disabled={exportando || !reporte.filas.length} onClick={() => void exportar()}>{exportando ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="reportes-resultado min-w-0">
          <div className="reportes-barra"><h3>Detalle · {reporte.filas.length.toLocaleString('es-AR')} respuestas</h3></div>
          <div className="reportes-tabla" tabIndex={0} aria-label="Detalle de cobrados"><table><thead><tr>{reporte.columnas.map(c => <th key={c.key} scope="col">{c.titulo}</th>)}</tr></thead><tbody>
            {reporte.filas.slice((pagina - 1) * 50, pagina * 50).map(f => <tr key={`${f.fuente_cobro}-${f.id_cobro}-${f.id_registro}`}>{reporte.columnas.map(c => <td key={c.key}>{c.tipo === 'dinero' ? formatMoney(Number(f[c.key])) : c.tipo === 'fecha-hora' ? String(f[c.key]).replace('T', ' ') : String(f[c.key] ?? 'No disponible')}</td>)}</tr>)}
            {!reporte.filas.length && <tr><td colSpan={reporte.columnas.length} className="reportes-sin-datos">No se encontraron cobros con estos filtros.</td></tr>}
          </tbody></table></div>
          <div className="reportes-paginacion"><span>Página {pagina} de {paginas}. Excel incluye todos los resultados.</span><div><button type="button" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button><button type="button" disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div></div>
        </div>
        <aside className="reportes-resultado min-w-0" aria-label="Resumen de cobrado por lista"><div className="reportes-barra"><h3>Cobrado por lista</h3></div>
          <p className="px-4 font-semibold">Total: {formatMoney(reporte.resumen[2].valor)}</p>
          <div className="reportes-tabla" tabIndex={0}><table><thead><tr><th scope="col">Lista</th><th scope="col">Cant.</th><th scope="col">Cobrado</th></tr></thead><tbody>{reporte.anexos![0].filas.map(f => <tr key={String(f.lista)}><td>{f.lista}</td><td>{f.registros}</td><td>{formatMoney(Number(f.cobrado))}</td></tr>)}</tbody></table></div>
        </aside>
      </div>
      <aside className="reportes-notas"><h4>Criterios de la consulta</h4><ul>{reporte.notas.map(n => <li key={n}>{n}</li>)}</ul></aside>
    </>}
  </>;
}
