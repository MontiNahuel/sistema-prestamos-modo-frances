import React from 'react';
import { PlanAmortizacion } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface SimuladorTarjetasProps {
  plan: PlanAmortizacion;
}

export const SimuladorTarjetas: React.FC<SimuladorTarjetasProps> = ({
  plan
}) => {
  const primerVencimiento = plan.cronograma[0]?.fecha_vencimiento;
  const primerPeriodoDias = plan.cronograma[0]?.dias_periodo;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-4 mb-6">
      <div className="bg-[#ffffff] p-5 rounded-xl [border:1px_solid_#e2e8f0] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="text-[0.725rem] text-[#64748b] uppercase font-semibold tracking-[0.05em]">
          Capital Solicitado
        </div>
        <div className="text-[1.35rem] font-extrabold text-[#0f172a] mt-[0.35rem] tracking-[-0.02em]">
          {formatMoney(plan.monto_solicitado_centavos)}
        </div>
        <div className="text-[0.75rem] text-[#94a3b8] mt-[0.2rem]">
          {plan.plazo_meses} cuotas mensuales
        </div>
      </div>

      <div className="bg-[#ffffff] p-5 rounded-xl [border:1px_solid_#e2e8f0] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="text-[0.725rem] text-[#64748b] uppercase font-semibold tracking-[0.05em]">
          Primer Vencimiento
        </div>
        <div className="text-[1.35rem] font-extrabold text-[#0f172a] mt-[0.35rem] tracking-[-0.02em]">
          {primerVencimiento
            ? new Date(`${primerVencimiento}T00:00:00`).toLocaleDateString('es-AR')
            : 'A definir'}
        </div>
        <div className="text-[0.75rem] text-[#94a3b8] mt-[0.2rem]">
          {primerVencimiento && primerPeriodoDias
            ? `Primer período: ${primerPeriodoDias} días`
            : 'Fecha de la cuota 1'}
        </div>
      </div>

      <div className="bg-[#ffffff] p-5 rounded-xl [border:1px_solid_#e2e8f0] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="text-[0.725rem] text-[#64748b] uppercase font-semibold tracking-[0.05em]">
          Total Intereses
        </div>
        <div className="text-[1.35rem] font-extrabold text-[#2563eb] mt-[0.35rem] tracking-[-0.02em]">
          {formatMoney(plan.total_interes_centavos)}
        </div>
        <div className="text-[0.75rem] text-[#94a3b8] mt-[0.2rem]">
          Convención: {plan.convencion_tasa}
        </div>
      </div>

      <div className="bg-[#ffffff] p-5 rounded-xl [border:1px_solid_#e2e8f0] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="text-[0.725rem] text-[#64748b] uppercase font-semibold tracking-[0.05em]">
          Total IVA ({Number(plan.alicuota_iva) * 100}%)
        </div>
        <div className="text-[1.35rem] font-extrabold text-[#7c3aed] mt-[0.35rem] tracking-[-0.02em]">
          {formatMoney(plan.total_iva_centavos)}
        </div>
        <div className="text-[0.75rem] text-[#94a3b8] mt-[0.2rem]">
          Modalidad: {plan.modalidad_iva}
        </div>
      </div>

      <div className="bg-[#f0fdf4] p-5 rounded-xl [border:1px_solid_#bbf7d0] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="text-[0.725rem] text-[#166534] uppercase font-bold tracking-[0.05em]">
          Total a Devolver
        </div>
        <div className="text-[1.35rem] font-extrabold text-[#15803d] mt-[0.35rem] tracking-[-0.02em]">
          {formatMoney(plan.total_a_pagar_centavos)}
        </div>
        <div className="text-[0.75rem] text-[#16a34a] mt-[0.2rem] font-medium">
          Cuota teórica: {formatMoney(plan.cuota_pura_teorica_centavos)}
        </div>
      </div>
    </div>
  );
};
