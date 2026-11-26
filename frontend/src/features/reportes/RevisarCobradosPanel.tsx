import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiClient, apiFetchRaw } from '../../services/api/client';
import { formatMoney } from '../../utils/formatters';
import { formatearFechaCobrado, reporteCobrados } from './revisarCobrados';
import type { Cobrado } from './revisarCobrados';

const URL_REPORTE = '/api/v1/reportes/revisar-cobrados';
const POR_PAGINA = 50;
const { columnas, notas } = reporteCobrados([]);

interface ResumenLista {
  lista: string;
  registros: number;
  cobrado: number;
}
interface DatosCobrados {
  estado: 'lista';
  filas: Cobrado[];
  cantidad_listas: number;
  registros: number;
  cobrado: number;
  listas?: ResumenLista[];
}

async function esperarResultado<T extends { estado: string }>(url: string, signal: AbortSignal): Promise<T> {
  for (;;) {
    const datos = await apiClient<T>(url, { signal, cache: 'no-store' });
    if (datos.estado !== 'procesando') return datos;
    await new Promise<void>(resolve => window.setTimeout(resolve, 3000));
    signal.throwIfAborted();
  }
}

function mensajeConsulta(error: unknown, alternativo: string) {
  if (error instanceof ApiError && error.status === 401) {
    return 'La sesión de CoopYa venció o no pudo validarse. Volvé a abrir Préstamos desde CoopYa.';
  }
  return error instanceof Error ? error.message : alternativo;
}

function Paginacion({ pagina, paginas, ocupado, cambiar, detalle }: {
  pagina: number; paginas: number; ocupado?: boolean; cambiar: (n: number) => void; detalle?: boolean;
}) {
  return (
    <div className="reportes-paginacion">
      <span>Página {pagina} de {paginas}.{detalle && ' Excel incluye todos los resultados.'}</span>
      <div>
        <button type="button" disabled={ocupado || pagina === 1} onClick={() => cambiar(pagina - 1)}>Anterior</button>
        <button type="button" disabled={ocupado || pagina >= paginas} onClick={() => cambiar(pagina + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

export function RevisarCobradosPanel() {
  const [filtros, setFiltros] = useState({
    periodo_haber: '', fecha_desde: '', fecha_hasta: '', tipo_prestamo: '',
  });
  const [tipos, setTipos] = useState<string[]>([]);
  const [errorTipos, setErrorTipos] = useState('');
  const [intentoTipos, setIntentoTipos] = useState(0);
  const [resultado, setResultado] = useState<DatosCobrados | null>(null);
  const [consultaId, setConsultaId] = useState('');
  const [listas, setListas] = useState<ResumenLista[]>([]);
  const [lista, setLista] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginaListas, setPaginaListas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const peticion = useRef<AbortController | null>(null);
  const peticionExcel = useRef<AbortController | null>(null);

  useEffect(() => {
    const control = new AbortController();
    setErrorTipos('');
    apiClient<string[]>(`${URL_REPORTE}/tipos`, { signal: control.signal, cache: 'no-store' })
      .then(datos => { if (!control.signal.aborted) setTipos(datos); })
      .catch(err => { if (!control.signal.aborted) setErrorTipos(mensajeConsulta(err, 'No se pudieron cargar los tipos.')); });
    return () => control.abort();
  }, [intentoTipos]);
  useEffect(() => () => {
    peticion.current?.abort();
    peticionExcel.current?.abort();
  }, []);

  const listasVisibles = useMemo(() => lista ? listas.filter(l => l.lista === lista) : listas, [listas, lista]);
  const opcionesLista = useMemo(() => listas.map(l => <option key={l.lista}>{l.lista}</option>), [listas]);
  const paginas = Math.max(1, Math.ceil((resultado?.registros ?? 0) / POR_PAGINA));
  const paginasListas = Math.max(1, Math.ceil(listasVisibles.length / POR_PAGINA));
  const ocupado = cargando || cargandoPagina || exportando;

  function limpiarResultado() {
    setResultado(null);
    setConsultaId('');
    setListas([]);
    setLista('');
    setPagina(1);
    setPaginaListas(1);
    setError('');
  }

  function cambiar(cambio: Partial<typeof filtros>) {
    setFiltros(prev => ({ ...prev, ...cambio }));
    limpiarResultado();
  }

  async function consultar() {
    if (ocupado) return;
    const control = new AbortController();
    peticion.current = control;
    limpiarResultado();
    setCargando(true);
    try {
      const { id } = await apiClient<{ id: string }>(URL_REPORTE, {
        method: 'POST', signal: control.signal,
        body: JSON.stringify({
          periodo_haber: filtros.periodo_haber || null,
          fecha_desde: filtros.fecha_desde || null,
          fecha_hasta: filtros.fecha_hasta || null,
          tipo_prestamo: filtros.tipo_prestamo.trim() || null,
        }),
      });
      const datos = await esperarResultado<DatosCobrados>(`${URL_REPORTE}/consultas/${id}?incluir_listas=true`, control.signal);
      if (control.signal.aborted) return;
      setConsultaId(id);
      setResultado(datos);
      setListas(datos.listas ?? []);
    } catch (err) {
      if (!control.signal.aborted) setError(mensajeConsulta(err, 'No se pudo consultar Oracle.'));
    } finally {
      if (!control.signal.aborted) setCargando(false);
    }
  }

  async function cargarPagina(nuevaPagina: number, nuevaLista = lista) {
    if (!consultaId || ocupado) return;
    const control = new AbortController();
    peticion.current = control;
    const params = new URLSearchParams({ pagina: String(nuevaPagina) });
    if (nuevaLista) params.set('lista', nuevaLista);
    setCargandoPagina(true);
    setError('');
    try {
      const datos = await apiClient<DatosCobrados>(`${URL_REPORTE}/consultas/${consultaId}?${params}`, { signal: control.signal, cache: 'no-store' });
      if (control.signal.aborted) return;
      setResultado(datos);
      setPagina(nuevaPagina);
      setLista(nuevaLista);
      if (nuevaLista !== lista) setPaginaListas(1);
    } catch (err) {
      if (!control.signal.aborted) setError(mensajeConsulta(err, 'No se pudo cargar la página.'));
    } finally {
      if (!control.signal.aborted) setCargandoPagina(false);
    }
  }

  async function exportar() {
    if (!consultaId || ocupado) return;
    const control = new AbortController();
    peticionExcel.current = control;
    const params = new URLSearchParams();
    if (lista) params.set('lista', lista);
    const url = `${URL_REPORTE}/consultas/${consultaId}/excel`;
    setExportando(true);
    setError('');
    try {
      await apiClient(`${url}?${params}`, { method: 'POST', signal: control.signal });
      await esperarResultado(`${url}?${params}`, control.signal);
      params.set('descargar', 'true');
      const respuesta = await apiFetchRaw(`${url}?${params}`, { signal: control.signal, cache: 'no-store' });
      const blob = await respuesta.blob();
      control.signal.throwIfAborted();
      const href = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = href;
      enlace.download = 'revisar-cobrados.xlsx';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      if (!control.signal.aborted) setError(mensajeConsulta(err, 'No se pudo generar el Excel.'));
    } finally {
      if (!control.signal.aborted) setExportando(false);
    }
  }

  return <>
    <h3>Revisar cobrados · base histórica Oracle</h3>
    <p className="reportes-ayuda">Todos los filtros son opcionales. Desde y Hasta filtran la fecha de generación de la presentación. Hasta incluye todo el día.</p>
    <form className="reportes-filtros" onSubmit={e => { e.preventDefault(); void consultar(); }}>
      <label>Período haber (AAAAMM)
        <input disabled={ocupado} inputMode="numeric" pattern="[0-9]{4}(0[1-9]|1[0-2])" maxLength={6} placeholder="Ej. 202611" value={filtros.periodo_haber} onChange={e => cambiar({ periodo_haber: e.target.value })} />
      </label>
      <label>Desde
        <input disabled={ocupado} type="date" max={filtros.fecha_hasta || undefined} value={filtros.fecha_desde} onChange={e => cambiar({ fecha_desde: e.target.value })} />
      </label>
      <label>Hasta
        <input disabled={ocupado} type="date" min={filtros.fecha_desde || undefined} value={filtros.fecha_hasta} onChange={e => cambiar({ fecha_hasta: e.target.value })} />
      </label>
      <label>Tipo de préstamo
        <input disabled={ocupado} list="revisar-cobrados-tipos" maxLength={200} value={filtros.tipo_prestamo} placeholder="Todos los tipos" onChange={e => cambiar({ tipo_prestamo: e.target.value })} />
        <datalist id="revisar-cobrados-tipos">{tipos.map(t => <option key={t} value={t} />)}</datalist>
      </label>
      <button className="reportes-primario" type="submit" disabled={ocupado}>{cargando ? 'Consultando Oracle…' : 'Consultar cobrados'}</button>
    </form>
    {errorTipos && <div className="reportes-advertencia" role="status">No se pudo cargar el catálogo de tipos. {errorTipos} <button type="button" onClick={() => setIntentoTipos(n => n + 1)}>Reintentar catálogo</button></div>}
    {error && <div className="reportes-error" role="alert">{error}</div>}
    {cargando && <p role="status">Preparando los resultados de Oracle. El histórico completo puede tardar unos minutos.</p>}
    {resultado && <>
      <div className="reportes-resumen" aria-label="Agregaciones del reporte de cobrados">
        <div><span>Registros cobrados</span><strong>{resultado.registros.toLocaleString('es-AR')}</strong></div>
        <div><span>Listas</span><strong>{resultado.cantidad_listas.toLocaleString('es-AR')}</strong></div>
        <div><span>Total cobrado</span><strong>{formatMoney(resultado.cobrado)}</strong></div>
      </div>
      <div className="reportes-barra">
        <label>Lista recuperada (opcional)
          <select value={lista} disabled={ocupado} onChange={e => void cargarPagina(1, e.target.value)}>
            <option value="">Todas las listas recuperadas</option>{opcionesLista}
          </select>
        </label>
        <button type="button" className="reportes-excel" disabled={ocupado || !resultado.registros} onClick={() => void exportar()}>{exportando ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="reportes-resultado min-w-0">
          <div className="reportes-barra"><h3>Detalle · {resultado.registros.toLocaleString('es-AR')} registros</h3></div>
          <div className="reportes-tabla" tabIndex={0} aria-label="Detalle de cobrados" aria-busy={cargandoPagina}>
            <table>
              <thead><tr>{columnas.map(c => <th key={c.key} scope="col">{c.titulo}</th>)}</tr></thead>
              <tbody>
                {resultado.filas.map((f, i) => <tr key={`${pagina}-${i}`}>{columnas.map(c => {
                  const valor = f[c.key as keyof Cobrado];
                  let contenido = valor == null || valor === '' ? 'No disponible' : String(valor);
                  if (valor != null && valor !== '') {
                    if (c.tipo === 'dinero') contenido = formatMoney(Number(valor));
                    if (c.tipo === 'fecha-hora') contenido = formatearFechaCobrado(String(valor));
                  }
                  return <td key={c.key}>{contenido}</td>;
                })}</tr>)}
                {!resultado.filas.length && <tr><td colSpan={columnas.length} className="reportes-sin-datos">No se encontraron cobros con estos filtros.</td></tr>}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} paginas={paginas} ocupado={ocupado} cambiar={n => void cargarPagina(n)} detalle />
        </div>
        <aside className="reportes-resultado min-w-0" aria-label="Resumen de cobrado por lista">
          <div className="reportes-barra"><h3>Cobrado por lista</h3></div>
          <p className="px-4 font-semibold">Total: {formatMoney(resultado.cobrado)}</p>
          <div className="reportes-tabla" tabIndex={0}>
            <table>
              <thead><tr><th scope="col">Lista</th><th scope="col">Cant.</th><th scope="col">Cobrado</th></tr></thead>
              <tbody>{listasVisibles.slice((paginaListas - 1) * POR_PAGINA, paginaListas * POR_PAGINA).map(f =>
                <tr key={f.lista}><td>{f.lista}</td><td>{f.registros}</td><td>{formatMoney(f.cobrado)}</td></tr>
              )}</tbody>
            </table>
          </div>
          {paginasListas > 1 && <Paginacion pagina={paginaListas} paginas={paginasListas} cambiar={setPaginaListas} />}
        </aside>
      </div>
      <aside className="reportes-notas"><h4>Criterios de la consulta</h4><ul>{notas.map(n => <li key={n}>{n}</li>)}</ul></aside>
    </>}
  </>;
}
