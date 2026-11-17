import React from 'react';

interface FiltrosCuotasBarProps {
  numeroCuota?: string;
  onNumeroCuotaChange?: (val: string) => void;
  mostrarNumeroCuota?: boolean;
  estado: string;
  onEstadoChange: (val: string) => void;
  estadosDisponibles: string[];
  fecha: string;
  onFechaChange: (val: string) => void;
  onLimpiar: () => void;
}

const inputCls =
  'p-[0.3rem_0.55rem] rounded [border:1px_solid_#cbd5e1] text-[0.78rem] bg-white text-[#0f172a]';

export const FiltrosCuotasBar: React.FC<FiltrosCuotasBarProps> = ({
  numeroCuota = '',
  onNumeroCuotaChange,
  mostrarNumeroCuota = true,
  estado,
  onEstadoChange,
  estadosDisponibles,
  fecha,
  onFechaChange,
  onLimpiar
}) => {
  const hayFiltroActivo =
    (mostrarNumeroCuota && numeroCuota.trim() !== '') ||
    estado !== 'TODOS' ||
    fecha !== '';

  return (
    <div className="flex flex-wrap items-end gap-2.5 mb-3 bg-[#ffffff] p-[0.6rem_0.85rem] rounded-lg [border:1px_solid_#e2e8f0] text-[0.78rem]">
      {mostrarNumeroCuota && onNumeroCuotaChange && (
        <div className="flex flex-col gap-1">
          <label className="text-[0.68rem] font-semibold uppercase text-[#64748b]">
            N° de cuota
          </label>
          <input
            type="number"
            min={1}
            placeholder="Todas"
            value={numeroCuota}
            onChange={(e) => onNumeroCuotaChange(e.target.value)}
            className={`${inputCls} w-[95px]`}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[0.68rem] font-semibold uppercase text-[#64748b]">
          Estado de cuota
        </label>
        <select
          aria-label="Estado de cuota"
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value)}
          className={inputCls}
        >
          <option value="TODOS">Todos</option>
          {estadosDisponibles.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[0.68rem] font-semibold uppercase text-[#64748b]">
          Fecha de cuota
        </label>
        <input
          type="date"
          aria-label="Fecha de cuota"
          value={fecha}
          onChange={(e) => onFechaChange(e.target.value)}
          className={inputCls}
        />
      </div>

      {hayFiltroActivo && (
        <button
          type="button"
          onClick={onLimpiar}
          className="p-[0.32rem_0.65rem] rounded [border:1px_solid_#cbd5e1] bg-[#f8fafc] text-[#475569] text-[0.76rem] font-semibold cursor-pointer hover:bg-[#f1f5f9]"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
};
