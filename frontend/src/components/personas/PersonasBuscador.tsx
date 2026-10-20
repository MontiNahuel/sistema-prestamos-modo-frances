import React, { useState } from 'react';
import { PersonaBusquedaParams } from '../../types/persona';

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
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}
    >
      <input
        type="text"
        placeholder="Apellido o Nombre..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{ flex: 1, minWidth: '180px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
      />
      <input
        type="text"
        placeholder="N° Documento (DNI)..."
        value={doc}
        onChange={(e) => setDoc(e.target.value)}
        style={{ width: '180px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
      />
      <input
        type="number"
        placeholder="IdPersona..."
        value={idPersona}
        onChange={(e) => setIdPersona(e.target.value)}
        style={{ width: '130px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
      />
      <button
        type="submit"
        disabled={buscando}
        style={{
          padding: '0.625rem 1.5rem',
          background: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: buscando ? 'not-allowed' : 'pointer'
        }}
      >
        {buscando ? 'Buscando...' : 'Buscar'}
      </button>
    </form>
  );
};
