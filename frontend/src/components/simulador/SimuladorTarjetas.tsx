import React from 'react';
import { PlanAmortizacion } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface SimuladorTarjetasProps {
  plan: PlanAmortizacion;
}

export const SimuladorTarjetas: React.FC<SimuladorTarjetasProps> = ({ plan }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Capital Solicitado</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '0.25rem' }}>
          {formatMoney(plan.monto_solicitado_centavos)}
        </div>
      </div>
      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Total Intereses</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
          {formatMoney(plan.total_interes_centavos)}
        </div>
      </div>
      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Total IVA ({Number(plan.alicuota_iva) * 100}%)</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.25rem' }}>
          {formatMoney(plan.total_iva_centavos)}
        </div>
      </div>
      <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <div style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Total a Devolver</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
          {formatMoney(plan.total_a_pagar_centavos)}
        </div>
      </div>
    </div>
  );
};
