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
interface ListaPendiente {
  lista: string;
  periodohaber: string;
  fechageneracion: string;
  registros: number;
  presentado_centavos: number;
}
interface DatosCobrados {
  estado: 'lista';
  filas: Cobrado[];
  cantidad_listas: number;
  registros: number;
  cobrado: number;
  listas?: ResumenLista[];
  pendientes?: ListaPendiente[];
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
    periodo_haber: '', fecha_desde: '', fecha_hasta: '', tipo_prestamo: '', banco: '',
  });
  const [tipos, setTipos] = useState<string[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [errorTipos, setErrorTipos] = useState('');
  const [bancos, setBancos] = useState<{ id: number; nombre: string }[]>([]);
  const [errorBancos, setErrorBancos] = useState('');
  const [intentoTipos, setIntentoTipos] = useState(0);
  const [resultado, setResultado] = useState<DatosCobrados | null>(null);
  const [consultaId, setConsultaId] = useState('');
  const [listas, setListas] = useState<ResumenLista[]>([]);
  const [pendientes, setPendientes] = useState<ListaPendiente[]>([]);
  const [lista, setLista] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginaListas, setPaginaListas] = useState(1);
  const [paginaPendientes, setPaginaPendientes] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const peticion = useRef<AbortController | null>(null);
  const peticionExcel = useRef<AbortController | null>(null);

  useEffect(() => {
    const control = new AbortController();
    setErrorTipos('');
    setErrorBancos('');
    setCargandoTipos(true);
    apiClient<string[]>(`${URL_REPORTE}/tipos`, { signal: control.signal, cache: 'no-store' })
      .then(datos => { if (!control.signal.aborted) setTipos(datos); })
      .catch(err => { if (!control.signal.aborted) setErrorTipos(mensajeConsulta(err, 'No se pudieron cargar los tipos.')); })
      .finally(() => { if (!control.signal.aborted) setCargandoTipos(false); });
    apiClient<{ id: number; nombre: string }[]>(`${URL_REPORTE}/bancos`, { signal: control.signal, cache: 'no-store' })
      .then(datos => { if (!control.signal.aborted) setBancos(datos); })
      .catch(err => { if (!control.signal.aborted) setErrorBancos(mensajeConsulta(err, 'No se pudieron cargar los bancos.')); });
    return () => control.abort();
  }, [intentoTipos]);
  useEffect(() => () => {
    peticion.current?.abort();
    peticionExcel.current?.abort();
  }, []);

  const listasVisibles = useMemo(() => lista ? listas.filter(l => l.lista === lista) : listas, [listas, lista]);
  const pendientesVisibles = useMemo(() => lista ? pendientes.filter(p => p.lista === lista) : pendientes, [pendientes, lista]);
  const opcionesLista = useMemo(() => {
    const opciones = new Set([...listas, ...pendientes].map(l => l.lista));
    return [...opciones].sort().map(nombre => <option key={nombre} value={nombre}>{nombre}</option>);
  }, [listas, pendientes]);
  const paginas = Math.max(1, Math.ceil((resultado?.registros ?? 0) / POR_PAGINA));
  const paginasListas = Math.max(1, Math.ceil(listasVisibles.length / POR_PAGINA));
  const paginasPendientes = Math.max(1, Math.ceil(pendientesVisibles.length / POR_PAGINA));
  const filtrosBloqueados = cargandoPagina || exportando;
  const ocupado = cargando || filtrosBloqueados;
  const [anio, mes, dia] = filtros.fecha_desde.split('-').map(Number);
  const mesDesde = filtros.fecha_desde.slice(0, 7);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const haberDelRango = !filtros.periodo_haber && anio >= 1900 && dia === 1 &&
    filtros.fecha_hasta === `${mesDesde}-${ultimoDia}` ? mesDesde.replace('-', '') : '';

  function limpiarResultado() {
    setResultado(null);
    setConsultaId('');
    setListas([]);
    setPendientes([]);
    setLista('');
    setPagina(1);
    setPaginaListas(1);
    setPaginaPendientes(1);
    setError('');
  }

  function cambiar(cambio: Partial<typeof filtros>) {
    if (cargando) {
      peticion.current?.abort();
      setCargando(false);
    }
    setFiltros(prev => ({ ...prev, ...cambio }));
    limpiarResultado();
  }

  async function consultar(filtrosConsulta = filtros) {
    if (filtrosBloqueados) return;
    peticion.current?.abort();
    const control = new AbortController();
    peticion.current = control;
    limpiarResultado();
    setCargando(true);
    try {
      const { id } = await apiClient<{ id: string }>(URL_REPORTE, {
        method: 'POST', signal: control.signal,
        body: JSON.stringify({
          periodo_haber: filtrosConsulta.periodo_haber || null,
          fecha_desde: filtrosConsulta.fecha_desde || null,
          fecha_hasta: filtrosConsulta.fecha_hasta || null,
          tipo_prestamo: filtrosConsulta.tipo_prestamo || null,
          banco_id: filtrosConsulta.banco === '' ? null : Number(filtrosConsulta.banco),
        }),
      });
      const datos = await esperarResultado<DatosCobrados>(`${URL_REPORTE}/consultas/${id}?incluir_listas=true`, control.signal);
      if (control.signal.aborted) return;
      setConsultaId(id);
      setResultado(datos);
      setListas(datos.listas ?? []);
      setPendientes(datos.pendientes ?? []);
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
      if (nuevaLista !== lista) {
        setPaginaListas(1);
        setPaginaPendientes(1);
      }
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
    <p className="reportes-ayuda">Todos los filtros son opcionales. Dejá vacías las fechas de generación para incluir todas las listas del período haber, aunque se hayan generado en otro mes.</p>
    <form className="reportes-filtros" onSubmit={e => { e.preventDefault(); void consultar(); }}>
      <label>Período haber (AAAAMM)
        <input disabled={filtrosBloqueados} inputMode="numeric" pattern="[0-9]{4}(0[1-9]|1[0-2])" maxLength={6} placeholder="Ej. 202611" value={filtros.periodo_haber} onChange={e => cambiar({ periodo_haber: e.target.value })} />
      </label>
      <label>Desde (generación)
        <input disabled={filtrosBloqueados} type="date" max={filtros.fecha_hasta || undefined} value={filtros.fecha_desde} onChange={e => cambiar({ fecha_desde: e.target.value })} />
      </label>
      <label>Hasta (generación, inclusive)
        <input disabled={filtrosBloqueados} type="date" min={filtros.fecha_desde || undefined} value={filtros.fecha_hasta} onChange={e => cambiar({ fecha_hasta: e.target.value })} />
      </label>
      <label>Banco / canal
        <select disabled={filtrosBloqueados} value={filtros.banco} onChange={e => cambiar({ banco: e.target.value })}>
          <option value="">Todos los bancos</option>
          {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      <label>Tipo de préstamo
        <select disabled={filtrosBloqueados} aria-busy={cargandoTipos} value={filtros.tipo_prestamo} onChange={e => cambiar({ tipo_prestamo: e.target.value })}>
          <option value="">Todos los tipos</option>
          {tipos.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
          {cargandoTipos && <option disabled>Cargando tipos…</option>}
        </select>
      </label>
      <button className="reportes-primario" type="submit" disabled={ocupado}>{cargando ? 'Consultando Oracle…' : 'Consultar cobrados'}</button>
    </form>
    {haberDelRango && <p className="reportes-ayuda">
      El rango actual filtra por fecha de generación.{' '}
      <button type="button" className="underline text-blue-700" disabled={filtrosBloqueados} onClick={() => {
        const porHaber = { ...filtros, periodo_haber: haberDelRango, fecha_desde: '', fecha_hasta: '' };
        setFiltros(porHaber);
        void consultar(porHaber);
      }}>Consultar haber {haberDelRango} completo</button>
    </p>}
    {errorTipos && <div className="reportes-advertencia" role="status">No se pudo cargar el catálogo de tipos. {errorTipos} <button type="button" onClick={() => setIntentoTipos(n => n + 1)}>Reintentar catálogo</button></div>}
    {errorBancos && <div className="reportes-advertencia" role="status">No se pudo cargar el catálogo de bancos. {errorBancos} <button type="button" onClick={() => setIntentoTipos(n => n + 1)}>Reintentar catálogo</button></div>}
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
        <button type="button" className="reportes-excel" disabled={ocupado || (!resultado.registros && !pendientesVisibles.length)} onClick={() => void exportar()}>{exportando ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}</button>
      </div>
      {pendientesVisibles.length > 0 && <section className="reportes-resultado mb-5" aria-label="Presentaciones sin estado de cobro">
        <div className="reportes-barra">
          <div>
            <h3>Presentaciones sin estado de cobro</h3>
            <p>{pendientesVisibles.reduce((total, fila) => total + fila.registros, 0).toLocaleString('es-AR')} registros por {formatMoney(pendientesVisibles.reduce((total, fila) => total + fila.presentado_centavos, 0))}. El total cobrado incluye sólo los registros confirmados.</p>
          </div>
        </div>
        <div className="reportes-tabla" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Lista</th><th scope="col">Período haber</th><th scope="col">Generación</th><th scope="col">Registros</th><th scope="col">Importe presentado</th></tr></thead>
            <tbody>{pendientesVisibles.slice((paginaPendientes - 1) * POR_PAGINA, paginaPendientes * POR_PAGINA).map(p =>
              <tr key={p.lista}><td>{p.lista}</td><td>{p.periodohaber}</td><td>{formatearFechaCobrado(p.fechageneracion)}</td><td>{p.registros}</td><td>{formatMoney(p.presentado_centavos)}</td></tr>
            )}</tbody>
          </table>
        </div>
        {paginasPendientes > 1 && <Paginacion pagina={paginaPendientes} paginas={paginasPendientes} cambiar={setPaginaPendientes} />}
      </section>}
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
