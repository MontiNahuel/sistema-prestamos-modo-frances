import React from 'react';
import { Persona, CuentaCorrienteResumen } from '../../types/persona';
import { formatPesos } from '../../utils/formatters';

interface PersonaFichaProps {
  persona: Persona;
  ccResumen: CuentaCorrienteResumen | null;
  cargandoCc: boolean;
  onSimularParaSocio: (p: Persona) => void;
}

export const PersonaFicha: React.FC<PersonaFichaProps> = ({
  persona,
  ccResumen,
  cargandoCc,
  onSimularParaSocio
}) => {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#2563eb' }}>
            Ficha del Socio
          </span>
          <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
            ID Persona: {persona.idPersona}
          </span>
        </div>
        <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.25rem', color: '#111827' }}>
          {persona.apellido} {persona.nombre}
        </h3>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
          N° Socio: {persona.nroSocio || '-'} | DNI: {persona.numeroDoc} | CUIL: {persona.cuil}
        </p>
      </div>

      {/* Resumen de Cuenta Corriente */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
          Estado Crediticio (CoopYa):
        </div>
        {cargandoCc ? (
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Consultando cuenta corriente...</div>
        ) : ccResumen ? (
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saldo Deudor:</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>{formatPesos(ccResumen.totales.saldo)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Registra Mora:</span>
              <span style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: ccResumen.totales.algunaConMora ? '#fee2e2' : '#d1fae5',
                color: ccResumen.totales.algunaConMora ? '#991b1b' : '#065f46'
              }}>
                {ccResumen.totales.algunaConMora ? 'CON MORA' : 'AL DÍA'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No se pudo obtener el resumen.</div>
        )}
      </div>

      {/* Cuentas / CBU para Desembolso */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
          Medios de Pago / CBU:
        </div>
        {persona.mediosDePago && persona.mediosDePago.length > 0 ? (
          persona.mediosDePago.map((m) => (
            <div key={m.id} style={{ background: '#f9fafb', padding: '0.625rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.5rem', border: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{m.valor}</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                {m.predeterminado ? '★ Predeterminado' : 'Secundario'} {m.banco ? `(${m.banco})` : ''}
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No registra CBU / Cuentas.</div>
        )}
      </div>

      <button
        onClick={() => onSimularParaSocio(persona)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#15803d',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        Simular Préstamo para {persona.apellido}
      </button>
    </div>
  );
};
