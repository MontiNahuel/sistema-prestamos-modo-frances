import { useMemo, useState } from 'react';
import { ApiError } from '../../services/api/client';
import { formatPesos } from '../../utils/formatters';
import { agregarTablaExcel, descargarLibroExcel } from '../reportes/exportarReporte';
import '../reportes/reportes.css';
import {
  claseBadgeEstadoCatalinas,
  clasificarEstadoCatalinas,
  construirPayloadCatalinas,
  construirTablaExcelCatalinas,
  descomponerEstadoCatalinas,
  FILTROS_CATALINAS_INICIALES,
  TIPOS_REPORTE_EXTRA,
} from './reportesExtra';
import type {
  CatalinasCobroItem,
  FiltrosCatalinasForm,
  ReporteExtraCatalinasResponse,
  TipoReporteExtra,
  UsarTolerancia,
  VerSinLote,
} from './reportesExtra';
import { consultarCatalinasCobros } from './reportesExtraApi';

const POR_PAGINA = 50;

type FiltroResultadoLocal = 'todos' | 'ok' | 'pendiente' | 'vencida';

function formatearFechaISO(fecha: string | null): string {
  if (!fecha) return '-';
  return fecha.split('-').reverse().join('/');
}

function formatearPeriodoHaber(periodo: string): string {
  if (periodo.length !== 6) return periodo;
  return `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;
}

export function ReportesExtraPanel() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporteExtra>('catalinas-cobros');
  const [filtros, setFiltros] = useState<FiltrosCatalinasForm>(FILTROS_CATALINAS_INICIALES);
  const [respuesta, setRespuesta] = useState<ReporteExtraCatalinasResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroLocalEstado, setFiltroLocalEstado] = useState<FiltroResultadoLocal>('todos');
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [pagina, setPagina] = useState(1);

  const definicionActiva =
    TIPOS_REPORTE_EXTRA.find((tipo) => tipo.id === tipoReporte) ?? TIPOS_REPORTE_EXTRA[0];

  const cambiarTipoReporte = (nuevoTipo: TipoReporteExtra) => {
    setTipoReporte(nuevoTipo);
    setRespuesta(null);
    setError(null);
    setFiltroLocalEstado('todos');
    setBusquedaLocal('');
    setPagina(1);
  };

  const ejecutarConsulta = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (tipoReporte !== 'catalinas-cobros') return;

    const { payload, error: errorValidacion } = construirPayloadCatalinas(filtros);
    if (errorValidacion || !payload) {
      setError(errorValidacion || 'Revise los parámetros ingresados.');
      return;
    }

    setCargando(true);
    setError(null);
    setPagina(1);

    try {
      const data = await consultarCatalinasCobros(payload);
      setRespuesta(data);
    } catch (err) {
      const detalle =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo consultar la base Oracle.';
      setError(detalle);
    } finally {
      setCargando(false);
    }
  };

  const filasFiltradas = useMemo<CatalinasCobroItem[]>(() => {
    if (!respuesta) return [];
    const termino = busquedaLocal.trim().toLowerCase();
    return respuesta.filas.filter((fila) => {
      if (filtroLocalEstado !== 'todos') {
        const clase = clasificarEstadoCatalinas(fila.estado);
        if (clase !== filtroLocalEstado) return false;
      }
      if (!termino) return true;
      return (
        fila.dni.toLowerCase().includes(termino) ||
        (fila.nombre_persona ?? '').toLowerCase().includes(termino) ||
        fila.estado.toLowerCase().includes(termino) ||
        String(fila.idprestamo ?? '').includes(termino) ||
        String(fila.idcobro ?? '').includes(termino)
      );
    });
  }, [respuesta, filtroLocalEstado, busquedaLocal]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filasVisibles = filasFiltradas.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  const exportarExcel = async () => {
    if (!respuesta) return;
    setExportando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const libro = new ExcelJS.Workbook();
      const tabla = construirTablaExcelCatalinas({
        ...respuesta,
        filas: filasFiltradas,
      });
      agregarTablaExcel(libro, 'Catalinas Oracle', tabla);
      const hastaTag = respuesta.parametros.periodo_hasta ?? respuesta.parametros.periodo_desde;
      const nombreArchivo = `reporte_extra_catalinas_${respuesta.parametros.periodo_desde}_${hastaTag}.xlsx`;
      await descargarLibroExcel(libro, nombreArchivo);
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo generar el Excel: ${err.message}`
          : 'No se pudo generar el archivo Excel.'
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className="reportes" aria-labelledby="reportes-extra-titulo">
      <div className="reportes-encabezado">
        <div>
          <h2 id="reportes-extra-titulo">Reportes Extra</h2>
          <p>{definicionActiva.descripcion}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="reportes-etiqueta">{definicionActiva.origen}</span>
          <button
            type="button"
            className="reportes-excel"
            disabled={!respuesta || filasFiltradas.length === 0 || exportando}
            onClick={() => void exportarExcel()}
          >
            {exportando ? 'Generando Excel...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      <form className="reportes-filtros" onSubmit={(e) => void ejecutarConsulta(e)}>
        <label className="reportes-selector">
          Tipo de reporte extra
          <select
            aria-label="Tipo de reporte extra"
            value={tipoReporte}
            onChange={(e) => cambiarTipoReporte(e.target.value as TipoReporteExtra)}
          >
            {TIPOS_REPORTE_EXTRA.map((tipo, i) => (
              <option key={tipo.id} value={tipo.id}>
                {`${String(i + 1).padStart(2, '0')} · ${tipo.titulo}`}
              </option>
            ))}
          </select>
        </label>

        {tipoReporte === 'catalinas-cobros' && (
          <>
            <label>
              Período haber desde
              <input
                type="month"
                required
                value={filtros.periodoDesde}
                onChange={(e) => setFiltros({ ...filtros, periodoDesde: e.target.value })}
              />
            </label>

            <label>
              Período haber hasta (opcional)
              <input
                type="month"
                value={filtros.periodoHasta}
                onChange={(e) => setFiltros({ ...filtros, periodoHasta: e.target.value })}
              />
            </label>

            <label>
              Usar tolerancia
              <select
                value={filtros.usarTolerancia}
                onChange={(e) =>
                  setFiltros({ ...filtros, usarTolerancia: e.target.value as UsarTolerancia })
                }
              >
                <option value="N">No (importe exacto)</option>
                <option value="S">Sí (margen %)</option>
              </select>
            </label>

            {filtros.usarTolerancia === 'S' && (
              <label>
                Tolerancia vs cuota (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={filtros.toleranciaPctPorcentaje}
                  onChange={(e) =>
                    setFiltros({ ...filtros, toleranciaPctPorcentaje: e.target.value })
                  }
                />
              </label>
            )}

            <label>
              Ver meses sin lote cargado
              <select
                value={filtros.verSinLote}
                onChange={(e) =>
                  setFiltros({ ...filtros, verSinLote: e.target.value as VerSinLote })
                }
              >
                <option value="S">Sí (S)</option>
                <option value="N">No (N)</option>
              </select>
            </label>

            <label className="reportes-buscar">
              DNIs separados por coma (vacío = todos)
              <input
                type="text"
                placeholder="Ej: 28701648, 34776005"
                value={filtros.dnis}
                onChange={(e) => setFiltros({ ...filtros, dnis: e.target.value })}
              />
            </label>

            <div className="flex items-end">
              <button type="submit" className="reportes-primario w-full" disabled={cargando}>
                {cargando ? 'Consultando Oracle...' : 'Consultar Oracle'}
              </button>
            </div>
          </>
        )}
      </form>

      {error && <div className="reportes-error">{error}</div>}

      {!respuesta && !cargando && !error && (
        <div className="reportes-vacio">
          Seleccione un reporte extra, configure los parámetros y presione{' '}
          <strong>Consultar Oracle</strong> para ejecutar la consulta contra la base histórica. Si
          deja <em>Período haber hasta</em> vacío, se consultará únicamente el mes de inicio.
        </div>
      )}

      {cargando && (
        <div className="reportes-vacio">Ejecutando consulta en Oracle (prestaprod)...</div>
      )}

      {respuesta && !cargando && (
        <>
          <div className="reportes-resumen">
            <div>
              <span>Registros totales</span>
              <strong>{respuesta.resumen.total_filas.toLocaleString('es-AR')}</strong>
              <span className="text-xs text-slate-500">
                Total: {formatPesos(respuesta.resumen.importe_total)}
              </span>
            </div>
            <div>
              <span>Ya se cobró</span>
              <strong className="!text-[#166534]">
                {respuesta.resumen.cobrados.toLocaleString('es-AR')}
              </strong>
              <span className="text-xs text-slate-500">
                Cobrado: {formatPesos(respuesta.resumen.importe_cobrados)}
              </span>
            </div>
            <div>
              <span>Todavía no se cobró</span>
              <strong className="!text-[#991b1b]">
                {respuesta.resumen.no_cobrados.toLocaleString('es-AR')}
              </strong>
              <span className="text-xs text-slate-500">
                Pendiente: {formatPesos(respuesta.resumen.importe_no_cobrados)}
              </span>
            </div>
            <div>
              <span>Sin lote cargado</span>
              <strong className="!text-[#92400e]">
                {respuesta.resumen.sin_lote.toLocaleString('es-AR')}
              </strong>
              <span className="text-xs text-slate-500">
                Saldo cuotas: {formatPesos(respuesta.resumen.importe_sin_lote)}
              </span>
            </div>
          </div>

          <div className="reportes-resultado">
            <div className="reportes-barra">
              <div>
                <h3>{definicionActiva.titulo}</h3>
                <p>
                  Parámetros: {respuesta.parametros.periodo_desde} a{' '}
                  {respuesta.parametros.periodo_hasta ?? respuesta.parametros.periodo_desde} ·{' '}
                  {respuesta.parametros.tolerancia_pct === 0
                    ? 'Tolerancia Exacto (0%)'
                    : `Tolerancia ${(respuesta.parametros.tolerancia_pct * 100).toFixed(1)}%`}{' '}
                  · Sin lote {respuesta.parametros.ver_sin_lote} · Mostrando{' '}
                  {filasFiltradas.length.toLocaleString('es-AR')} de{' '}
                  {respuesta.filas.length.toLocaleString('es-AR')} registros.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Filtrar resultado por estado"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  value={filtroLocalEstado}
                  onChange={(e) => {
                    setFiltroLocalEstado(e.target.value as FiltroResultadoLocal);
                    setPagina(1);
                  }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="ok">Ya se cobró</option>
                  <option value="vencida">Todavía no se cobró</option>
                  <option value="pendiente">Sin lote cargado</option>
                </select>
                <input
                  type="search"
                  aria-label="Buscar dentro del resultado"
                  placeholder="Filtrar DNI, persona, préstamo..."
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  value={busquedaLocal}
                  onChange={(e) => {
                    setBusquedaLocal(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>

            {filasFiltradas.length === 0 ? (
              <div className="reportes-vacio">
                No hay registros que coincidan con los criterios aplicados.
              </div>
            ) : (
              <div className="reportes-tabla" tabIndex={0} aria-label={definicionActiva.titulo}>
                <table>
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>DNI</th>
                      <th>Persona</th>
                      <th>Estado</th>
                      <th>Error / Detalle</th>
                      <th>Suposición</th>
                      <th>Importe cobro</th>
                      <th>ID cobro</th>
                      <th>Fecha cobro</th>
                      <th>ID préstamo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisibles.map((fila, index) => {
                      const partes = descomponerEstadoCatalinas(fila.estado);
                      const badgeClass = claseBadgeEstadoCatalinas(fila.estado);
                      return (
                        <tr
                          key={`${fila.periodo_haber}-${fila.dni}-${fila.idcobro ?? 'nl'}-${
                            fila.idprestamo ?? 'np'
                          }-${index}`}
                        >
                          <td>{formatearPeriodoHaber(fila.periodo_haber)}</td>
                          <td>{fila.dni}</td>
                          <td>{fila.nombre_persona ?? '-'}</td>
                          <td>
                            <span className={`${badgeClass} font-semibold`}>
                              {partes.estadoBase}
                            </span>
                          </td>
                          <td>{partes.detalleError ?? '-'}</td>
                          <td className="text-slate-600">{partes.suposicion ?? '-'}</td>
                          <td>{formatPesos(fila.importe_cobro)}</td>
                          <td>{fila.idcobro ?? '-'}</td>
                          <td>{formatearFechaISO(fila.fecha_cobro)}</td>
                          <td>{fila.idprestamo ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPaginas > 1 && (
              <div className="reportes-paginacion">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </button>
                <span>
                  Página {paginaActual} de {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
