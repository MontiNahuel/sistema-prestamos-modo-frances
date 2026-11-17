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
import { FiltrosCuotasBar } from './FiltrosCuotasBar';

export const CuotasPrestamosTab: React.FC<{ cuotas: DesgloseCuentaCorriente[] }> = ({ cuotas }) => {
  const [filtroPrestamo, setFiltroPrestamo] = useState<string>('TODOS');
  const [filtroNumero, setFiltroNumero] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<string>('');

  const prestamosUnicos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of cuotas) {
      const clave = clavePrestamoDesglose(c);
      if (!mapa.has(clave)) {
        const num = c.numeroPrestamo ? `Préstamo N° ${c.numeroPrestamo}` : c.prestamoId ? `Préstamo #${c.prestamoId.slice(0, 8)}` : 'Préstamo';
        mapa.set(clave, `${num} · ${c.planNombre || 'Sistema Francés'}`);
      }
    }
    return Array.from(mapa.entries());
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
    return visibles.reduce(
      (acc, c) => ({
        presentado: acc.presentado + (c.importePresentado || 0),
        cobrado: acc.cobrado + (c.importeCobrado || 0),
        pendiente: acc.pendiente + (c.importePendiente || 0)
      }),
      { presentado: 0, cobrado: 0, pendiente: 0 }
    );
  }, [visibles]);

  return (
    <div>
      {cuotas.length > 0 && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-2.5 bg-[#f8fafc] p-[0.6rem_0.85rem] rounded-lg [border:1px_solid_#e2e8f0] text-[0.78rem]">
            <div className="flex gap-4 flex-wrap text-[#475569]">
              <span>Total cuotas: <strong className="text-[#0f172a]">{visibles.length}</strong></span>
              <span>Importe: <strong className="text-[#0f172a]">{formatPesos(resumen.presentado)}</strong></span>
              <span>Cobrado: <strong className="text-[#16a34a]">{formatPesos(resumen.cobrado)}</strong></span>
              <span>Pendiente: <strong className={resumen.pendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'}>{formatPesos(resumen.pendiente)}</strong></span>
            </div>
            {prestamosUnicos.length > 1 && (
              <select
                value={filtroPrestamo}
                onChange={(e) => setFiltroPrestamo(e.target.value)}
                className="p-[0.3rem_0.55rem] rounded [border:1px_solid_#cbd5e1] text-[0.78rem] bg-white text-[#0f172a]"
              >
                <option value="TODOS">Todos los préstamos ({cuotas.length})</option>
                {prestamosUnicos.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            )}
          </div>
          <FiltrosCuotasBar
            numeroCuota={filtroNumero}
            onNumeroCuotaChange={setFiltroNumero}
            estado={filtroEstado}
            onEstadoChange={setFiltroEstado}
            estadosDisponibles={estados}
            fecha={filtroFecha}
            onFechaChange={setFiltroFecha}
            onLimpiar={() => {
              setFiltroNumero('');
              setFiltroEstado('TODOS');
              setFiltroFecha('');
            }}
          />
        </>
      )}

      <div className="max-h-[340px] overflow-y-auto">
        <table className="w-full border-collapse text-[0.8rem] text-left">
          <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
            <tr>
              <th className="p-[0.5rem_0.75rem]">Préstamo</th>
              <th className="p-[0.5rem_0.75rem]">Cuota</th>
              <th className="p-[0.5rem_0.75rem]">Vencimiento</th>
              <th className="p-[0.5rem_0.75rem] text-right">Importe</th>
              <th className="p-[0.5rem_0.75rem] text-right">Cobrado</th>
              <th className="p-[0.5rem_0.75rem] text-right">Pendiente</th>
              <th className="p-[0.5rem_0.75rem] text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr key={`${d.prestamoId || 'p'}-${d.numeroCuota || i}-${i}`} className="[border-bottom:1px_solid_#f1f5f9]">
                  <td className="p-[0.5rem_0.75rem]">
                    <div className="font-semibold text-[#0f172a]">
                      {d.numeroPrestamo ? `N° ${d.numeroPrestamo}` : d.prestamoId ? `#${d.prestamoId.slice(0, 8)}` : 'Préstamo'}
                    </div>
                    <div className="text-[0.72rem] text-[#64748b]">{d.planNombre || 'Sistema Francés'}</div>
                  </td>
                  <td className="p-[0.5rem_0.75rem] font-semibold">
                    {d.numeroCuota ? `${d.numeroCuota} de ${d.cantidadCuotas || '—'}` : '—'}
                  </td>
                  <td className="p-[0.5rem_0.75rem]">
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-right">
                    <div className="font-medium text-[#0f172a]">{formatPesos(d.importePresentado)}</div>
                    {d.capitalPesos !== undefined && (
                      <div className="text-[0.68rem] text-[#64748b]">
                        Cap {formatPesos(d.capitalPesos)} · Int {formatPesos(d.interesPesos || 0)} · IVA {formatPesos(d.ivaPesos || 0)}
                        {(d.costoOperativoPesos || 0) > 0 && ` · Cost. Op. ${formatPesos(d.costoOperativoPesos || 0)}`}
                      </div>
                    )}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td className={`p-[0.5rem_0.75rem] text-right ${d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'}`}>
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-center">
                    <Badge variant={estadoBadgeVariant(d.estado)}>{d.estado}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#94a3b8]">
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

  return (
    <div>
      {cuotas.length > 0 && (
        <FiltrosCuotasBar
          mostrarNumeroCuota={false}
          estado={filtroEstado}
          onEstadoChange={setFiltroEstado}
          estadosDisponibles={estados}
          fecha={filtroFecha}
          onFechaChange={setFiltroFecha}
          onLimpiar={() => {
            setFiltroEstado('TODOS');
            setFiltroFecha('');
          }}
        />
      )}
      <div className="max-h-[350px] overflow-y-auto">
        <table className="w-full border-collapse text-[0.8rem] text-left">
          <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
            <tr>
              <th className="p-[0.5rem_0.75rem]">Período</th>
              <th className="p-[0.5rem_0.75rem]">Vencimiento</th>
              <th className="p-[0.5rem_0.75rem] text-right">Importe</th>
              <th className="p-[0.5rem_0.75rem] text-right">Cobrado</th>
              <th className="p-[0.5rem_0.75rem] text-right">Pendiente</th>
              <th className="p-[0.5rem_0.75rem] text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr key={`${d.cuotaSocialId || d.periodo || i}`} className="[border-bottom:1px_solid_#f1f5f9]">
                  <td className="p-[0.5rem_0.75rem] font-semibold text-[#0f172a]">
                    {d.periodo || (d.periodoObligacion ? d.periodoObligacion.substring(0, 7) : '—')}
                  </td>
                  <td className="p-[0.5rem_0.75rem]">
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-right font-medium">
                    {formatPesos(d.importePresentado)}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td className={`p-[0.5rem_0.75rem] text-right ${d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'}`}>
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-center">
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

  return (
    <div>
      {cuotas.length > 0 && (
        <FiltrosCuotasBar
          numeroCuota={filtroNumero}
          onNumeroCuotaChange={setFiltroNumero}
          estado={filtroEstado}
          onEstadoChange={setFiltroEstado}
          estadosDisponibles={estados}
          fecha={filtroFecha}
          onFechaChange={setFiltroFecha}
          onLimpiar={() => {
            setFiltroNumero('');
            setFiltroEstado('TODOS');
            setFiltroFecha('');
          }}
        />
      )}
      <div className="max-h-[350px] overflow-y-auto">
        <table className="w-full border-collapse text-[0.8rem] text-left">
          <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
            <tr>
              <th className="p-[0.5rem_0.75rem]">Cuota</th>
              <th className="p-[0.5rem_0.75rem]">Período</th>
              <th className="p-[0.5rem_0.75rem]">Concepto (Sistema Central)</th>
              <th className="p-[0.5rem_0.75rem] text-right">Importe</th>
              <th className="p-[0.5rem_0.75rem] text-right">Cobrado</th>
              <th className="p-[0.5rem_0.75rem] text-right">Pendiente</th>
              <th className="p-[0.5rem_0.75rem] text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((d, i) => (
                <tr key={`${d.id || i}`} className="[border-bottom:1px_solid_#f1f5f9]">
                  <td className="p-[0.5rem_0.75rem] font-semibold">
                    {d.numeroCuota ? `${d.numeroCuota}${d.cantidadCuotas ? ` de ${d.cantidadCuotas}` : ''}` : '—'}
                  </td>
                  <td className="p-[0.5rem_0.75rem]">
                    {d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-[#475569]">
                    <div>{d.planNombre || d.concepto}</div>
                    {(d.banco || d.origen) && (
                      <div className="text-[0.7rem] text-[#94a3b8]">
                        {[d.concepto, d.banco, d.origen].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-right">{formatPesos(d.importePresentado)}</td>
                  <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">
                    {formatPesos(d.importeCobrado)}
                  </td>
                  <td className={`p-[0.5rem_0.75rem] text-right ${d.importePendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'}`}>
                    {formatPesos(d.importePendiente)}
                  </td>
                  <td className="p-[0.5rem_0.75rem] text-center">
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
  <div className="max-h-[350px] overflow-y-auto">
    <table className="w-full border-collapse text-[0.8rem] text-left">
      <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
        <tr>
          <th className="p-[0.5rem_0.75rem]">Mes</th>
          <th className="p-[0.5rem_0.75rem] text-right">Esperado</th>
          <th className="p-[0.5rem_0.75rem] text-right">Cubierto</th>
          <th className="p-[0.5rem_0.75rem] text-center">Cobrados</th>
          <th className="p-[0.5rem_0.75rem] text-center">Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {periodos.length > 0 ? (
          periodos.map((pe, i) => (
            <tr key={`${pe.mes}-${i}`} className="[border-bottom:1px_solid_#f1f5f9]">
              <td className="p-[0.5rem_0.75rem] font-semibold">{pe.mes ? pe.mes.substring(0, 7) : '—'}</td>
              <td className="p-[0.5rem_0.75rem] text-right">{formatPesos(pe.esperado)}</td>
              <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">{formatPesos(pe.cubierto)}</td>
              <td className="p-[0.5rem_0.75rem] text-center">{pe.cobrados}</td>
              <td className="p-[0.5rem_0.75rem] text-center">{pe.pendientes}</td>
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
  <div className="max-h-[350px] overflow-y-auto">
    <table className="w-full border-collapse text-[0.8rem] text-left">
      <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
        <tr>
          <th className="p-[0.5rem_0.75rem]">Fecha</th>
          <th className="p-[0.5rem_0.75rem]">Origen / Banco</th>
          <th className="p-[0.5rem_0.75rem]">Concepto</th>
          <th className="p-[0.5rem_0.75rem] text-right">Importe</th>
          <th className="p-[0.5rem_0.75rem] text-center">Estado</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.length > 0 ? (
          movimientos.map((m, i) => (
            <tr key={`${m.id}-${i}`} className="[border-bottom:1px_solid_#f1f5f9]">
              <td className="p-[0.5rem_0.75rem]">{m.fechaImpacto ? m.fechaImpacto.substring(0, 10) : '—'}</td>
              <td className="p-[0.5rem_0.75rem]">{m.origen || '—'}</td>
              <td className="p-[0.5rem_0.75rem] text-[#475569]">{m.concepto}</td>
              <td className="p-[0.5rem_0.75rem] text-right font-semibold text-[#0f172a]">
                {formatPesos(m.montoPesos)}
              </td>
              <td className="p-[0.5rem_0.75rem] text-center">
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
