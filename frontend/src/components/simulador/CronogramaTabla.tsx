import React from 'react';
import { CuotaItem, PlanAmortizacion } from '../../types/simulacion';
import { formatMoney, formatPct } from '../../utils/formatters';
import { ExportExcelButton } from '../common/ExportExcelButton';
import { exportarCronogramaExcel } from './exportarCronogramaExcel';

interface CronogramaTablaProps {
  cronograma: CuotaItem[];
  plan?: PlanAmortizacion;
}

export const CronogramaTabla: React.FC<CronogramaTablaProps> = ({
  cronograma,
  plan
}) => {
  const tieneCostoOperativo =
    (plan?.total_costo_operativo_centavos ?? 0) > 0 ||
    cronograma.some((c) => (c.costo_operativo_centavos ?? 0) > 0);

  const tasasResumen = plan
    ? [
        { label: 'Tasa Nominal Anual (TNA)', valor: formatPct(plan.tna ?? plan.tasa_anual), destacado: false },
        { label: 'Tasa Efectiva Mensual (TEM)', valor: formatPct(plan.tem ?? 0, 2, 4), destacado: false },
        { label: 'Tasa Efectiva Anual (TEA)', valor: formatPct(plan.tea ?? 0), destacado: false },
        { label: 'Costo Financiero Total (CFT - TEA)', valor: formatPct(plan.cft_tea ?? 0), destacado: true },
        { label: 'CFT Nominal Anual (CFT TNA)', valor: formatPct(plan.cft_tna ?? 0), destacado: false }
      ]
    : [];

  return (
    <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl [overflow-x:auto] shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)]">
      <div className="p-[1rem_1.25rem] [border-bottom:1px_solid_#f1f5f9] flex justify-between items-center flex-wrap gap-3">
        <h4 className="m-0 text-[0.95rem] font-bold text-[#0f172a]">
          Tabla de Amortización (Desglose Cuota a Cuota)
        </h4>
        <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[0.75rem] text-[#64748b]">
          {cronograma.length} cuotas proyectadas
        </span>
        <ExportExcelButton onExport={() => exportarCronogramaExcel(cronograma)} disabled={cronograma.length === 0} />
        </div>
      </div>

      {tasasResumen.length > 0 && (
        <div className="px-5 py-3 bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] grid grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] gap-3">
          {tasasResumen.map((tasa) => (
            <div key={tasa.label} className="bg-[#ffffff] px-3.5 py-2 rounded-lg [border:1px_solid_#e2e8f0]">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-[#64748b]">
                {tasa.label}
              </div>
              <div className={`text-[1rem] font-bold mt-0.5 ${tasa.destacado ? 'text-[#2563eb]' : 'text-[#0f172a]'}`}>
                {tasa.valor}
              </div>
            </div>
          ))}
        </div>
      )}

      <table className="w-full border-collapse text-right text-[0.85rem]">
        <thead className="bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] text-[#475569]">
          <tr>
            <th className="p-[0.75rem_1rem] text-center text-[0.75rem] font-semibold uppercase">
              N°
            </th>
            <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
              Saldo Inicial
            </th>
            <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
              Capital Amortizado
            </th>
            <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
              Interés
            </th>
            <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
              IVA s/Int
            </th>
            {tieneCostoOperativo && (
              <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
                Costo Op.
              </th>
            )}
            <th className="p-[0.75rem_1rem] text-[#15803d] text-[0.75rem] font-bold uppercase">
              Cuota Total
            </th>
            <th className="p-[0.75rem_1rem] text-[0.75rem] font-semibold uppercase">
              Saldo Deudor Final
            </th>
          </tr>
        </thead>
        <tbody>
          {cronograma.map((c, i) => (
            <tr
              key={c.numero_cuota}
              className={[
                '[border-bottom:1px_solid_#f1f5f9]',
                i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafafa]'
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <td className="p-[0.75rem_1rem] text-center font-semibold text-[#64748b]">
                {c.numero_cuota}
              </td>
              <td className="p-[0.75rem_1rem] text-[#334155]">
                {formatMoney(c.saldo_inicial_centavos)}
              </td>
              <td className="p-[0.75rem_1rem] font-semibold text-[#0f172a]">
                {formatMoney(c.capital_centavos)}
              </td>
              <td className="p-[0.75rem_1rem] text-[#2563eb]">
                {formatMoney(c.interes_centavos)}
              </td>
              <td className="p-[0.75rem_1rem] text-[#7c3aed]">
                {formatMoney(c.iva_interes_centavos)}
              </td>
              {tieneCostoOperativo && (
                <td className="p-[0.75rem_1rem] text-[#b45309]">
                  {formatMoney(c.costo_operativo_centavos ?? 0)}
                </td>
              )}
              <td className="p-[0.75rem_1rem] font-bold text-[#15803d] text-[0.9rem]">
                {formatMoney(c.cuota_total_centavos)}
              </td>
              <td
                className={[
                  'p-[0.75rem_1rem]',
                  c.saldo_final_centavos === 0
                    ? 'text-[#10b981]'
                    : 'text-[#64748b]',
                  c.saldo_final_centavos === 0
                    ? 'font-bold'
                    : '[font-weight:400]'
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatMoney(c.saldo_final_centavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
