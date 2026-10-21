import React, { useState } from 'react';
import { Persona } from '../../types/persona';
import { PlanAmortizacion, SimulacionPayload } from '../../types/simulacion';
import { Prestamo } from '../../types/prestamo';
import { Modal } from '../common/Modal';
import { formatMoney, formatPct } from '../../utils/formatters';
import { otorgarPrestamo } from '../../services/api/prestamosApi';
import { AlertTriangleIcon, CheckCircleIcon } from '../common/Icons';

interface OtorgarPrestamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  payload: SimulacionPayload | null;
  plan: PlanAmortizacion | null;
  onOtorgado: (p: Prestamo) => void;
}

export const OtorgarPrestamoModal: React.FC<OtorgarPrestamoModalProps> = ({
  isOpen,
  onClose,
  persona,
  payload,
  plan,
  onOtorgado
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [otorgando, setOtorgando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !payload || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persona) {
      setError('Debes tener un socio seleccionado para otorgar un préstamo.');
      return;
    }

    setOtorgando(true);
    setError(null);

    try {
      const nombreSocio = `${persona.apellido} ${persona.nombre}`.trim();
      const nuevo = await otorgarPrestamo({
        persona_id: persona.idPersona,
        persona_nombre: nombreSocio,
        persona_doc: persona.numeroDoc || undefined,
        monto_solicitado_centavos: payload.monto_centavos,
        plazo_meses: payload.plazo_meses,
        tna_pactada: payload.tna,
        alicuota_iva: payload.alicuota_iva,
        linea_id: payload.linea_id || undefined,
        motor_id: payload.motor_id || undefined,
        fecha_primer_vencimiento: payload.fecha_primer_vencimiento || undefined,
        observaciones: observaciones.trim() || undefined
      });

      onOtorgado(nuevo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al otorgar préstamo');
    } finally {
      setOtorgando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar y Otorgar Préstamo Oficial"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Ficha del Socio Destinatario */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Titular del Préstamo (Socio CoopYa)
          </div>

          {persona ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                  {persona.apellido} {persona.nombre}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  DNI: <strong>{persona.numeroDoc}</strong> • IdPersona: <strong>{persona.idPersona}</strong>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, background: '#dcfce7', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                <CheckCircleIcon size={14} /> Socio Verificado
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <AlertTriangleIcon size={18} />
              <span>No hay socio seleccionado. Regresá a la pestaña "Buscar Personas" para asociar un socio.</span>
            </div>
          )}
        </div>

        {/* Condiciones de la Simulación a Instrumentar */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            Condiciones Financieras de Amortización
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Capital a Desembolsar:</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                {formatMoney(plan.monto_solicitado_centavos)}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b' }}>Plazo Acordado:</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>
                {plan.plazo_meses} cuotas mensuales
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b' }}>Tasa Nominal Anual (TNA):</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {formatPct(plan.tasa_anual)}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b' }}>Modalidad / Fórmula:</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {plan.convencion_tasa}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b' }}>Total a Devolver (con IVA):</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                {formatMoney(plan.total_a_pagar_centavos)}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b' }}>Primer Vencimiento:</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {plan.cronograma[0]?.fecha_vencimiento
                  ? new Date(plan.cronograma[0].fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')
                  : '30 días desde otorgamiento'}
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Observaciones o Referencia del Legajo (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Ej: Destino del préstamo, verificación telefónica efectuada, sucursal..."
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={otorgando || !persona}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: persona ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#94a3b8',
              color: '#ffffff',
              fontWeight: 600,
              cursor: (otorgando || !persona) ? 'not-allowed' : 'pointer',
              boxShadow: persona ? '0 2px 4px rgba(22, 163, 74, 0.25)' : 'none'
            }}
          >
            {otorgando ? 'Instrumentando...' : 'Confirmar y Otorgar Préstamo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
