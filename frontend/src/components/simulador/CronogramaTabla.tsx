import React from 'react';
import { CuotaItem } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface CronogramaTablaProps {
  cronograma: CuotaItem[];
}

export const CronogramaTabla: React.FC<CronogramaTablaProps> = ({ cronograma }) => {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.875rem' }}>
        <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
          <tr>
            <th style={{ padding: '0.75rem', textAlign: 'center' }}>N°</th>
            <th style={{ padding: '0.75rem' }}>Saldo Inicial</th>
            <th style={{ padding: '0.75rem' }}>Capital</th>
            <th style={{ padding: '0.75rem' }}>Interés</th>
            <th style={{ padding: '0.75rem' }}>IVA</th>
            <th style={{ padding: '0.75rem', color: '#15803d' }}>Cuota Total</th>
            <th style={{ padding: '0.75rem' }}>Saldo Final</th>
          </tr>
        </thead>
        <tbody>
          {cronograma.map((c) => (
            <tr key={c.numero_cuota} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{c.numero_cuota}</td>
              <td style={{ padding: '0.75rem' }}>{formatMoney(c.saldo_inicial_centavos)}</td>
              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{formatMoney(c.capital_centavos)}</td>
              <td style={{ padding: '0.75rem', color: '#2563eb' }}>{formatMoney(c.interes_centavos)}</td>
              <td style={{ padding: '0.75rem', color: '#7c3aed' }}>{formatMoney(c.iva_interes_centavos)}</td>
              <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{formatMoney(c.cuota_total_centavos)}</td>
              <td style={{ padding: '0.75rem', color: '#4b5563' }}>{formatMoney(c.saldo_final_centavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
