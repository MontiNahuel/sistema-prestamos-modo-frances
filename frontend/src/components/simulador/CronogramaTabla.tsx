import React from 'react';
import { CuotaItem } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface CronogramaTablaProps {
  cronograma: CuotaItem[];
}

export const CronogramaTabla: React.FC<CronogramaTablaProps> = ({
  cronograma
}) => {
  return (
    <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl [overflow-x:auto] shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)]">
      <div className="p-[1rem_1.25rem] [border-bottom:1px_solid_#f1f5f9] flex justify-between items-center">
        <h4 className="m-0 text-[0.95rem] font-bold text-[#0f172a]">
          Tabla de Amortización (Desglose Cuota a Cuota)
        </h4>
        <span className="text-[0.75rem] text-[#64748b]">
          {cronograma.length} cuotas proyectadas
        </span>
      </div>

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
