import React, { useState } from 'react';
import { PersonaBusquedaParams } from '../../types/persona';
import { SearchIcon } from '../common/Icons';

interface PersonasBuscadorProps {
  onBuscar: (params: PersonaBusquedaParams) => void;
  buscando: boolean;
}

export const PersonasBuscador: React.FC<PersonasBuscadorProps> = ({
  onBuscar,
  buscando
}) => {
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
      className="bg-[#ffffff] p-[1.25rem_1.5rem] rounded-xl [border:1px_solid_#e2e8f0] flex items-center gap-4 mb-6 flex-wrap shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)]"
    >
      <div className="flex-[2] min-w-[220px] relative">
        <label className="block text-[0.75rem] font-semibold text-[#64748b] mb-1">
          Apellido o Nombre
        </label>
        <input
          type="text"
          placeholder="Ej: Gomez, Maria..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full p-[0.625rem_0.875rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.9rem] text-[#0f172a] bg-[#ffffff] box-border"
        />
      </div>

      <div className="flex-[1] min-w-[160px]">
        <label className="block text-[0.75rem] font-semibold text-[#64748b] mb-1">
          N° Documento (DNI)
        </label>
        <input
          type="text"
          placeholder="Ej: 30123456"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          className="w-full p-[0.625rem_0.875rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.9rem] text-[#0f172a] bg-[#ffffff] box-border"
        />
      </div>

      <div className="w-[130px]">
        <label className="block text-[0.75rem] font-semibold text-[#64748b] mb-1">
          IdPersona
        </label>
        <input
          type="number"
          placeholder="Ej: 309"
          value={idPersona}
          onChange={(e) => setIdPersona(e.target.value)}
          className="w-full p-[0.625rem_0.875rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.9rem] text-[#0f172a] bg-[#ffffff] box-border"
        />
      </div>

      <div className="pt-5">
        <button
          type="submit"
          disabled={buscando}
          className={[
            'flex items-center gap-2 p-[0.625rem_1.5rem] bg-[#2563eb] text-[#ffffff] [border:none] rounded-lg font-semibold text-[0.9rem]',
            buscando ? 'cursor-not-allowed' : 'cursor-pointer',
            'shadow-[0_1px_2px_0_rgba(37,_99,_235,_0.2)] enabled:hover:bg-[#1d4ed8]'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <SearchIcon size={16} color="#ffffff" />
          <span>{buscando ? 'Buscando...' : 'Buscar Socios'}</span>
        </button>
      </div>
    </form>
  );
};
