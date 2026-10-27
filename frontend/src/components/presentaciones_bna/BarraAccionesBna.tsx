import React from 'react';

interface BarraAccionesBnaProps {
  totalCuotas: number;
  seleccionadasCount: number;
  totalCentavos: number;
  onGenerar: () => void;
  loading: boolean;
}

export const BarraAccionesBna: React.FC<BarraAccionesBnaProps> = ({
  totalCuotas,
  seleccionadasCount,
  totalCentavos,
  onGenerar,
  loading,
}) => {
  if (totalCuotas === 0) return null;

  return (
    <div
      style={{
        background: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
        <div>
          <span style={{ color: '#64748b' }}>Seleccionadas: </span>
          <strong style={{ color: '#0f172a' }}>{seleccionadasCount}</strong> de {totalCuotas}
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Total a debitar: </span>
          <strong style={{ color: '#16a34a' }}>
            ${(totalCentavos / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerar}
        disabled={loading || seleccionadasCount === 0}
        style={{
          padding: '0.6rem 1.5rem',
          borderRadius: '6px',
          border: 'none',
          background: seleccionadasCount > 0 ? '#16a34a' : '#94a3b8',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: seleccionadasCount > 0 ? 'pointer' : 'not-allowed',
          boxShadow: seleccionadasCount > 0 ? '0 2px 4px rgba(22,163,74,0.3)' : 'none',
        }}
      >
        {loading ? 'Generando...' : `Generar Archivo BNA (${seleccionadasCount})`}
      </button>
    </div>
  );
};
