import React, { useEffect, useState } from 'react';
import { LineaPrestamo } from '../../types/linea';
import { Persona } from '../../types/persona';
import { SimulacionPayload } from '../../types/simulacion';
import { getLineas } from '../../services/api/lineasApi';
import { formatMoney } from '../../utils/formatters';
import { CalculatorIcon } from '../common/Icons';

interface SimuladorFormProps {
  onSimular: (payload: SimulacionPayload) => void;
  simulando: boolean;
  personaSeleccionada: Persona | null;
}

export const SimuladorForm: React.FC<SimuladorFormProps> = ({
  onSimular,
  simulando,
  personaSeleccionada
}) => {
  const [lineas, setLineas] = useState<LineaPrestamo[]>([]);
  const [selectedLineaId, setSelectedLineaId] = useState<number | ''>('');
  const [montoPesos, setMontoPesos] = useState<number>(100000);
  const [plazoMeses, setPlazoMeses] = useState<number>(12);
  const [tnaPorcentaje, setTnaPorcentaje] = useState<number>(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(21);

  useEffect(() => {
    getLineas(true).then((data) => {
      setLineas(data);
      if (data.length > 0) {
        const primera = data[0];
        setSelectedLineaId(primera.id);
        setTnaPorcentaje(Number(primera.tasa_default) * 100);
        setIvaPorcentaje(Number(primera.alicuota_iva) * 100);
      }
    }).catch(console.error);
  }, []);

  const handleLineaChange = (lineaId: number | '') => {
    setSelectedLineaId(lineaId);
    if (!lineaId) return;
    const l = lineas.find(x => x.id === lineaId);
    if (l) {
      setTnaPorcentaje(Number(l.tasa_default) * 100);
      setIvaPorcentaje(Number(l.alicuota_iva) * 100);
      const minP = l.monto_minimo_centavos / 100;
      const maxP = l.monto_maximo_centavos / 100;
      if (montoPesos < minP) setMontoPesos(minP);
      if (montoPesos > maxP) setMontoPesos(maxP);
      if (plazoMeses < l.plazo_minimo_meses) setPlazoMeses(l.plazo_minimo_meses);
      if (plazoMeses > l.plazo_maximo_meses) setPlazoMeses(l.plazo_maximo_meses);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimular({
      monto_centavos: Math.round(montoPesos * 100),
      plazo_meses: plazoMeses,
      tna: tnaPorcentaje / 100,
      alicuota_iva: ivaPorcentaje / 100,
      linea_id: selectedLineaId ? Number(selectedLineaId) : null
    });
  };

  const lineaActiva = lineas.find(x => x.id === selectedLineaId);

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#ffffff',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      position: 'sticky',
      top: '5rem'
    }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
        Parámetros de Simulación
      </h3>

      {personaSeleccionada && (
        <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.725rem', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>Socio Asignado:</div>
          <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem', marginTop: '0.15rem' }}>
            {personaSeleccionada.apellido} {personaSeleccionada.nombre}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            IdPersona: #{personaSeleccionada.idPersona} · DNI: {personaSeleccionada.numeroDoc}
          </div>
        </div>
      )}

      {/* Selector de Línea de Crédito */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#475569' }}>
          Línea de Crédito / Plan
        </label>
        <select
          value={selectedLineaId}
          onChange={(e) => handleLineaChange(e.target.value ? Number(e.target.value) : '')}
          style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff', color: '#0f172a' }}
        >
          <option value="">Personalizado / Sin Línea</option>
          {lineas.map(l => (
            <option key={l.id} value={l.id}>
              {l.nombre} ({l.tipo_tasa} {Number(l.tasa_default) * 100}%)
            </option>
          ))}
        </select>
        {lineaActiva && (
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            Fórmula: <strong>{lineaActiva.motor?.nombre || 'Francés Estándar'}</strong>
            <br />
            Rango: {formatMoney(lineaActiva.monto_minimo_centavos)} a {formatMoney(lineaActiva.monto_maximo_centavos)}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.15rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#475569' }}>
          Monto a Financiar ($)
        </label>
        <input
          type="number"
          min="1000"
          step="100"
          value={montoPesos}
          onChange={(e) => setMontoPesos(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
          required
        />
        <div style={{ color: '#64748b', fontSize: '0.725rem', marginTop: '0.2rem' }}>
          Equivale a {montoPesos * 100} centavos
        </div>
      </div>

      <div style={{ marginBottom: '1.15rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#475569' }}>
          Cantidad de Cuotas (Meses)
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={plazoMeses}
          onChange={(e) => setPlazoMeses(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#475569' }}>
            Tasa Anual (%)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={tnaPorcentaje}
            onChange={(e) => setTnaPorcentaje(Number(e.target.value))}
            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#475569' }}>
            IVA s/Int (%)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={ivaPorcentaje}
            onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', boxSizing: 'border-box' }}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={simulando}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: simulando ? 'not-allowed' : 'pointer',
          boxShadow: '0 1px 2px 0 rgba(37, 99, 235, 0.2)'
        }}
        onMouseEnter={(e) => { if (!simulando) e.currentTarget.style.background = '#1d4ed8'; }}
        onMouseLeave={(e) => { if (!simulando) e.currentTarget.style.background = '#2563eb'; }}
      >
        <CalculatorIcon size={16} color="#ffffff" />
        <span>{simulando ? 'Calculando...' : 'Calcular Amortización'}</span>
      </button>
    </form>
  );
};
