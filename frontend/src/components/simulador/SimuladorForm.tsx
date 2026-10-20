import React, { useEffect, useState } from 'react';
import { LineaPrestamo } from '../../types/linea';
import { Persona } from '../../types/persona';
import { SimulacionPayload } from '../../types/simulacion';
import { getLineas } from '../../services/api/lineasApi';
import { formatMoney } from '../../utils/formatters';

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
    <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', color: '#111827' }}>
        Parámetros de Simulación
      </h3>

      {personaSeleccionada && (
        <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Socio Destinatario:</div>
          <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>
            {personaSeleccionada.apellido} {personaSeleccionada.nombre} (#{personaSeleccionada.idPersona})
          </div>
        </div>
      )}

      {/* Selector de Línea de Crédito */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
          Línea de Crédito (Plan)
        </label>
        <select
          value={selectedLineaId}
          onChange={(e) => handleLineaChange(e.target.value ? Number(e.target.value) : '')}
          style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fff' }}
        >
          <option value="">Personalizado / Sin Línea</option>
          {lineas.map(l => (
            <option key={l.id} value={l.id}>
              {l.nombre} ({l.tipo_tasa} {Number(l.tasa_default) * 100}%)
            </option>
          ))}
        </select>
        {lineaActiva && (
          <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
            Fórmula: <strong>{lineaActiva.motor?.nombre || 'Francés'}</strong>
            <br />
            Límites: {formatMoney(lineaActiva.monto_minimo_centavos)} a {formatMoney(lineaActiva.monto_maximo_centavos)} ({lineaActiva.plazo_minimo_meses} a {lineaActiva.plazo_maximo_meses} cuotas)
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
          Monto Solicitado ($)
        </label>
        <input
          type="number"
          min="1000"
          step="100"
          value={montoPesos}
          onChange={(e) => setMontoPesos(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
          required
        />
        <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
          {montoPesos * 100} centavos
        </small>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
          Plazo (Meses)
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={plazoMeses}
          onChange={(e) => setPlazoMeses(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
          Tasa Anual (%)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={tnaPorcentaje}
          onChange={(e) => setTnaPorcentaje(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
          IVA sobre Interés (%)
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={ivaPorcentaje}
          onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
          style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
          required
        />
      </div>

      <button
        type="submit"
        disabled={simulando}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: simulando ? 'not-allowed' : 'pointer'
        }}
      >
        {simulando ? 'Calculando...' : 'Calcular Amortización'}
      </button>
    </form>
  );
};
