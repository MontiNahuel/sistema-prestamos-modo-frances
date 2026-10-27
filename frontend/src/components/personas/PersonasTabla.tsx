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
    <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)]">
      <table className="w-full border-collapse text-left text-[0.875rem]">
        <thead className="bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0]">
          <tr>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              IdPersona
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              N° Socio
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              Apellido y Nombre
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              Documento
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              CUIL
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em]">
              Estado
            </th>
            <th className="p-[0.85rem_1rem] text-[#475569] font-semibold text-[0.75rem] uppercase tracking-[0.05em] text-center">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {personas.length > 0 ? (
            personas.map((p) => {
              const esSeleccionado =
                personaSeleccionada?.idPersona === p.idPersona;
              return (
                <tr
                  key={p.idPersona}
                  className={[
                    '[border-bottom:1px_solid_#f1f5f9]',
                    esSeleccionado ? 'bg-[#eff6ff]' : 'bg-[#ffffff]',
                    'cursor-pointer'
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSeleccionar(p)}
                >
                  <td className="p-[0.85rem_1rem] font-bold text-[#2563eb]">
                    #{p.idPersona}
                  </td>
                  <td className="p-[0.85rem_1rem] font-semibold text-[#334155]">
                    {p.nroSocio ? `${p.nroSocio}` : '—'}
                  </td>
                  <td className="p-[0.85rem_1rem] font-semibold text-[#0f172a]">
                    {p.apellido} {p.nombre}
                  </td>
                  <td className="p-[0.85rem_1rem] text-[#475569]">
                    {p.numeroDoc}
                  </td>
                  <td className="p-[0.85rem_1rem] text-[#64748b]">{p.cuil}</td>
                  <td className="p-[0.85rem_1rem]">
                    <Badge
                      variant={
                        p.estadoNombre === 'Activo' ? 'success' : 'danger'
                      }
                    >
                      {p.estadoNombre}
                    </Badge>
                  </td>
                  <td className="p-[0.85rem_1rem] text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionar(p);
                      }}
                      className={[
                        'p-[0.4rem_0.85rem] rounded-md [border:1px_solid]',
                        esSeleccionado
                          ? '[border-color:#2563eb]'
                          : '[border-color:#cbd5e1]',
                        esSeleccionado ? 'bg-[#2563eb]' : 'bg-[#ffffff]',
                        esSeleccionado ? 'text-[#ffffff]' : 'text-[#334155]',
                        'font-semibold cursor-pointer text-[0.8rem]'
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {esSeleccionado ? 'Seleccionado' : 'Ver Ficha'}
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={7}
                className="p-[3.5rem_1rem] text-center text-[#94a3b8]"
              >
                <div className="flex flex-col items-center gap-2">
                  <UserIcon size={32} color="#cbd5e1" />
                  <div>
                    {buscando
                      ? 'Consultando socios en CoopYa...'
                      : 'Ingresá un término de búsqueda para ver personas.'}
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
