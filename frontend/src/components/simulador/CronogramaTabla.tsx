import React from 'react';
import { CuotaItem } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface CronogramaTablaProps {
  cronograma: CuotaItem[];
}

export const CronogramaTabla: React.FC<CronogramaTablaProps> = ({ cronograma }) => {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflowX: 'auto',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'
    }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Tabla de Amortización (Desglose Cuota a Cuota)
        </h4>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {cronograma.length} cuotas proyectadas
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
          <tr>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>N°</th>
            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Saldo Inicial</th>
            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Capital Amortizado</th>
            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Interés</th>
            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>IVA s/Int</th>
            <th style={{ padding: '0.75rem 1rem', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Cuota Total</th>
            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Saldo Deudor Final</th>
          </tr>
        </thead>
        <tbody>
          {cronograma.map((c, i) => (
            <tr
              key={c.numero_cuota}
              style={{
                borderBottom: '1px solid #f1f5f9',
                background: i % 2 === 0 ? '#ffffff' : '#fafafa'
              }}
            >
              <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                {c.numero_cuota}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                {formatMoney(c.saldo_inicial_centavos)}
              </td>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                {formatMoney(c.capital_centavos)}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>
                {formatMoney(c.interes_centavos)}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#7c3aed' }}>
                {formatMoney(c.iva_interes_centavos)}
              </td>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>
                {formatMoney(c.cuota_total_centavos)}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: c.saldo_final_centavos === 0 ? '#10b981' : '#64748b', fontWeight: c.saldo_final_centavos === 0 ? 700 : 400 }}>
                {formatMoney(c.saldo_final_centavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
