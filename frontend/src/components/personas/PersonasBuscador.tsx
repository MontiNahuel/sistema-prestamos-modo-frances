import React, { useState } from 'react';
import { PersonaBusquedaParams } from '../../types/persona';
import { SearchIcon } from '../common/Icons';

interface PersonasBuscadorProps {
  onBuscar: (params: PersonaBusquedaParams) => void;
  buscando: boolean;
}

export const PersonasBuscador: React.FC<PersonasBuscadorProps> = ({ onBuscar, buscando }) => {
  const [texto, setTexto] = useState('');
  const [doc, setDoc] = useState('');
  const [idPersona, setIdPersona] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = idPersona.trim() ? parseInt(idPersona.trim(), 10) : null;
    onBuscar({
      nombreApellido: texto,
      documento: doc,
      idPersona: isNaN(idNum as number) ? null : idNum
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'
      }}
    >
      <div style={{ flex: '2', minWidth: '220px', position: 'relative' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
          Apellido o Nombre
        </label>
        <input
          type="text"
          placeholder="Ej: Gomez, Maria..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            color: '#0f172a',
            background: '#ffffff',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ flex: '1', minWidth: '160px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
          N° Documento (DNI)
        </label>
        <input
          type="text"
          placeholder="Ej: 30123456"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            color: '#0f172a',
            background: '#ffffff',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ width: '130px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
          IdPersona
        </label>
        <input
          type="number"
          placeholder="Ej: 309"
          value={idPersona}
          onChange={(e) => setIdPersona(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            color: '#0f172a',
            background: '#ffffff',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ paddingTop: '1.25rem' }}>
        <button
          type="submit"
          disabled={buscando}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: buscando ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px 0 rgba(37, 99, 235, 0.2)'
          }}
          onMouseEnter={(e) => {
            if (!buscando) e.currentTarget.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            if (!buscando) e.currentTarget.style.background = '#2563eb';
          }}
        >
          <SearchIcon size={16} color="#ffffff" />
          <span>{buscando ? 'Buscando...' : 'Buscar Socios'}</span>
        </button>
      </div>
    </form>
  );
};
