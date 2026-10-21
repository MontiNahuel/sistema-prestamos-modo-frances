import React, { useEffect, useState } from 'react';
import { Persona, CuentaCorrienteResumen } from '../../types/persona';
import { Prestamo } from '../../types/prestamo';
import { getPrestamos } from '../../services/api/prestamosApi';
import { formatPesos, formatMoney } from '../../utils/formatters';
import { CheckCircleIcon, AlertTriangleIcon, CreditCardIcon, ArrowRightIcon, FileTextIcon } from '../common/Icons';

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
  const [prestamosSocio, setPrestamosSocio] = useState<Prestamo[]>([]);

  useEffect(() => {
    if (persona?.idPersona) {
      getPrestamos({ persona_id: persona.idPersona })
        .then(setPrestamosSocio)
        .catch(() => setPrestamosSocio([]));
    } else {
      setPrestamosSocio([]);
    }
  }, [persona]);
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      position: 'sticky',
      top: '5rem'
    }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.05em' }}>
            Ficha del Socio
          </span>
          <span style={{
            fontSize: '0.75rem',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            IdPersona: #{persona.idPersona}
          </span>
        </div>
        <h3 style={{ margin: '0.25rem 0 0.35rem', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
          {persona.apellido} {persona.nombre}
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
          Socio N° {persona.nroSocio || '—'} · DNI {persona.numeroDoc} · CUIL {persona.cuil}
        </p>
      </div>

      {/* Resumen de Cuenta Corriente */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
          Estado Financiero (CoopYa):
        </div>
        {cargandoCc ? (
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
            Consultando cuenta corriente...
          </div>
        ) : ccResumen ? (
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Saldo Deudor:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                {formatPesos(ccResumen.totales.saldo)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Situación Crediticia:</span>
              {ccResumen.totales.algunaConMora ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca'
                }}>
                  <AlertTriangleIcon size={14} color="#b91c1c" />
                  REGISTRA MORA
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}>
                  <CheckCircleIcon size={14} color="#15803d" />
                  SOCIO AL DÍA
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No se pudo obtener el resumen.</div>
        )}
      </div>

      {/* Cuentas / CBU para Desembolso */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
          <CreditCardIcon size={15} color="#64748b" />
          <span>CBU / Medios de Pago:</span>
        </div>
        {persona.mediosDePago && persona.mediosDePago.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {persona.mediosDePago.map((m) => (
              <div key={m.id} style={{ background: '#f8fafc', padding: '0.625rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.valor}</div>
                <div style={{ color: '#64748b', fontSize: '0.725rem', marginTop: '0.15rem' }}>
                  {m.predeterminado ? '★ CBU Principal' : 'Secundario'} {m.banco ? `· ${m.banco}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No registra CBU bancario.
          </div>
        )}
      </div>

      {/* Préstamos en Sistema Propio */}
      <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
            <FileTextIcon size={15} color="#2563eb" />
            <span>Préstamos en Sistema:</span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: prestamosSocio.length > 0 ? '#1d4ed8' : '#64748b' }}>
            {prestamosSocio.length} operaciones
          </span>
        </div>
        {prestamosSocio.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Último: {prestamosSocio[0].linea_snapshot?.linea_nombre || 'Sin línea'} ({formatMoney(prestamosSocio[0].monto_solicitado_centavos)})
          </div>
        )}
      </div>

      <button
        onClick={() => onSimularParaSocio(persona)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          background: '#16a34a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.875rem',
          boxShadow: '0 1px 2px 0 rgba(22, 163, 74, 0.2)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#15803d'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#16a34a'; }}
      >
        <span>Simular Préstamo</span>
        <ArrowRightIcon size={16} color="#ffffff" />
      </button>
    </div>
  );
};
