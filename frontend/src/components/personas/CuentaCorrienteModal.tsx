import React, { useState } from 'react';
import { CuentaCorrienteResumen } from '../../types/persona';
import { Modal } from '../common/Modal';
import { formatPesos } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { CheckCircleIcon, AlertTriangleIcon } from '../common/Icons';

interface CuentaCorrienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cc: CuentaCorrienteResumen | null;
}

export const CuentaCorrienteModal: React.FC<CuentaCorrienteModalProps> = ({
  isOpen,
  onClose,
  cc
}) => {
  const [tab, setTab] = useState<'cuotas' | 'meses' | 'movimientos'>('cuotas');

  if (!cc) return null;

  const t = cc.totales;
  const p = cc.persona;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cuenta Corriente (Estado Financiero)"
      maxWidth="920px"
    >
      {/* Encabezado Persona */}
      <div className="flex justify-between items-center bg-[#f8fafc] p-[0.875rem_1.25rem] rounded-lg [border:1px_solid_#e2e8f0] mb-5">
        <div>
          <div className="font-bold text-[1.05rem] text-[#0f172a]">
            {p.apellido} {p.nombre}
          </div>
          <div className="text-[0.8rem] text-[#64748b] mt-[0.15rem]">
            ID #{p.id} · DNI {p.numeroDoc} {p.cuil ? `· CUIL ${p.cuil}` : ''}
          </div>
        </div>
        <div>
          {t.algunaConMora ? (
            <Badge variant="danger">
              <AlertTriangleIcon size={13} color="#b91c1c" /> Registra Mora
            </Badge>
          ) : (
            <Badge variant="success">
              <CheckCircleIcon size={13} color="#15803d" /> Al Día
            </Badge>
          )}
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-[repeat(4,_1fr)] gap-3 mb-5">
        <div
          className={[
            t.saldo > 0 ? 'bg-[#fef2f2]' : 'bg-[#f0fdf4]',
            'p-3 rounded-lg',
            t.saldo > 0
              ? '[border:1px_solid_#fecaca]'
              : '[border:1px_solid_#bbf7d0]'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div
            className={[
              'text-[0.75rem]',
              t.saldo > 0 ? 'text-[#991b1b]' : 'text-[#166534]',
              'font-semibold'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Saldo Deudor
          </div>
          <div
            className={[
              'text-[1.15rem] font-extrabold',
              t.saldo > 0 ? 'text-[#b91c1c]' : 'text-[#15803d]',
              'mt-[0.2rem]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {formatPesos(t.saldo)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">
            Cuota Mensual
          </div>
          <div className="text-[1.15rem] font-bold text-[#0f172a] mt-[0.2rem]">
            {formatPesos(t.obligacionMensual)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">
            Cobrado / Pagado
          </div>
          <div className="text-[1.15rem] font-bold text-[#16a34a] mt-[0.2rem]">
            {formatPesos(t.importeCobrado || 0)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">
            Cuotas Cobradas
          </div>
          <div className="text-[1.15rem] font-bold text-[#0284c7] mt-[0.2rem]">
            {t.cobrados || 0} de {(t.cobrados || 0) + (t.pendientes || 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 [border-bottom:1px_solid_#e2e8f0] mb-4">
        <button
          onClick={() => setTab('cuotas')}
          className={[
            'p-[0.5rem_1rem] [background:none] [border:none]',
            tab === 'cuotas'
              ? '[border-bottom:2px_solid_#2563eb]'
              : '[border-bottom:2px_solid_transparent]',
            tab === 'cuotas' ? 'text-[#2563eb]' : 'text-[#64748b]',
            'font-semibold cursor-pointer text-[0.85rem]'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Desglose de Cuotas ({cc.desglose?.length || 0})
        </button>
        <button
          onClick={() => setTab('meses')}
          className={[
            'p-[0.5rem_1rem] [background:none] [border:none]',
            tab === 'meses'
              ? '[border-bottom:2px_solid_#2563eb]'
              : '[border-bottom:2px_solid_transparent]',
            tab === 'meses' ? 'text-[#2563eb]' : 'text-[#64748b]',
            'font-semibold cursor-pointer text-[0.85rem]'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Períodos Mensuales ({cc.periodos?.length || 0})
        </button>
        <button
          onClick={() => setTab('movimientos')}
          className={[
            'p-[0.5rem_1rem] [background:none] [border:none]',
            tab === 'movimientos'
              ? '[border-bottom:2px_solid_#2563eb]'
              : '[border-bottom:2px_solid_transparent]',
            tab === 'movimientos' ? 'text-[#2563eb]' : 'text-[#64748b]',
            'font-semibold cursor-pointer text-[0.85rem]'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Movimientos / Pagos ({cc.movimientos?.length || 0})
        </button>
      </div>

      {/* Tabla Desglose */}
      {tab === 'cuotas' && (
        <div className="max-h-[350px] overflow-y-auto">
          <table className="w-full border-collapse text-[0.8rem] text-left">
            <thead className="bg-[#f8fafc] sticky top-0 [border-bottom:1px_solid_#e2e8f0]">
              <tr>
                <th className="p-[0.5rem_0.75rem]">Cuota</th>
                <th className="p-[0.5rem_0.75rem]">Período</th>
                <th className="p-[0.5rem_0.75rem]">Concepto</th>
                <th className="p-[0.5rem_0.75rem] text-right">Importe</th>
                <th className="p-[0.5rem_0.75rem] text-right">Cobrado</th>
                <th className="p-[0.5rem_0.75rem] text-right">Pendiente</th>
                <th className="p-[0.5rem_0.75rem] text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cc.desglose && cc.desglose.length > 0 ? (
                cc.desglose.map((d, i) => (
                  <tr key={i} className="[border-bottom:1px_solid_#f1f5f9]">
                    <td className="p-[0.5rem_0.75rem] font-semibold">
                      {d.numeroCuota
                        ? `${d.numeroCuota} de ${d.cantidadCuotas || '—'}`
                        : '—'}
                    </td>
                    <td className="p-[0.5rem_0.75rem]">
                      {d.periodoObligacion
                        ? d.periodoObligacion.substring(0, 10)
                        : '—'}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-[#475569]">
                      {d.planNombre || d.concepto}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-right">
                      {formatPesos(d.importePresentado)}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">
                      {formatPesos(d.importeCobrado)}
                    </td>
                    <td
                      className={[
                        'p-[0.5rem_0.75rem] text-right',
                        d.importePendiente > 0
                          ? 'text-[#b91c1c]'
                          : 'text-[#64748b]'
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {formatPesos(d.importePendiente)}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-center">
                      <Badge
                        variant={
                          d.estado === 'COBRADO'
                            ? 'success'
                            : d.estado === 'EN_MORA'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {d.estado}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#94a3b8]">
                    Sin cuotas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Periodos */}
      {tab === 'meses' && (
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
              {cc.periodos && cc.periodos.length > 0 ? (
                cc.periodos.map((pe, i) => (
                  <tr key={i} className="[border-bottom:1px_solid_#f1f5f9]">
                    <td className="p-[0.5rem_0.75rem] font-semibold">
                      {pe.mes ? pe.mes.substring(0, 7) : '—'}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-right">
                      {formatPesos(pe.esperado)}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-right text-[#16a34a] font-semibold">
                      {formatPesos(pe.cubierto)}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-center">
                      {pe.cobrados}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-center">
                      {pe.pendientes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#94a3b8]">
                    Sin períodos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Movimientos */}
      {tab === 'movimientos' && (
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
              {cc.movimientos && cc.movimientos.length > 0 ? (
                cc.movimientos.map((m, i) => (
                  <tr key={i} className="[border-bottom:1px_solid_#f1f5f9]">
                    <td className="p-[0.5rem_0.75rem]">
                      {m.fechaImpacto ? m.fechaImpacto.substring(0, 10) : '—'}
                    </td>
                    <td className="p-[0.5rem_0.75rem]">{m.origen || '—'}</td>
                    <td className="p-[0.5rem_0.75rem] text-[#475569]">
                      {m.concepto}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-right font-semibold text-[#16a34a]">
                      {formatPesos(m.montoPesos)}
                    </td>
                    <td className="p-[0.5rem_0.75rem] text-center">
                      <Badge variant="success">{m.estado}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#94a3b8]">
                    Sin movimientos de cobro registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};
