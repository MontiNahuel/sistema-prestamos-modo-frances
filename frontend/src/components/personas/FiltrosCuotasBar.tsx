import React from 'react';
import { formatPesos } from '../../utils/formatters';

export interface PrestamoFiltroOption {
  id: string;
  label: string;
}

interface FiltrosCuotasBarProps {
  prestamo?: string;
  onPrestamoChange?: (val: string) => void;
  prestamoOptions?: PrestamoFiltroOption[];
  totalCuotasSinFiltro?: number;
  numeroCuota?: string;
  onNumeroCuotaChange?: (val: string) => void;
  mostrarNumeroCuota?: boolean;
  estado: string;
  onEstadoChange: (val: string) => void;
  estadosDisponibles: string[];
  fecha: string;
  onFechaChange: (val: string) => void;
  onLimpiar: () => void;
  resumen?: {
    cantidad: number;
    presentado: number;
    cobrado: number;
    pendiente: number;
  };
}

const controlCls =
  'h-[32px] px-2.5 rounded-md [border:1px_solid_#cbd5e1] text-[0.78rem] bg-[#ffffff] text-[#0f172a] [color-scheme:light]';

export const FiltrosCuotasBar: React.FC<FiltrosCuotasBarProps> = ({
  prestamo = 'TODOS',
  onPrestamoChange,
  prestamoOptions = [],
  totalCuotasSinFiltro = 0,
  numeroCuota = '',
  onNumeroCuotaChange,
  mostrarNumeroCuota = true,
  estado,
  onEstadoChange,
  estadosDisponibles,
  fecha,
  onFechaChange,
  onLimpiar,
  resumen
}) => {
  const hayFiltroActivo =
    (prestamoOptions.length > 1 && prestamo !== 'TODOS') ||
    (mostrarNumeroCuota && numeroCuota.trim() !== '') ||
    estado !== 'TODOS' ||
    fecha !== '';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-2.5 bg-[#ffffff] [border-bottom:1px_solid_#e2e8f0] text-[0.78rem] flex-shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        {prestamoOptions.length > 1 && onPrestamoChange && (
          <select
            aria-label="Filtrar por préstamo"
            value={prestamo}
            onChange={(e) => onPrestamoChange(e.target.value)}
            className={`${controlCls} font-semibold max-w-[270px]`}
          >
            <option value="TODOS">
              Todos los préstamos ({totalCuotasSinFiltro})
            </option>
            {prestamoOptions.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
        )}

        {mostrarNumeroCuota && onNumeroCuotaChange && (
          <input
            type="number"
            min={1}
            aria-label="N° de cuota"
            placeholder="N° cuota"
            value={numeroCuota}
            onChange={(e) => onNumeroCuotaChange(e.target.value)}
            className={`${controlCls} w-[96px]`}
          />
        )}

        <select
          aria-label="Estado de cuota"
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value)}
          className={controlCls}
        >
          <option value="TODOS">Estado: Todos</option>
          {estadosDisponibles.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="Fecha de cuota"
          value={fecha}
          onChange={(e) => onFechaChange(e.target.value)}
          className={controlCls}
        />

        {hayFiltroActivo && (
          <button
            type="button"
            onClick={onLimpiar}
            className="h-[32px] px-2.5 rounded-md [border:1px_solid_#cbd5e1] bg-[#f8fafc] text-[#475569] text-[0.76rem] font-semibold cursor-pointer hover:bg-[#f1f5f9]"
          >
            Limpiar
          </button>
        )}
      </div>

      {resumen && (
        <div className="flex flex-wrap items-center gap-4 text-[#475569] [font-variant-numeric:tabular-nums]">
          <span>
            Cuotas: <strong className="text-[#0f172a]">{resumen.cantidad}</strong>
          </span>
          <span>
            Importe: <strong className="text-[#0f172a]">{formatPesos(resumen.presentado)}</strong>
          </span>
          <span>
            Cobrado: <strong className="text-[#16a34a]">{formatPesos(resumen.cobrado)}</strong>
          </span>
          <span>
            Pendiente:{' '}
            <strong className={resumen.pendiente > 0 ? 'text-[#b91c1c]' : 'text-[#64748b]'}>
              {formatPesos(resumen.pendiente)}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};
