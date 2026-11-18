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
import { CuentaCorrientePanoramaTab } from './CuentaCorrientePanoramaTab';
import { particionarDesglose } from './cuentaCorrienteHelpers';

type CuentaCorrienteTabId =
  | 'panorama'
  | 'prestamos'
  | 'cuota_social'
  | 'central'
  | 'meses'
  | 'movimientos';

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
  const iniciales =
    `${(p.apellido || '').trim()[0] || ''}${(p.nombre || '').trim()[0] || ''}`.toUpperCase() ||
    'CC';

  const tabs: { id: CuentaCorrienteTabId; label: string }[] = [
    { id: 'panorama', label: 'Panorama Completo' },
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
      {/* Tira 1: Socio a la izquierda + 4 KPIs compactos a la derecha */}
      <div className="px-6 py-3 bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-[270px]">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[#1d4ed8] text-[#ffffff] flex items-center justify-center font-extrabold text-[0.85rem] flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[0.98rem] text-[#0f172a]">
                {p.apellido} {p.nombre}
              </span>
              {t.algunaConMora ? (
                <Badge variant="danger">
                  <AlertTriangleIcon size={12} color="#b91c1c" /> Registra Mora
                </Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircleIcon size={12} color="#15803d" /> Al Día
                </Badge>
              )}
            </div>
            <div className="text-[0.75rem] text-[#64748b] mt-[0.1rem]">
              ID #{p.id} · DNI {p.numeroDoc} {p.cuil ? `· CUIL ${p.cuil}` : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(4,_minmax(145px,_1fr))] gap-2.5 flex-1 max-w-[760px] [font-variant-numeric:tabular-nums]">
          <div
            className={[
              t.saldo > 0 ? 'bg-[#fef2f2]' : 'bg-[#f0fdf4]',
              'px-3 py-[0.45rem] rounded-lg',
              t.saldo > 0 ? '[border:1px_solid_#fecaca]' : '[border:1px_solid_#bbf7d0]'
            ].join(' ')}
          >
            <div
              className={[
                'text-[0.68rem] font-semibold',
                t.saldo > 0 ? 'text-[#991b1b]' : 'text-[#166534]'
              ].join(' ')}
            >
              Saldo Deudor Total
            </div>
            <div
              className={[
                'text-[1rem] font-extrabold mt-[0.05rem]',
                t.saldo > 0 ? 'text-[#b91c1c]' : 'text-[#15803d]'
              ].join(' ')}
            >
              {formatPesos(t.saldo)}
            </div>
          </div>
          <div className="bg-[#ffffff] px-3 py-[0.45rem] rounded-lg [border:1px_solid_#e2e8f0]">
            <div className="text-[0.68rem] text-[#64748b] font-semibold">Cuota Mensual</div>
            <div className="text-[1rem] font-extrabold text-[#0f172a] mt-[0.05rem]">
              {formatPesos(t.obligacionMensual)}
            </div>
          </div>
          <div className="bg-[#ffffff] px-3 py-[0.45rem] rounded-lg [border:1px_solid_#e2e8f0]">
            <div className="text-[0.68rem] text-[#64748b] font-semibold">Cobrado / Pagado</div>
            <div className="text-[1rem] font-extrabold text-[#16a34a] mt-[0.05rem]">
              {formatPesos(t.importeCobrado || 0)}
            </div>
          </div>
          <div className="bg-[#ffffff] px-3 py-[0.45rem] rounded-lg [border:1px_solid_#e2e8f0]">
            <div className="text-[0.68rem] text-[#64748b] font-semibold">Cuotas Cobradas</div>
            <div className="text-[1rem] font-extrabold text-[#0284c7] mt-[0.05rem]">
              {t.cobrados || 0} de {(t.cobrados || 0) + (t.pendientes || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Tira 2: Pestañas */}
      <div className="flex gap-1 overflow-x-auto px-6 bg-[#ffffff] [border-bottom:1px_solid_#e2e8f0] flex-shrink-0">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              'py-2.5 px-3.5 [background:none] [border:none] font-semibold cursor-pointer text-[0.8rem] whitespace-nowrap',
              tab === item.id
                ? '[border-bottom:2px_solid_#2563eb] text-[#1d4ed8] font-bold'
                : '[border-bottom:2px_solid_transparent] text-[#64748b] hover:text-[#334155]'
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Cuerpo expandido */}
      {tab === 'panorama' && (
        <CuentaCorrientePanoramaTab
          cc={cc}
          cuotasPrestamos={cuotasPrestamos}
          cuotasSociales={cuotasSociales}
          cuotasCentral={cuotasCentral}
          onIrATab={(destino) => setTab(destino)}
        />
      )}
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
      maxWidth="1440px"
      layout="workspace"
    >
      <CuentaCorrienteModalBody key={cc.persona?.id ?? 'cc'} cc={cc} />
    </Modal>
  );
};
