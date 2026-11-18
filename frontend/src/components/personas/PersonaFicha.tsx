import React, { useEffect, useState } from 'react';
import { Persona, CuentaCorrienteResumen } from '../../types/persona';
import { Prestamo } from '../../types/prestamo';
import { SocioCuotaSocialEstado } from '../../types/cuotaSocial';
import { getPrestamos } from '../../services/api/prestamosApi';
import {
  activarCuotaSocialSocio,
  bajaCuotaSocialSocio,
  getEstadoCuotaSocialSocio,
} from '../../services/api/cuotasSocialesApi';
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
  defaultCuotaSocialPesos?: number;
}

export const PersonaFicha: React.FC<PersonaFichaProps> = ({
  persona,
  ccResumen,
  cargandoCc,
  onSimularParaSocio,
  defaultCuotaSocialPesos = 5500
}) => {
  const [prestamosSocio, setPrestamosSocio] = useState<Prestamo[]>([]);
  const [modalCcAbierto, setModalCcAbierto] = useState(false);
  const [cuotaSocialEstado, setCuotaSocialEstado] = useState<SocioCuotaSocialEstado | null>(null);
  const [procesandoCs, setProcesandoCs] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);

  useEffect(() => {
    if (persona?.idPersona) {
      getPrestamos({ persona_id: persona.idPersona })
        .then(setPrestamosSocio)
        .catch(() => setPrestamosSocio([]));
      getEstadoCuotaSocialSocio(persona.idPersona)
        .then((estado) => {
          setCuotaSocialEstado(estado);
          setCsError(null);
        })
        .catch(() => setCuotaSocialEstado(null));
    } else {
      setPrestamosSocio([]);
      setCuotaSocialEstado(null);
    }
  }, [persona]);

  const handleBajaCuotaSocial = async () => {
    if (!persona?.idPersona) return;
    if (
      !window.confirm(
        `¿Dar de baja la Cuota Social de ${persona.apellido} ${persona.nombre}? Se anularán los períodos pendientes aún no presentados.`
      )
    ) {
      return;
    }
    setProcesandoCs(true);
    setCsError(null);
    try {
      const actualizado = await bajaCuotaSocialSocio(persona.idPersona);
      setCuotaSocialEstado(actualizado);
    } catch (err: any) {
      setCsError(err.message || 'No se pudo dar de baja la Cuota Social');
    } finally {
      setProcesandoCs(false);
    }
  };

  const handleActivarCuotaSocial = async () => {
    if (!persona?.idPersona) return;
    const valorActual = cuotaSocialEstado?.valor_centavos
      ? cuotaSocialEstado.valor_centavos / 100
      : defaultCuotaSocialPesos;
    const ingresado = window.prompt('Importe mensual de Cuota Social ($):', String(valorActual));
    if (ingresado === null) return;
    const montoPesos = Number(ingresado);
    if (!Number.isFinite(montoPesos) || montoPesos <= 0) {
      setCsError('El importe debe ser mayor a cero.');
      return;
    }
    setProcesandoCs(true);
    setCsError(null);
    try {
      const actualizado = await activarCuotaSocialSocio(persona.idPersona, {
        valor_centavos: Math.round(montoPesos * 100),
      });
      setCuotaSocialEstado(actualizado);
    } catch (err: any) {
      setCsError(err.message || 'No se pudo activar la Cuota Social');
    } finally {
      setProcesandoCs(false);
    }
  };

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

      {/* Cuota Social Cooperativa */}
      {cuotaSocialEstado && (
        <div className="mb-5 bg-[#f8fafc] p-[0.75rem_1rem] rounded-lg [border:1px_solid_#e2e8f0]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.8rem] font-semibold text-[#334155]">
              Cuota Social Mensual:
            </span>
            <span
              className={`text-[0.72rem] font-bold px-2 py-0.5 rounded ${
                cuotaSocialEstado.activa
                  ? 'bg-[#dcfce7] text-[#15803d]'
                  : 'bg-[#f1f5f9] text-[#64748b]'
              }`}
            >
              {cuotaSocialEstado.activa ? 'ACTIVA' : 'INACTIVA'}
            </span>
          </div>
          <div className="text-[0.8rem] text-[#475569] mb-2">
            Valor actual:{' '}
            <strong className="text-[#0f172a]">
              {formatMoney(cuotaSocialEstado.valor_centavos)}
            </strong>{' '}
            · {cuotaSocialEstado.cuotas.filter((c) => c.estado !== 'ANULADA').length} períodos
          </div>
          {csError && (
            <div className="text-[0.75rem] text-[#b91c1c] mb-2">{csError}</div>
          )}
          {cuotaSocialEstado.activa ? (
            <button
              type="button"
              disabled={procesandoCs}
              onClick={handleBajaCuotaSocial}
              className="w-full p-[0.45rem_0.75rem] rounded-md [border:1px_solid_#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[0.75rem] font-semibold cursor-pointer disabled:opacity-60"
            >
              {procesandoCs ? 'Procesando...' : 'Dar de baja Cuota Social'}
            </button>
          ) : (
            <button
              type="button"
              disabled={procesandoCs}
              onClick={handleActivarCuotaSocial}
              className="w-full p-[0.45rem_0.75rem] rounded-md [border:1px_solid_#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] text-[0.75rem] font-semibold cursor-pointer disabled:opacity-60"
            >
              {procesandoCs ? 'Procesando...' : 'Activar Cuota Social'}
            </button>
          )}
        </div>
      )}

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
            Último: N° {prestamosSocio[0].numero_prestamo} ·{' '}
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
