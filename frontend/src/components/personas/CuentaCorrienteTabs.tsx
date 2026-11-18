import React, { useMemo, useState } from 'react';
import {
  DesgloseCuentaCorriente,
  MovimientoCuentaCorriente,
  PeriodoCuentaCorriente
} from '../../types/persona';
import { formatPesos } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import {
  clavePrestamoDesglose,
  estadoBadgeVariant,
  estadosDisponiblesCuotas,
  filtrarCuotasDesglose
} from './cuentaCorrienteHelpers';
import { FiltrosCuotasBar, PrestamoFiltroOption } from './FiltrosCuotasBar';

const stickyTheadCls =
  'bg-[#f8fafc] sticky top-0 z-[3] [box-shadow:inset_0_-1px_0_#cbd5e1] text-[#475569] text-[0.7rem] uppercase tracking-[0.03em]';

const thCls = 'py-2 px-2.5';
const tdCls = 'py-[0.45rem] px-2.5';

export const CuotasPrestamosTab: React.FC<{ cuotas: DesgloseCuentaCorriente[] }> = ({ cuotas }) => {
  const [filtroPrestamo, setFiltroPrestamo] = useState<string>('TODOS');
  const [filtroNumero, setFiltroNumero] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<string>('');

  const prestamosUnicos: PrestamoFiltroOption[] = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of cuotas) {
      const clave = clavePrestamoDesglose(c);
      if (!mapa.has(clave)) {
        const num = c.numeroPrestamo
          ? `Préstamo N° ${c.numeroPrestamo}`
          : c.prestamoId
          ? `Préstamo #${c.prestamoId.slice(0, 8)}`
          : 'Préstamo';
        mapa.set(clave, `${num} · ${c.planNombre || 'Sistema Francés'}`);
      }
    }
    return Array.from(mapa.entries()).map(([id, label]) => ({ id, label }));
  }, [cuotas]);

  const estados = useMemo(() => estadosDisponiblesCuotas(cuotas), [cuotas]);

  const visibles = useMemo(
    () =>
      filtrarCuotasDesglose(cuotas, {
        prestamo: filtroPrestamo,
        numeroCuota: filtroNumero,
        estado: filtroEstado,
        fecha: filtroFecha
      }),
    [cuotas, filtroPrestamo, filtroNumero, filtroEstado, filtroFecha]
  );

  const resumen = useMemo(() => {
    const tot = visibles.reduce(
      (acc, c) => ({
        presentado: acc.presentado + (c.importePresentado || 0),
        cobrado: acc.cobrado + (c.importeCobrado || 0),
        pendiente: acc.pendiente + (c.importePendiente || 0)
      }),
      { presentado: 0, cobrado: 0, pendiente: 0 }
    );
    return { cantidad: visibles.length, ...tot };
  }, [visibles]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {cuotas.length > 0 && (
        <FiltrosCuotasBar
          prestamo={filtroPrestamo}
          onPrestamoChange={setFiltroPrestamo}
          prestamoOptions={prestamosUnicos}
          totalCuotasSinFiltro={cuotas.length}
          numeroCuota={filtroNumero}
          onNumeroCuotaChange={setFiltroNumero}
          estado={filtroEstado}
          onEstadoChange={setFiltroEstado}
          estadosDisponibles={estados}
          fecha={filtroFecha}
          onFechaChange={setFiltroFecha}
          resumen={resumen}
          onLimpiar={() => {
            setFiltroPrestamo('TODOS');
            setFiltroNumero('');
            setFiltroEstado('TODOS');
            setFiltroFecha('');
          }}
        />
      )}

      <div className="flex-1 min-h-0 overflow-auto px-6 pb-4 bg-[#ffffff]">
        <table className="w-full border-collapse text-[0.78rem] text-left whitespace-nowrap [font-variant-numeric:tabular-nums]">
          <thead className={stickyTheadCls}>
            <tr>
              <th className={thCls}>Préstamo</th>
              <th className={thCls}>Cuota</th>
              <th className={thCls}>Vencimiento</th>
              <th className={`${thCls} text-right`}>Capital</th>
              <th className={`${thCls} text-right`}>Interés</th>
              <th className={`${thCls} text-right`}>IVA</th>
              <th className={`${thCls} text-right`}>Cost. Op.</th>
              <th className={`${thCls} text-right`}>Importe Total</th>
              <th className={`${thCls} text-right`}>Cobrado</th>
              <th className={`${thCls} text-right`}>Pendiente</th>
              <th className={`${thCls} text-center`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr
                  key={`${d.prestamoId || 'p'}-${d.numeroCuota || i}-${i}`}
                  className={`[border-bottom:1px_solid_#f1f5f9] ${
                    i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafcff]'
                  }`}
                >
                  <td className={tdCls}>
                    <strong className="text-[#0f172a]">
                      {d.numeroPrestamo
                        ? `N° ${d.numeroPrestamo}`
                        : d.prestamoId
                        ? `#${d.prestamoId.slice(0, 8)}`
                        : 'Préstamo'}
                    </strong>{' '}
                    <span className="text-[#64748b] text-[0.72rem]">
                      · {d.planNombre || 'Sistema Francés'}
                    </span>
                  </td>
                  <td className={`${tdCls} font-semibold text-[#334155]`}>
                    {d.numeroCuota ? `${d.numeroCuota} / ${d.cantidadCuotas || '—'}` : '—'}
                  </td>
                  <td className={`${tdCls} text-[#475569]`}>
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className={`${tdCls} text-right text-[#475569]`}>
                    {d.capitalPesos !== undefined ? formatPesos(d.capitalPesos) : '—'}
                  </td>
                  <td className={`${tdCls} text-right text-[#475569]`}>
                    {d.interesPesos !== undefined ? formatPesos(d.interesPesos) : '—'}
                  </td>
                  <td className={`${tdCls} text-right text-[#475569]`}>
                    {d.ivaPesos !== undefined ? formatPesos(d.ivaPesos) : '—'}
                  </td>
                  <td className={`${tdCls} text-right text-[#475569]`}>
                    {d.costoOperativoPesos !== undefined
                      ? formatPesos(d.costoOperativoPesos)
                      : '—'}
                  </td>
                  <td className={`${tdCls} text-right font-bold text-[#0f172a]`}>
                    {formatPesos(d.importePresentado)}
                  </td>
                  <td className={`${tdCls} text-right text-[#16a34a] font-semibold`}>
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td
                    className={`${tdCls} text-right font-semibold ${
                      d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#94a3b8]'
                    }`}
                  >
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <Badge variant={estadoBadgeVariant(d.estado)}>{d.estado}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="p-8 text-center text-[#94a3b8]">
                  {cuotas.length > 0
                    ? 'Ninguna cuota coincide con los filtros aplicados.'
                    : 'Sin cuotas de préstamos registradas para este socio.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CuotasSocialesTab: React.FC<{ cuotas: DesgloseCuentaCorriente[] }> = ({ cuotas }) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<string>('');

  const estados = useMemo(() => estadosDisponiblesCuotas(cuotas), [cuotas]);
  const visibles = useMemo(
    () => filtrarCuotasDesglose(cuotas, { estado: filtroEstado, fecha: filtroFecha }),
    [cuotas, filtroEstado, filtroFecha]
  );

  const resumen = useMemo(() => {
    const tot = visibles.reduce(
      (acc, c) => ({
        presentado: acc.presentado + (c.importePresentado || 0),
        cobrado: acc.cobrado + (c.importeCobrado || 0),
        pendiente: acc.pendiente + (c.importePendiente || 0)
      }),
      { presentado: 0, cobrado: 0, pendiente: 0 }
    );
    return { cantidad: visibles.length, ...tot };
  }, [visibles]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {cuotas.length > 0 && (
        <FiltrosCuotasBar
          mostrarNumeroCuota={false}
          estado={filtroEstado}
          onEstadoChange={setFiltroEstado}
          estadosDisponibles={estados}
          fecha={filtroFecha}
          onFechaChange={setFiltroFecha}
          resumen={resumen}
          onLimpiar={() => {
            setFiltroEstado('TODOS');
            setFiltroFecha('');
          }}
        />
      )}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-4 bg-[#ffffff]">
        <table className="w-full border-collapse text-[0.78rem] text-left [font-variant-numeric:tabular-nums]">
          <thead className={stickyTheadCls}>
            <tr>
              <th className={thCls}>Período</th>
              <th className={thCls}>Vencimiento</th>
              <th className={`${thCls} text-right`}>Importe</th>
              <th className={`${thCls} text-right`}>Cobrado</th>
              <th className={`${thCls} text-right`}>Pendiente</th>
              <th className={`${thCls} text-center`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr
                  key={`${d.cuotaSocialId || d.periodo || i}`}
                  className={`[border-bottom:1px_solid_#f1f5f9] ${
                    i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafcff]'
                  }`}
                >
                  <td className={`${tdCls} font-semibold text-[#0f172a]`}>
                    {d.periodo || (d.periodoObligacion ? d.periodoObligacion.substring(0, 7) : '—')}
                  </td>
                  <td className={tdCls}>
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className={`${tdCls} text-right font-medium`}>
                    {formatPesos(d.importePresentado)}
                  </td>
                  <td className={`${tdCls} text-right text-[#16a34a] font-semibold`}>
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td
                    className={`${tdCls} text-right ${
                      d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'
                    }`}
                  >
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <Badge variant={estadoBadgeVariant(d.estado)}>{d.estado}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#94a3b8]">
                  {cuotas.length > 0
                    ? 'Ninguna cuota social coincide con los filtros aplicados.'
                    : 'Sin cuotas sociales generadas para este socio.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const DesgloseCentralTab: React.FC<{ cuotas: DesgloseCuentaCorriente[] }> = ({ cuotas }) => {
  const [filtroNumero, setFiltroNumero] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<string>('');

  const estados = useMemo(() => estadosDisponiblesCuotas(cuotas), [cuotas]);
  const visibles = useMemo(
    () =>
      filtrarCuotasDesglose(cuotas, {
        numeroCuota: filtroNumero,
        estado: filtroEstado,
        fecha: filtroFecha
      }),
    [cuotas, filtroNumero, filtroEstado, filtroFecha]
  );

  const resumen = useMemo(() => {
    const tot = visibles.reduce(
      (acc, c) => ({
        presentado: acc.presentado + (c.importePresentado || 0),
        cobrado: acc.cobrado + (c.importeCobrado || 0),
        pendiente: acc.pendiente + (c.importePendiente || 0)
      }),
      { presentado: 0, cobrado: 0, pendiente: 0 }
    );
    return { cantidad: visibles.length, ...tot };
  }, [visibles]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {cuotas.length > 0 && (
        <FiltrosCuotasBar
          numeroCuota={filtroNumero}
          onNumeroCuotaChange={setFiltroNumero}
          estado={filtroEstado}
          onEstadoChange={setFiltroEstado}
          estadosDisponibles={estados}
          fecha={filtroFecha}
          onFechaChange={setFiltroFecha}
          resumen={resumen}
          onLimpiar={() => {
            setFiltroNumero('');
            setFiltroEstado('TODOS');
            setFiltroFecha('');
          }}
        />
      )}
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-4 bg-[#ffffff]">
        <table className="w-full border-collapse text-[0.78rem] text-left [font-variant-numeric:tabular-nums]">
          <thead className={stickyTheadCls}>
            <tr>
              <th className={thCls}>Cuota</th>
              <th className={thCls}>Período</th>
              <th className={thCls}>Concepto (Sistema Central)</th>
              <th className={`${thCls} text-right`}>Importe</th>
              <th className={`${thCls} text-right`}>Cobrado</th>
              <th className={`${thCls} text-right`}>Pendiente</th>
              <th className={`${thCls} text-center`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr
                  key={`${d.id || i}`}
                  className={`[border-bottom:1px_solid_#f1f5f9] ${
                    i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafcff]'
                  }`}
                >
                  <td className={`${tdCls} font-semibold`}>
                    {d.numeroCuota ? `${d.numeroCuota}${d.cantidadCuotas ? ` / ${d.cantidadCuotas}` : ''}` : '—'}
                  </td>
                  <td className={tdCls}>
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className={`${tdCls} text-[#475569]`}>
                    <span>{d.planNombre || d.concepto}</span>
                    {(d.banco || d.origen) && (
                      <span className="ml-2 text-[0.7rem] text-[#94a3b8]">
                        ({[d.concepto, d.banco, d.origen].filter(Boolean).join(' · ')})
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>{formatPesos(d.importePresentado)}</td>
                  <td className={`${tdCls} text-right text-[#16a34a] font-semibold`}>
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td
                    className={`${tdCls} text-right ${
                      d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'
                    }`}
                  >
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <Badge variant={estadoBadgeVariant(d.estado)}>{d.estado}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#94a3b8]">
                  {cuotas.length > 0
                    ? 'Ninguna cuota coincide con los filtros aplicados.'
                    : 'Sin cuotas registradas en el sistema central.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PeriodosTab: React.FC<{ periodos: PeriodoCuentaCorriente[] }> = ({ periodos }) => (
  <div className="flex-1 min-h-0 overflow-auto px-6 pb-4 bg-[#ffffff]">
    <table className="w-full border-collapse text-[0.78rem] text-left [font-variant-numeric:tabular-nums]">
      <thead className={stickyTheadCls}>
        <tr>
          <th className={thCls}>Mes</th>
          <th className={`${thCls} text-right`}>Esperado</th>
          <th className={`${thCls} text-right`}>Cubierto</th>
          <th className={`${thCls} text-center`}>Cobrados</th>
          <th className={`${thCls} text-center`}>Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {periodos.length > 0 ? (
          periodos.map((pe, i) => (
            <tr
              key={`${pe.mes}-${i}`}
              className={`[border-bottom:1px_solid_#f1f5f9] ${
                i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafcff]'
              }`}
            >
              <td className={`${tdCls} font-semibold`}>{pe.mes ? pe.mes.substring(0, 7) : '—'}</td>
              <td className={`${tdCls} text-right`}>{formatPesos(pe.esperado)}</td>
              <td className={`${tdCls} text-right text-[#16a34a] font-semibold`}>{formatPesos(pe.cubierto)}</td>
              <td className={`${tdCls} text-center`}>{pe.cobrados}</td>
              <td className={`${tdCls} text-center`}>{pe.pendientes}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="p-8 text-center text-[#94a3b8]">Sin períodos registrados.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const MovimientosTab: React.FC<{ movimientos: MovimientoCuentaCorriente[] }> = ({ movimientos }) => (
  <div className="flex-1 min-h-0 overflow-auto px-6 pb-4 bg-[#ffffff]">
    <table className="w-full border-collapse text-[0.78rem] text-left [font-variant-numeric:tabular-nums]">
      <thead className={stickyTheadCls}>
        <tr>
          <th className={thCls}>Fecha</th>
          <th className={thCls}>Origen / Banco</th>
          <th className={thCls}>Concepto</th>
          <th className={`${thCls} text-right`}>Importe</th>
          <th className={`${thCls} text-center`}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.length > 0 ? (
          movimientos.map((m, i) => (
            <tr
              key={`${m.id}-${i}`}
              className={`[border-bottom:1px_solid_#f1f5f9] ${
                i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafcff]'
              }`}
            >
              <td className={tdCls}>{m.fechaImpacto ? m.fechaImpacto.substring(0, 10) : '—'}</td>
              <td className={tdCls}>{m.origen || '—'}</td>
              <td className={`${tdCls} text-[#475569]`}>{m.concepto}</td>
              <td className={`${tdCls} text-right font-semibold text-[#0f172a]`}>
                {formatPesos(m.montoPesos)}
              </td>
              <td className={`${tdCls} text-center`}>
                <Badge variant={estadoBadgeVariant(m.estado)}>{m.estado}</Badge>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="p-8 text-center text-[#94a3b8]">Sin movimientos de cobro registrados aún.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
