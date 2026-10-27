import React from 'react';
import { PresentacionBnaArchivoItem } from '../../types/presentacionesBna';

interface TablaHistorialBnaProps {
  archivos: PresentacionBnaArchivoItem[];
  onDescargar: (id: number, nombre: string) => void;
  onVerDetalles: (arch: PresentacionBnaArchivoItem) => void;
  onSubirRespuesta: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TablaHistorialBna: React.FC<TablaHistorialBnaProps> = ({
  archivos,
  onDescargar,
  onVerDetalles,
  onSubirRespuesta,
}) => {
  return (
    <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem' }}>Lote / Archivo</th>
            <th style={{ padding: '0.75rem 1rem' }}>Fecha Generación</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Registros</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Estado</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {archivos.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No se generaron lotes de presentación BNA aún.
              </td>
            </tr>
          ) : (
            archivos.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <strong style={{ color: '#0f172a' }}>{a.nombre_archivo}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Lote #{a.nro_archivo}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{new Date(a.fecha_generacion).toLocaleString('es-AR')}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{a.total_registros}</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                  ${a.total_monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: a.estado === 'RENDIDO' ? '#ecfdf5' : '#eff6ff',
                      color: a.estado === 'RENDIDO' ? '#059669' : '#2563eb',
                    }}
                  >
                    {a.estado}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onDescargar(a.id, a.nombre_archivo)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Descargar TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerDetalles(a)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver Detalles
                    </button>
                    <label
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '4px',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Subir Respuesta
                      <input
                        type="file"
                        accept=".txt"
                        style={{ display: 'none' }}
                        onChange={(e) => onSubirRespuesta(a.id, e)}
                      />
                    </label>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
