import React from 'react';
import { PlanAmortizacion } from '../../types/simulacion';
import { formatMoney } from '../../utils/formatters';

interface SimuladorTarjetasProps {
  plan: PlanAmortizacion;
}

export const SimuladorTarjetas: React.FC<SimuladorTarjetasProps> = ({ plan }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Capital Solicitado
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
          {formatMoney(plan.monto_solicitado_centavos)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          {plan.plazo_meses} cuotas mensuales
        </div>
      </div>

      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Total Intereses
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
          {formatMoney(plan.total_interes_centavos)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          Convención: {plan.convencion_tasa}
        </div>
      </div>

      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Total IVA ({Number(plan.alicuota_iva) * 100}%)
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
          {formatMoney(plan.total_iva_centavos)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          Modalidad: {plan.modalidad_iva}
        </div>
      </div>

      <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '0.725rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
          Total a Devolver
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
          {formatMoney(plan.total_a_pagar_centavos)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem', fontWeight: 500 }}>
          Cuota teórica: {formatMoney(plan.cuota_pura_teorica_centavos)}
        </div>
      </div>
    </div>
  );
};
