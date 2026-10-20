import React from 'react';
import { Persona } from '../../types/persona';
import { Badge } from '../common/Badge';

interface PersonasTablaProps {
  personas: Persona[];
  personaSeleccionada: Persona | null;
  onSeleccionar: (p: Persona) => void;
  buscando: boolean;
}

export const PersonasTabla: React.FC<PersonasTablaProps> = ({
  personas,
  personaSeleccionada,
  onSeleccionar,
  buscando
}) => {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
          <tr>
            <th style={{ padding: '0.75rem 1rem' }}>IdPersona</th>
            <th style={{ padding: '0.75rem 1rem' }}>N° Socio</th>
            <th style={{ padding: '0.75rem 1rem' }}>Apellido y Nombre</th>
            <th style={{ padding: '0.75rem 1rem' }}>Documento</th>
            <th style={{ padding: '0.75rem 1rem' }}>CUIL</th>
            <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {personas.length > 0 ? (
            personas.map((p) => {
              const esSeleccionado = personaSeleccionada?.idPersona === p.idPersona;
              return (
                <tr
                  key={p.idPersona}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: esSeleccionado ? '#eff6ff' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                    {p.idPersona}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    {p.nroSocio ? `#${p.nroSocio}` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#111827' }}>
                    {p.apellido} {p.nombre}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.numeroDoc}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{p.cuil}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge variant={p.estadoNombre === 'Activo' ? 'success' : 'danger'}>
                      {p.estadoNombre}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => onSeleccionar(p)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #2563eb',
                        background: esSeleccionado ? '#2563eb' : '#ffffff',
                        color: esSeleccionado ? '#ffffff' : '#2563eb',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {esSeleccionado ? 'Seleccionado' : 'Ver Ficha'}
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                {buscando ? 'Buscando socios...' : 'Ingresá un término de búsqueda para ver personas.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
