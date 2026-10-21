import React from 'react';
import { Persona } from '../../types/persona';
import { Badge } from '../common/Badge';
import { UserIcon } from '../common/Icons';

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
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <tr>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IdPersona</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>N° Socio</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Apellido y Nombre</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUIL</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
            <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Acción</th>
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
                    borderBottom: '1px solid #f1f5f9',
                    background: esSeleccionado ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSeleccionar(p)}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                    #{p.idPersona}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155' }}>
                    {p.nroSocio ? `${p.nroSocio}` : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    {p.apellido} {p.nombre}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{p.numeroDoc}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{p.cuil}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Badge variant={p.estadoNombre === 'Activo' ? 'success' : 'danger'}>
                      {p.estadoNombre}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionar(p);
                      }}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: esSeleccionado ? '#2563eb' : '#cbd5e1',
                        background: esSeleccionado ? '#2563eb' : '#ffffff',
                        color: esSeleccionado ? '#ffffff' : '#334155',
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
              <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <UserIcon size={32} color="#cbd5e1" />
                  <div>
                    {buscando ? 'Consultando socios en CoopYa...' : 'Ingresá un término de búsqueda para ver personas.'}
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
