import React, { useState } from 'react';
import { CuentaCorrienteResumen } from '../../types/persona';
import { Modal } from '../common/Modal';
import { formatPesos } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { CheckCircleIcon, AlertTriangleIcon } from '../common/Icons';
import {
  CuotasPrestamosTab,
  CuotasSocialesTab,
  DesgloseCentralTab,
  MovimientosTab,
  PeriodosTab
} from './CuentaCorrienteTabs';
import { particionarDesglose } from './cuentaCorrienteHelpers';

type CuentaCorrienteTabId = 'prestamos' | 'cuota_social' | 'central' | 'meses' | 'movimientos';

interface CuentaCorrienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cc: CuentaCorrienteResumen | null;
}

const CuentaCorrienteModalBody: React.FC<{ cc: CuentaCorrienteResumen }> = ({ cc }) => {
  const [tab, setTab] = useState<CuentaCorrienteTabId>('prestamos');

  const t = cc.totales;
  const p = cc.persona;
  const { cuotasPrestamos, cuotasCentral } = particionarDesglose(
    cc.desglose,
    cc.desglosePrestamos,
    cc.desgloseCentral
  );
  const cuotasSociales = cc.desgloseCuotasSociales || [];

  const tabs: { id: CuentaCorrienteTabId; label: string }[] = [
    { id: 'prestamos', label: `Cuotas de Préstamos (${cuotasPrestamos.length})` },
    ...(cuotasSociales.length > 0 || cc.cuotaSocial?.activa
      ? [{ id: 'cuota_social' as const, label: `Cuota Social (${cuotasSociales.length})` }]
      : []),
    { id: 'central', label: `Sistema Central (${cuotasCentral.length})` },
    { id: 'meses', label: `Períodos Mensuales (${cc.periodos?.length || 0})` },
    { id: 'movimientos', label: `Movimientos / Pagos (${cc.movimientos?.length || 0})` }
  ];

  return (
    <>
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
            t.saldo > 0 ? '[border:1px_solid_#fecaca]' : '[border:1px_solid_#bbf7d0]'
          ].join(' ')}
        >
          <div
            className={[
              'text-[0.75rem] font-semibold',
              t.saldo > 0 ? 'text-[#991b1b]' : 'text-[#166534]'
            ].join(' ')}
          >
            Saldo Deudor Total
          </div>
          <div
            className={[
              'text-[1.15rem] font-extrabold mt-[0.2rem]',
              t.saldo > 0 ? 'text-[#b91c1c]' : 'text-[#15803d]'
            ].join(' ')}
          >
            {formatPesos(t.saldo)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">Cuota Mensual</div>
          <div className="text-[1.15rem] font-bold text-[#0f172a] mt-[0.2rem]">
            {formatPesos(t.obligacionMensual)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">Cobrado / Pagado</div>
          <div className="text-[1.15rem] font-bold text-[#16a34a] mt-[0.2rem]">
            {formatPesos(t.importeCobrado || 0)}
          </div>
        </div>
        <div className="bg-[#f8fafc] p-3 rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="text-[0.75rem] text-[#475569] font-semibold">Cuotas Cobradas</div>
          <div className="text-[1.15rem] font-bold text-[#0284c7] mt-[0.2rem]">
            {t.cobrados || 0} de {(t.cobrados || 0) + (t.pendientes || 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap [border-bottom:1px_solid_#e2e8f0] mb-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              'p-[0.5rem_0.9rem] [background:none] [border:none] font-semibold cursor-pointer text-[0.83rem]',
              tab === item.id
                ? '[border-bottom:2px_solid_#2563eb] text-[#2563eb]'
                : '[border-bottom:2px_solid_transparent] text-[#64748b] hover:text-[#334155]'
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'prestamos' && <CuotasPrestamosTab cuotas={cuotasPrestamos} />}
      {tab === 'cuota_social' && <CuotasSocialesTab cuotas={cuotasSociales} />}
      {tab === 'central' && <DesgloseCentralTab cuotas={cuotasCentral} />}
      {tab === 'meses' && <PeriodosTab periodos={cc.periodos || []} />}
      {tab === 'movimientos' && <MovimientosTab movimientos={cc.movimientos || []} />}
    </>
  );
};

export const CuentaCorrienteModal: React.FC<CuentaCorrienteModalProps> = ({
  isOpen,
  onClose,
  cc
}) => {
  if (!isOpen || !cc) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cuenta Corriente (Estado Financiero)"
      maxWidth="920px"
    >
      <CuentaCorrienteModalBody key={cc.persona?.id ?? 'cc'} cc={cc} />
    </Modal>
  );
};
