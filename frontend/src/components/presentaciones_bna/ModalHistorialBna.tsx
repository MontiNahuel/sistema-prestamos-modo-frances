import React from 'react';
import { PresentacionBnaAuditoriaItem } from '../../types/presentacionesBna';

interface ModalHistorialBnaProps {
  abierto: boolean;
  onCerrar: () => void;
  nroArchivo: number;
  nombreArchivo: string;
  detalles: PresentacionBnaAuditoriaItem[];
  cargando: boolean;
}

export const ModalHistorialBna: React.FC<ModalHistorialBnaProps> = ({
  abierto,
  onCerrar,
  nroArchivo,
  nombreArchivo,
  detalles,
  cargando,
}) => {
  if (!abierto) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
              Detalle de Auditoría - Archivo N.º {nroArchivo}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{nombreArchivo}</span>
          </div>
          <button
            onClick={onCerrar}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8' }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando registros...</div>
          ) : detalles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No hay registros de auditoría para este archivo.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Op</th>
                  <th style={{ padding: '0.5rem' }}>Socio / Id</th>
                  <th style={{ padding: '0.5rem' }}>Sucursal</th>
                  <th style={{ padding: '0.5rem' }}>Cuenta</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto</th>
                  <th style={{ padding: '0.5rem' }}>Concepto</th>
                  <th style={{ padding: '0.5rem' }}>Estado Banco</th>
                  <th style={{ padding: '0.5rem' }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((d) => {
                  const esOk = d.codigo_respuesta === '0';
                  const tieneResp = d.codigo_respuesta !== null && d.codigo_respuesta !== undefined;
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{d.numero_operacion}</td>
                      <td style={{ padding: '0.5rem' }}>{d.socio_nombre || `#${d.id_persona}`}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{d.sucursal_cuenta_cliente}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{d.nro_cuenta_cliente}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>${d.monto_pesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{d.concepto_debito}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {!tieneResp ? (
                          <span style={{ color: '#64748b' }}>Pendiente</span>
                        ) : esOk ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>0 - Cobrado</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{d.codigo_respuesta} - Rechazo</span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.78rem' }}>{d.descripcion_rechazo || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onCerrar}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
