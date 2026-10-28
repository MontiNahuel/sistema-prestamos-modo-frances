import React, { useState } from 'react';
import { Persona } from '../../types/persona';
import { buscarPersonas } from '../../services/api/personasApi';
import { SearchIcon, UserIcon, XIcon, CheckCircleIcon } from '../common/Icons';

interface SocioSelectorProps {
  personaSeleccionada: Persona | null;
  onSeleccionarPersona: (persona: Persona | null) => void;
}

export const SocioSelector: React.FC<SocioSelectorProps> = ({
  personaSeleccionada,
  onSeleccionarPersona
}) => {
  const [query, setQuery] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const texto = query.trim();
    if (!texto) return;

    setBuscando(true);
    setError(null);
    setBusquedaRealizada(true);

    try {
      const esDoc = /^\d+$/.test(texto);
      const params = esDoc ? { documento: texto } : { nombreApellido: texto };
      const data = await buscarPersonas(params);
      setResultados(data);
    } catch (err: any) {
      setError(err.message || 'Error al buscar socios');
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  const handleSeleccionar = (p: Persona) => {
    onSeleccionarPersona(p);
    setResultados([]);
    setQuery('');
    setBusquedaRealizada(false);
  };

  if (personaSeleccionada) {
    return (
      <div className="bg-[#eff6ff] p-3 rounded-lg mb-5 [border:1px_solid_#bfdbfe] relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center">
              <CheckCircleIcon size={18} color="#1d4ed8" />
            </div>
            <div>
              <div className="text-[0.7rem] text-[#1d4ed8] font-bold uppercase tracking-wider">
                Socio Asignado
              </div>
              <div className="font-bold text-[#1e3a8a] text-[0.925rem]">
                {personaSeleccionada.apellido} {personaSeleccionada.nombre}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSeleccionarPersona(null)}
            className="text-[0.75rem] text-[#64748b] hover:text-[#ef4444] px-2 py-1 rounded bg-white [border:1px_solid_#cbd5e1] hover:[border:1px_solid_#fca5a5] cursor-pointer font-medium"
            title="Quitar socio"
          >
            Quitar
          </button>
        </div>
        <div className="text-[0.775rem] text-[#475569] mt-2 flex gap-3 flex-wrap">
          <span>
            <strong>DNI:</strong> {personaSeleccionada.numeroDoc}
          </span>
          {personaSeleccionada.cuil && (
            <span>
              <strong>CUIL:</strong> {personaSeleccionada.cuil}
            </span>
          )}
          <span>
            <strong>Socio:</strong> #{personaSeleccionada.nroSocio || personaSeleccionada.idPersona}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] p-3.5 rounded-lg mb-5 [border:1px_solid_#e2e8f0]">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[0.8rem] font-bold text-[#334155] flex items-center gap-1.5">
          <UserIcon size={15} color="#2563eb" />
          <span>Socio Titular (opcional para simular)</span>
        </label>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar(e)}
            placeholder="Buscar por DNI o Apellido..."
            className="w-full p-[0.45rem_0.65rem] text-[0.825rem] rounded-lg [border:1px_solid_#cbd5e1] bg-white box-border"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResultados([]);
                setBusquedaRealizada(false);
              }}
              className="absolute right-2 top-2 text-[#94a3b8] hover:text-[#475569] cursor-pointer [border:none] bg-transparent p-0"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleBuscar()}
          disabled={buscando || !query.trim()}
          className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg text-[0.8rem] font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed [border:none]"
        >
          <SearchIcon size={14} color="#ffffff" />
          <span>{buscando ? 'Buscando...' : 'Buscar'}</span>
        </button>
      </div>

      {error && <div className="text-[0.75rem] text-[#dc2626] mt-2 font-medium">{error}</div>}

      {busquedaRealizada && !buscando && resultados.length === 0 && (
        <div className="text-[0.75rem] text-[#64748b] mt-2">No se encontraron socios con "{query}".</div>
      )}

      {resultados.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto bg-white rounded-lg [border:1px_solid_#cbd5e1] shadow-sm divide-y divide-[#f1f5f9]">
          {resultados.map((p) => (
            <div
              key={p.idPersona}
              onClick={() => handleSeleccionar(p)}
              className="p-2 hover:bg-[#eff6ff] cursor-pointer flex justify-between items-center text-[0.8rem]"
            >
              <div>
                <div className="font-semibold text-[#1e293b]">
                  {p.apellido} {p.nombre}
                </div>
                <div className="text-[0.725rem] text-[#64748b]">
                  DNI: {p.numeroDoc} · Socio #{p.nroSocio || p.idPersona}
                </div>
              </div>
              <span className="text-[0.725rem] font-bold text-[#2563eb] bg-[#dbeafe] px-2 py-0.5 rounded">
                Elegir
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};