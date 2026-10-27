import React from 'react';
import { CuotaPresentableBnaItem } from '../../types/presentacionesBna';

interface TablaCuotasBnaProps {
  cuotas: CuotaPresentableBnaItem[];
  seleccionadas: Set<string>;
  onToggleSeleccion: (id: string) => void;
  onToggleTodos: () => void;
  loading: boolean;
}

export const TablaCuotasBna: React.FC<TablaCuotasBnaProps> = ({
  cuotas,
  seleccionadas,
  onToggleSeleccion,
  onToggleTodos,
  loading,
}) => {
  return (
    <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem', width: '36px' }}>
              <input
                type="checkbox"
                checked={cuotas.length > 0 && seleccionadas.size === cuotas.length}
                onChange={onToggleTodos}
              />
            </th>
            <th style={{ padding: '0.75rem 1rem' }}>Socio</th>
            <th style={{ padding: '0.75rem 1rem' }}>DNI</th>
            <th style={{ padding: '0.75rem 1rem' }}>Cuota</th>
            <th style={{ padding: '0.75rem 1rem' }}>Vencimiento</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Monto</th>
            <th style={{ padding: '0.75rem 1rem' }}>Sucursal BNA</th>
            <th style={{ padding: '0.75rem 1rem' }}>Cuenta BNA</th>
            <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {cuotas.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                {loading ? 'Buscando cuotas de préstamos BNA...' : 'No se encontraron cuotas pendientes para los filtros aplicados.'}
              </td>
            </tr>
          ) : (
            cuotas.map((c) => {
              const sel = seleccionadas.has(c.cuota_id);
              return (
                <tr
                  key={c.cuota_id}
                  onClick={() => onToggleSeleccion(c.cuota_id)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: sel ? '#f0fdf4' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.socio_nombre}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{c.socio_documento || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>N.º {c.numero_cuota}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{c.fecha_vencimiento || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                    ${c.monto_pesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{c.sucursal_bna || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{c.nro_cuenta_bna || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: c.estado === 'PENDIENTE' ? '#eff6ff' : '#f1f5f9',
                        color: c.estado === 'PENDIENTE' ? '#2563eb' : '#475569',
                      }}
                    >
                      {c.estado}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
