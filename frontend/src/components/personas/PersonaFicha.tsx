import React, { useEffect, useState } from 'react';
import { Persona, CuentaCorrienteResumen } from '../../types/persona';
import { Prestamo } from '../../types/prestamo';
import { getPrestamos } from '../../services/api/prestamosApi';
import { formatPesos, formatMoney } from '../../utils/formatters';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  CreditCardIcon,
  ArrowRightIcon,
  FileTextIcon
} from '../common/Icons';
import { CuentaCorrienteModal } from './CuentaCorrienteModal';

interface PersonaFichaProps {
  persona: Persona;
  ccResumen: CuentaCorrienteResumen | null;
  cargandoCc: boolean;
  onSimularParaSocio: (p: Persona) => void;
}

export const PersonaFicha: React.FC<PersonaFichaProps> = ({
  persona,
  ccResumen,
  cargandoCc,
  onSimularParaSocio
}) => {
  const [prestamosSocio, setPrestamosSocio] = useState<Prestamo[]>([]);
  const [modalCcAbierto, setModalCcAbierto] = useState(false);

  useEffect(() => {
    if (persona?.idPersona) {
      getPrestamos({ persona_id: persona.idPersona })
        .then(setPrestamosSocio)
        .catch(() => setPrestamosSocio([]));
    } else {
      setPrestamosSocio([]);
    }
  }, [persona]);

  return (
    <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl p-6 shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)] sticky top-20">
      {/* Encabezado */}
      <div className="[border-bottom:1px_solid_#f1f5f9] pb-4 mb-5">
        <div className="flex justify-between items-center mb-[0.375rem]">
          <span className="text-[0.7rem] font-bold uppercase text-[#2563eb] tracking-[0.05em]">
            Ficha del Socio
          </span>
          <span className="text-[0.75rem] bg-[#eff6ff] text-[#1d4ed8] [border:1px_solid_#bfdbfe] p-[0.15rem_0.5rem] rounded-sm font-bold">
            IdPersona: #{persona.idPersona}
          </span>
        </div>
        <h3 className="m-[0.25rem_0_0.35rem] text-[1.2rem] text-[#0f172a] font-bold">
          {persona.apellido} {persona.nombre}
        </h3>
        <p className="m-0 text-[0.8rem] text-[#64748b]">
          Socio N° {persona.nroSocio || '—'} · DNI {persona.numeroDoc} · CUIL{' '}
          {persona.cuil}
        </p>
      </div>

      {/* Resumen de Cuenta Corriente */}
      <div className="mb-5">
        <div className="text-[0.8rem] font-semibold text-[#475569] mb-2">
          Estado Financiero (Cuenta Corriente):
        </div>
        {cargandoCc ? (
          <div className="p-4 text-center text-[0.85rem] text-[#64748b] bg-[#f8fafc] rounded-lg">
            Consultando cuenta corriente...
          </div>
        ) : ccResumen ? (
          <div className="bg-[#f8fafc] p-4 rounded-lg [border:1px_solid_#e2e8f0]">
            <div className="flex justify-between items-center mb-[0.625rem]">
              <span className="text-[0.85rem] text-[#64748b]">
                Saldo Deudor:
              </span>
              <span className="font-bold text-[#0f172a] text-[1rem]">
                {formatPesos(ccResumen.totales.saldo)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[0.85rem] text-[#64748b]">
                Situación Crediticia:
              </span>
              {ccResumen.totales.algunaConMora ? (
                <span className="inline-flex items-center gap-[0.3rem] p-[0.2rem_0.6rem] rounded-sm text-[0.75rem] font-bold bg-[#fef2f2] text-[#b91c1c] [border:1px_solid_#fecaca]">
                  <AlertTriangleIcon size={14} color="#b91c1c" />
                  REGISTRA MORA
                </span>
              ) : (
                <span className="inline-flex items-center gap-[0.3rem] p-[0.2rem_0.6rem] rounded-sm text-[0.75rem] font-bold bg-[#f0fdf4] text-[#15803d] [border:1px_solid_#bbf7d0]">
                  <CheckCircleIcon size={14} color="#15803d" />
                  SOCIO AL DÍA
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalCcAbierto(true)}
              className="w-full mt-3 p-2 rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#2563eb] text-[0.75rem] font-semibold cursor-pointer flex items-center justify-center gap-[0.4rem]"
            >
              <FileTextIcon size={14} color="#2563eb" />
              <span>Ver Cuenta Corriente Detallada</span>
            </button>
          </div>
        ) : (
          <div className="text-[0.8rem] text-[#94a3b8]">
            No se pudo obtener el resumen.
          </div>
        )}
      </div>

      {/* Cuentas / CBU para Desembolso */}
      <div className="mb-5">
        <div className="flex items-center gap-[0.4rem] text-[0.8rem] font-semibold text-[#475569] mb-2">
          <CreditCardIcon size={15} color="#64748b" />
          <span>CBU / Medios de Pago:</span>
        </div>
        {persona.mediosDePago && persona.mediosDePago.length > 0 ? (
          <div className="flex flex-col gap-2">
            {persona.mediosDePago.map((m) => (
              <div
                key={m.id}
                className="bg-[#f8fafc] p-[0.625rem_0.75rem] rounded-md text-[0.8rem] [border:1px_solid_#e2e8f0]"
              >
                <div className="font-semibold text-[#0f172a]">{m.valor}</div>
                <div className="text-[#64748b] text-[0.725rem] mt-[0.15rem]">
                  {m.predeterminado ? '★ CBU Principal' : 'Secundario'}{' '}
                  {m.banco ? `· ${m.banco}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[0.8rem] text-[#94a3b8] [font-style:italic]">
            No registra CBU bancario.
          </div>
        )}
      </div>

      {/* Préstamos en Sistema Propio */}
      <div className="mb-6 bg-[#f8fafc] p-[0.75rem_1rem] rounded-lg [border:1px_solid_#e2e8f0]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-[0.4rem] text-[0.8rem] font-semibold text-[#334155]">
            <FileTextIcon size={15} color="#2563eb" />
            <span>Préstamos en Sistema:</span>
          </div>
          <span
            className={[
              'text-[0.8rem] font-bold',
              prestamosSocio.length > 0 ? 'text-[#1d4ed8]' : 'text-[#64748b]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {prestamosSocio.length} operaciones
          </span>
        </div>
        {prestamosSocio.length > 0 && (
          <div className="text-[0.75rem] text-[#64748b] mt-[0.35rem]">
            Último:{' '}
            {prestamosSocio[0].linea_snapshot?.linea_nombre || 'Sin línea'} (
            {formatMoney(prestamosSocio[0].monto_solicitado_centavos)})
          </div>
        )}
      </div>

      <button
        onClick={() => onSimularParaSocio(persona)}
        className="w-full flex items-center justify-center gap-2 p-3 bg-[#16a34a] text-[#ffffff] [border:none] rounded-lg font-semibold cursor-pointer text-[0.875rem] shadow-[0_1px_2px_0_rgba(22,_163,_74,_0.2)] hover:bg-[#15803d]"
      >
        <span>Simular Préstamo</span>
        <ArrowRightIcon size={16} color="#ffffff" />
      </button>

      {/* Modal Detallado de Cuenta Corriente */}
      <CuentaCorrienteModal
        isOpen={modalCcAbierto}
        onClose={() => setModalCcAbierto(false)}
        cc={ccResumen}
      />
    </div>
  );
};
