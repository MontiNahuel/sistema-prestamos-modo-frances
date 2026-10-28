import { useCallback, useEffect, useRef, useState } from 'react';
import { construirReporte, hoyArgentina, TIPOS_REPORTE } from './reportes';
import type {
  Columna,
  FiltrosReporte,
  Reporte,
  TablaReporte,
  Valor
} from './reportes';
import { cargarCartera } from './reportesApi';
import { descargarReporte } from './exportarReporte';
import { formatMoney, formatPct } from '../../utils/formatters';
import { apiClient } from '../../services/api/client';
import type { Prestamo } from '../../types/prestamo';
import { PrestamoDetalleModal } from '../../components/prestamos/PrestamoDetalleModal';
import './reportes.css';

function mostrar(valor: Valor | undefined, columna: Columna): string {
  if (valor === null || valor === undefined)
    return columna.key === 'ultimoPago'
      ? 'Sin pagos registrados'
      : 'No disponible';
  if (columna.tipo === 'dinero') return formatMoney(Number(valor));
  if (columna.tipo === 'porcentaje') return formatPct(valor);
  if (columna.tipo === 'fecha')
    return String(valor).split('-').reverse().join('/');
  return String(valor);
}

function AnexoReporte({ tabla }: { tabla: TablaReporte }) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(tabla.filas.length / 50));
  return (
    <div className="reportes-resultado">
      <div className="reportes-barra">
        <div>
          <h3>{tabla.titulo}</h3>
          <p>
            {tabla.filas.length.toLocaleString('es-AR')} cuotas · El Excel
            incluye el cronograma completo.
          </p>
        </div>
      </div>
      <div className="reportes-tabla" tabIndex={0} aria-label={tabla.titulo}>
        <table>
          <thead>
            <tr>
              {tabla.columnas.map((c) => (
                <th key={c.key} scope="col">
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.slice((pagina - 1) * 50, pagina * 50).map((fila) => (
              <tr key={`${fila.prestamo}-${fila.cuota}`}>
                {tabla.columnas.map((c) => (
                  <td
                    key={c.key}
                    className={
                      c.tipo === 'dinero' || c.tipo === 'numero'
                        ? 'reportes-numerico'
                        : ''
                    }
                  >
                    {mostrar(fila[c.key], c)}
                  </td>
                ))}
              </tr>
            ))}
            {!tabla.filas.length && (
              <tr>
                <td
                  colSpan={tabla.columnas.length}
                  className="reportes-sin-datos"
                >
                  Sin cuotas para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="reportes-paginacion">
        <span>
          Página {pagina} de {paginas} · 50 cuotas por página.
        </span>
        <div>
          <button
            type="button"
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportesPanel({
  prestamoInicialId
}: {
  prestamoInicialId?: string;
}) {
  const hoy = hoyArgentina();
  const [anio, mes] = hoy.split('-').map(Number);
  const finMes = `${hoy.slice(0, 7)}-${new Date(Date.UTC(anio, mes, 0)).getUTCDate()}`;
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    tipo: 'otorgados',
    desde: `${hoy.slice(0, 7)}-01`,
    hasta: finMes,
    buscar: prestamoInicialId ?? '',
    estadoPrestamo: '',
    estadoCuota: '',
    todoPeriodo: true
  });
  const filtrosIniciales = useRef(filtros);
  const [resultado, setResultado] = useState<{
    reporte: Reporte;
    filtros: FiltrosReporte;
    generado: string;
    cartera: Prestamo[];
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const peticion = useRef<AbortController | null>(null);
  const peticionDetalle = useRef<AbortController | null>(null);
  const [prestamoSeleccionado, setPrestamoSeleccionado] =
    useState<Prestamo | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<string | null>(null);

  function cambiar(cambios: Partial<FiltrosReporte>) {
    peticion.current?.abort();
    peticion.current = null;
    peticionDetalle.current?.abort();
    setCargandoDetalle(null);
    setPrestamoSeleccionado(null);
    setCargando(false);
    setFiltros((f) => ({ ...f, ...cambios }));
    setResultado(null);
    setError('');
    setPagina(1);
  }

  const consultar = useCallback(async (consulta: FiltrosReporte) => {
    if (
      consulta.tipo !== 'padron' && !(consulta.tipo === 'otorgados' && consulta.todoPeriodo) &&
      (!consulta.desde || !consulta.hasta || consulta.desde > consulta.hasta)
    ) {
      setError('Seleccioná un período válido.');
      return;
    }
    peticion.current?.abort();
    const control = new AbortController();
    peticion.current = control;
    setCargando(true);
    setError('');
    setResultado(null);
    setProgreso(0);
    setPagina(1);
    try {
      if (consulta.tipo === 'padron') {
        const personas = await apiClient<{ id: number; socio: number | null; apellido: string | null; nombre: string; documento: string | null; cuil: string | null; observacion: string }[]>('/api/v1/personas/padron-cooperativa', { signal: control.signal });
        if (control.signal.aborted) return;
        const buscar = consulta.buscar.trim().toLocaleLowerCase('es');
        const filas = personas.filter(p => !buscar || [p.id, p.socio, p.apellido, p.nombre, p.documento, p.cuil].some(v => String(v ?? '').toLocaleLowerCase('es').includes(buscar))).map(p => ({ ...p }));
        setResultado({ reporte: { titulo: 'Padrón socios cooperativa', columnas: [{ key: 'id', titulo: 'ID persona', tipo: 'numero' }, { key: 'socio', titulo: 'N° socio', tipo: 'numero' }, { key: 'apellido', titulo: 'Apellido' }, { key: 'nombre', titulo: 'Nombre' }, { key: 'documento', titulo: 'Documento' }, { key: 'cuil', titulo: 'CUIL' }, { key: 'observacion', titulo: 'Observación' }], filas, resumen: [{ titulo: 'Socios', valor: filas.length }], notas: ['Personas cuya observación contiene En Padrón de May.'], advertencias: [] }, filtros: { ...consulta }, generado: new Date().toISOString(), cartera: [] });
        return;
      }
      const cartera = await cargarCartera(control.signal, (cantidad) => {
        if (!control.signal.aborted) setProgreso(cantidad);
      });
      if (control.signal.aborted) return;
      const generado = new Date().toISOString();
      setResultado({
        reporte: construirReporte(cartera, consulta),
        filtros: { ...consulta },
        generado,
        cartera
      });
    } catch (err) {
      if (control.signal.aborted) return;
      control.abort();
      if (peticion.current === control)
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo generar el reporte. Reintentá la consulta.'
        );
    } finally {
      if (peticion.current === control) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void consultar(filtrosIniciales.current);
    return () => {
      peticion.current?.abort();
      peticionDetalle.current?.abort();
    };
  }, [consultar]);

  useEffect(() => {
    if (prestamoInicialId) void verDetalle(prestamoInicialId);
  }, [prestamoInicialId]);

  async function verDetalle(id: string) {
    peticionDetalle.current?.abort();
    const control = new AbortController();
    peticionDetalle.current = control;
    setCargandoDetalle(id);
    setError('');
    try {
      const detalle = await apiClient<Prestamo>(
        `/api/v1/prestamos/${encodeURIComponent(id)}`,
        { signal: control.signal }
      );
      if (!control.signal.aborted) setPrestamoSeleccionado(detalle);
    } catch (err) {
      if (!control.signal.aborted)
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar el legajo.'
        );
    } finally {
      if (peticionDetalle.current === control) setCargandoDetalle(null);
    }
  }

  async function actualizarPrestamo() {
    if (!prestamoSeleccionado) return;
    const actualizado = await apiClient<Prestamo>(
      `/api/v1/prestamos/${encodeURIComponent(prestamoSeleccionado.id)}`
    );
    setPrestamoSeleccionado(actualizado);
    setResultado((previo) => {
      if (!previo) return previo;
      const cartera = previo.cartera.map((p) =>
        p.id === actualizado.id ? actualizado : p
      );
      return {
        ...previo,
        cartera,
        reporte: construirReporte(cartera, previo.filtros),
        generado: new Date().toISOString()
      };
    });
    setPagina(1);
  }

  async function exportar() {
    if (!resultado) return;
    setExportando(true);
    setError('');
    try {
      await descargarReporte(
        resultado.reporte,
        resultado.filtros,
        resultado.generado
      );
    } catch {
      setError('No se pudo generar el Excel. Volvé a intentar la descarga.');
    } finally {
      setExportando(false);
    }
  }

  const reporte = resultado?.reporte;
  const otorgados = filtros.tipo === 'otorgados';
  const todoPeriodo = otorgados && filtros.todoPeriodo === true;
  const paginas = Math.max(1, Math.ceil((reporte?.filas.length ?? 0) / 50));
  return (
    <section className="reportes" aria-labelledby="reportes-titulo">
      <div className="reportes-encabezado">
        <div>
          <h2 id="reportes-titulo">Reportes de seguimiento y control</h2>
          <p>
            Consultá la cartera, abrí los legajos y gestioná las cuotas.
            Descargá los reportes completos en Excel.
          </p>
        </div>
        <span className="reportes-etiqueta">Seguimiento mensual</span>
      </div>

      <div className="reportes-tipos" aria-label="Tipo de reporte">
        {TIPOS_REPORTE.map((tipo, i) => (
          <button
            key={tipo.id}
            type="button"
            aria-pressed={filtros.tipo === tipo.id}
            onClick={() =>
              cambiar({ tipo: tipo.id, estadoCuota: '', plazo: '' })
            }
          >
            <span className="reportes-numero">0{i + 1}</span>
            <strong>{tipo.titulo}</strong>
            <span>{tipo.descripcion}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void consultar(filtros);
        }}
        className="reportes-filtros"
      >
        {otorgados && (
          <label className="reportes-check">
            <input
              type="checkbox"
              checked={todoPeriodo}
              onChange={(e) => cambiar({ todoPeriodo: e.target.checked })}
            />
            Todo el historial
          </label>
        )}
        {filtros.tipo !== 'padron' && <><label>
          Mes de referencia
          <input
            type="month"
            disabled={todoPeriodo}
            aria-label="Mes de referencia"
            value={filtros.desde.slice(0, 7)}
            onChange={(e) => {
              const mes = e.target.value;
              if (!mes) return;
              const [anio, numeroMes] = mes.split('-').map(Number);
              const ultimoDia = new Date(
                Date.UTC(anio, numeroMes, 0)
              ).getUTCDate();
              cambiar({ desde: `${mes}-01`, hasta: `${mes}-${ultimoDia}` });
            }}
          />
        </label>
        <label>
          Desde
          <input
            type="date"
            disabled={todoPeriodo}
            required={!todoPeriodo}
            value={filtros.desde}
            onChange={(e) => cambiar({ desde: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            disabled={todoPeriodo}
            required={!todoPeriodo}
            value={filtros.hasta}
            onChange={(e) => cambiar({ hasta: e.target.value })}
          />
        </label>
        </>}
        <label className="reportes-busqueda">
          Asociado o préstamo
          <input
            type="search"
            placeholder="Nombre, documento o ID…"
            value={filtros.buscar}
            onChange={(e) => cambiar({ buscar: e.target.value })}
          />
        </label>
        {filtros.tipo !== 'padron' && <label>
          Estado del préstamo
          <select
            value={filtros.estadoPrestamo}
            onChange={(e) => cambiar({ estadoPrestamo: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="MORA">Mora</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </label>}
        {(filtros.tipo === 'caida' || filtros.tipo === 'cobranzas') && (
          <label>
            Estado de la cuota
            <select
              value={filtros.estadoCuota}
              onChange={(e) => cambiar({ estadoCuota: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADA">Pagada</option>
              <option value="VENCIDA">Vencida</option>
            </select>
          </label>
        )}
        {filtros.tipo === 'condiciones' && (
          <label>
            Plazo (meses)
            <input
              type="number"
              min="1"
              max="120"
              step="1"
              list="reportes-plazos"
              placeholder="Todos los plazos"
              value={filtros.plazo ?? ''}
              onChange={(e) => cambiar({ plazo: e.target.value })}
            />
            <datalist id="reportes-plazos">
              <option value="6" />
              <option value="12" />
            </datalist>
          </label>
        )}
        <button className="reportes-primario" type="submit" disabled={cargando}>
          {cargando ? 'Consultando…' : 'Consultar reporte'}
        </button>
      </form>
      {otorgados && (
        <p className="reportes-ayuda">
          Consultá todo el historial o desmarcá la opción para filtrar por fecha
          de otorgamiento. En “Ver detalle” podés consultar el legajo, cobrar
          cuotas y cancelar el préstamo.
        </p>
      )}
      {filtros.tipo === 'condiciones' && (
        <p className="reportes-ayuda">
          El período corresponde al otorgamiento. Consultá capital, tasas y
          totales por préstamo; debajo encontrarás el desglose completo de sus
          cuotas.
        </p>
      )}

      {error && (
        <div className="reportes-error" role="alert">
          {error}
        </div>
      )}
      {cargando && (
        <div className="reportes-vacio" role="status">
          {filtros.tipo === 'padron' ? 'Consultando el padrón…' : `Consultando la cartera completa… ${progreso} préstamos recuperados.`}
        </div>
      )}
      {!cargando && !resultado && (
        <div className="reportes-vacio">
          Elegí el reporte y el período, y presioná “Consultar reporte”.
        </div>
      )}
      {!cargando && reporte && resultado && (
        <>
          {reporte.advertencias.map((mensaje) => (
            <div key={mensaje} role="status" className="reportes-advertencia">
              {mensaje}
            </div>
          ))}
          <div className="reportes-resumen">
            {reporte.resumen.map((dato) => (
              <div key={dato.titulo}>
                <span>{dato.titulo}</span>
                <strong>
                  {dato.dinero
                    ? formatMoney(dato.valor)
                    : dato.valor.toLocaleString('es-AR')}
                </strong>
              </div>
            ))}
          </div>
          <div className="reportes-resultado">
            <div className="reportes-barra">
              <div>
                <h3>{reporte.titulo}</h3>
                <p>
                  {reporte.filas.length.toLocaleString('es-AR')} registros ·
                  Generado el{' '}
                  {new Date(resultado.generado).toLocaleString('es-AR', {
                    timeZone: 'America/Argentina/Buenos_Aires'
                  })}
                </p>
              </div>
              <button
                type="button"
                className="reportes-excel"
                disabled={exportando || reporte.filas.length === 0}
                onClick={exportar}
              >
                {exportando ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}
              </button>
            </div>
            <div
              className="reportes-tabla"
              tabIndex={0}
              aria-label="Resultados del reporte, desplazamiento horizontal"
            >
              <table>
                <thead>
                  <tr>
                    {reporte.columnas.map((c) => (
                      <th key={c.key} scope="col">
                        {c.titulo}
                      </th>
                    ))}
                    {otorgados && (
                      <th scope="col">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reporte.filas
                    .slice((pagina - 1) * 50, pagina * 50)
                    .map((fila, i) => (
                      <tr key={`${fila.prestamo}-${fila.cuota ?? ''}-${i}`}>
                        {reporte.columnas.map((c) => (
                          <td
                            key={c.key}
                            className={
                              c.tipo === 'dinero' ||
                              c.tipo === 'numero' ||
                              c.tipo === 'porcentaje'
                                ? 'reportes-numerico'
                                : ''
                            }
                          >
                            {c.key === 'estado' ||
                            c.key === 'estadoPrestamo' ? (
                              <span
                                className={`reportes-estado reportes-estado-${String(fila[c.key]).toLowerCase()}`}
                              >
                                {mostrar(fila[c.key], c)}
                              </span>
                            ) : (
                              mostrar(fila[c.key], c)
                            )}
                          </td>
                        ))}
                        {otorgados && (
                          <td>
                            <button
                              type="button"
                              disabled={Boolean(cargandoDetalle)}
                              onClick={() =>
                                void verDetalle(String(fila.prestamo))
                              }
                            >
                              {cargandoDetalle === fila.prestamo
                                ? 'Cargando…'
                                : 'Ver detalle'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  {reporte.filas.length === 0 && (
                    <tr>
                      <td
                        colSpan={reporte.columnas.length + (otorgados ? 1 : 0)}
                        className="reportes-sin-datos"
                      >
                        No se encontraron registros con los filtros
                        seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="reportes-paginacion">
              <span>
                Página {pagina} de {paginas} · 50 registros por página. Excel
                incluye todos los resultados.
              </span>
              <div>
                <button
                  type="button"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pagina >= paginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
          {reporte.anexos?.map((tabla) => (
            <AnexoReporte
              key={`${resultado.generado}-${tabla.titulo}`}
              tabla={tabla}
            />
          ))}
          <aside className="reportes-notas">
            <h4>Criterios y disponibilidad de datos</h4>
            <ul>
              {reporte.notas.map((nota) => (
                <li key={nota}>{nota}</li>
              ))}
            </ul>
          </aside>
        </>
      )}
      <PrestamoDetalleModal
        key={prestamoSeleccionado?.id ?? 'sin-prestamo'}
        isOpen={Boolean(prestamoSeleccionado)}
        onClose={() => setPrestamoSeleccionado(null)}
        prestamo={prestamoSeleccionado}
        onActualizado={actualizarPrestamo}
      />
    </section>
  );
}
