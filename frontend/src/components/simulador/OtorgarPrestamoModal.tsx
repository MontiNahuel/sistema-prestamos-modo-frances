import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Persona, PersonaBusquedaParams } from '../../types/persona';
import { PlanAmortizacion, SimulacionPayload } from '../../types/simulacion';
import { Prestamo } from '../../types/prestamo';
import { Modal } from '../common/Modal';
import { formatMoney, formatPct } from '../../utils/formatters';
import { otorgarPrestamo } from '../../services/api/prestamosApi';
import { buscarPersonas } from '../../services/api/personasApi';
import { PersonasBuscador } from '../personas/PersonasBuscador';
import { PersonasTabla } from '../personas/PersonasTabla';
import { CheckCircleIcon } from '../common/Icons';

interface OtorgarPrestamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  onSeleccionarPersona: (persona: Persona) => void;
  payload: SimulacionPayload | null;
  plan: PlanAmortizacion | null;
  onOtorgado: (p: Prestamo) => void;
}

export const OtorgarPrestamoModal: React.FC<OtorgarPrestamoModalProps> = ({
  isOpen,
  onClose,
  persona,
  onSeleccionarPersona,
  payload,
  plan,
  onOtorgado
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [otorgando, setOtorgando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const revisionBusqueda = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      revisionBusqueda.current += 1;
      setBuscadorAbierto(false);
      setResultados([]);
      setBuscando(false);
      setBusquedaRealizada(false);
      setErrorBusqueda(null);
      setError(null);
    }
  }, [isOpen]);

  const handleBuscarPersona = async (params: PersonaBusquedaParams) => {
    const revision = ++revisionBusqueda.current;
    setBuscando(true);
    setErrorBusqueda(null);
    setBusquedaRealizada(false);
    setResultados([]);
    try {
      const personas = await buscarPersonas(params);
      if (revision === revisionBusqueda.current) {
        setResultados(personas);
        setBusquedaRealizada(true);
      }
    } catch (err: any) {
      if (revision === revisionBusqueda.current) {
        setErrorBusqueda(err.message || 'No se pudo buscar personas.');
      }
    } finally {
      if (revision === revisionBusqueda.current) setBuscando(false);
    }
  };

  const seleccionarPersona = (seleccionada: Persona) => {
    revisionBusqueda.current += 1;
    setBuscando(false);
    setBuscadorAbierto(false);
    setResultados([]);
    setBusquedaRealizada(false);
    setErrorBusqueda(null);
    setError(null);
    onSeleccionarPersona(seleccionada);
  };

  const cbuPredeterminado = useMemo(() => {
    if (!persona?.mediosDePago?.length) return '';
    const p = persona.mediosDePago.find(m => m.predeterminado && m.valor);
    return p ? p.valor : (persona.mediosDePago[0]?.valor || '');
  }, [persona]);

  if (!isOpen || !payload || !plan) return null;

  const primerVencimiento =
    plan.cronograma[0]?.fecha_vencimiento || payload.fecha_primer_vencimiento || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otorgando || buscadorAbierto) return;
    if (!persona) {
      setError('Debes tener un socio seleccionado para otorgar un préstamo.');
      return;
    }

    setOtorgando(true);
    setError(null);

    try {
      const nombreSocio = `${persona.apellido} ${persona.nombre}`.trim();
      const nuevo = await otorgarPrestamo({
        persona_id: persona.idPersona,
        persona_nombre: nombreSocio,
        persona_doc: persona.numeroDoc || undefined,
        cbu: cbuPredeterminado || undefined,
        monto_solicitado_centavos: payload.monto_centavos,
        plazo_meses: payload.plazo_meses,
        tna_pactada: payload.tna,
        alicuota_iva: payload.alicuota_iva,
        linea_id: payload.linea_id || undefined,
        motor_id: payload.motor_id || undefined,
        fecha_primer_vencimiento: payload.fecha_primer_vencimiento || undefined,
        observaciones: observaciones.trim() || undefined
      });

      onOtorgado(nuevo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al otorgar préstamo');
    } finally {
      setOtorgando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar y Otorgar Préstamo Oficial"
      maxWidth="620px"
    >
      <>
        {error && (
          <div className="mb-5 p-[0.85rem_1rem] bg-[#fee2e2] text-[#991b1b] rounded-lg [border:1px_solid_#fecaca] text-[0.875rem]">
            {error}
          </div>
        )}

        {/* Ficha del Socio Destinatario */}
        <div className="bg-[#f8fafc] p-4 rounded-[10px] [border:1px_solid_#e2e8f0] mb-5">
          <div className="text-[0.75rem] font-bold text-[#475569] uppercase tracking-[0.04em] mb-2">
            Titular del Préstamo (Socio CoopYa)
          </div>

          {persona ? (
            <div>
              <div className="[display:flex] [justify-content:space-between] [align-items:center]">
                <div>
                  <div className="[font-weight:700] [font-size:1.05rem] [color:#0f172a]">
                    {persona.apellido} {persona.nombre}
                  </div>
                  <div className="[color:#64748b] [font-size:0.85rem] [margin-top:0.15rem]">
                    DNI: <strong>{persona.numeroDoc}</strong> • IdPersona: <strong>{persona.idPersona}</strong>
                  </div>
                </div>
                <div className="[display:inline-flex] [align-items:center] [gap:0.35rem] [color:#16a34a] [font-size:0.8rem] [font-weight:600] [background:#dcfce7] [padding:0.25rem_0.6rem] [border-radius:6px]">
                  <CheckCircleIcon size={14} /> Socio Verificado
                </div>
              </div>

              {cbuPredeterminado ? (
                <div className="[margin-top:0.65rem] [padding:0.45rem_0.75rem] [background:#eff6ff] [border-radius:6px] [border:1px_solid_#bfdbfe] [font-size:0.8rem] [color:#1e40af] [display:flex] [align-items:center] [justify-content:space-between]">
                  <span>CBU para cobro: <strong>{cbuPredeterminado}</strong></span>
                  {cbuPredeterminado.startsWith('014') && (
                    <span className="[font-size:0.72rem] [font-weight:700] [color:#15803d] [background:#dcfce7] [padding:0.15rem_0.45rem] [border-radius:4px]">
                      BAPRO
                    </span>
                  )}
                </div>
              ) : (
                <div className="[margin-top:0.65rem] [padding:0.45rem_0.75rem] [background:#fffbeb] [border-radius:6px] [border:1px_solid_#fde68a] [font-size:0.8rem] [color:#92400e]">
                  ⚠️ Sin CBU registrado en el padrón central.
                </div>
              )}
              <button
                type="button"
                disabled={otorgando}
                onClick={() => {
                  if (buscadorAbierto) {
                    revisionBusqueda.current += 1;
                    setResultados([]);
                    setBusquedaRealizada(false);
                    setBuscando(false);
                    setErrorBusqueda(null);
                  }
                  setBuscadorAbierto((abierto) => !abierto);
                }}
                className="mt-3 rounded-md border border-[#bfdbfe] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[#1d4ed8] cursor-pointer hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buscadorAbierto ? 'Cancelar búsqueda' : 'Cambiar titular'}
              </button>
            </div>
          ) : null}

          {(!persona || buscadorAbierto) && (
            <div className="mt-3">
              <p className="mb-3 text-[0.85rem] text-[#475569]">
                Buscá y seleccioná la persona titular del préstamo.
              </p>
              <PersonasBuscador onBuscar={handleBuscarPersona} buscando={buscando} />
              {errorBusqueda && (
                <div role="alert" className="mb-3 rounded-lg bg-[#fee2e2] p-3 text-[0.85rem] text-[#991b1b]">
                  {errorBusqueda}
                </div>
              )}
              {busquedaRealizada && resultados.length === 0 ? (
                <p role="status" className="text-[0.85rem] text-[#64748b]">
                  No se encontraron personas con esos datos.
                </p>
              ) : (buscando || resultados.length > 0) ? (
                <div className="max-h-[250px] overflow-auto">
                  <PersonasTabla
                    personas={resultados}
                    personaSeleccionada={persona}
                    onSeleccionar={seleccionarPersona}
                    buscando={buscando}
                    textoAccion="Seleccionar"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
        {/* Condiciones de la Simulación a Instrumentar */}
        <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-[10px] p-4 mb-5">
          <div className="text-[0.75rem] font-bold text-[#475569] uppercase tracking-[0.04em] mb-3">
            Condiciones Financieras de Amortización
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3 text-[0.875rem]">
            <div>
              <span className="text-[#64748b]">Capital a Desembolsar:</span>
              <div className="font-bold text-[1.1rem] text-[#0f172a]">
                {formatMoney(plan.monto_solicitado_centavos)}
              </div>
            </div>

            <div>
              <span className="text-[#64748b]">Plazo Acordado:</span>
              <div className="font-bold text-[1.1rem] text-[#2563eb]">
                {plan.plazo_meses} cuotas mensuales
              </div>
            </div>

            <div>
              <span className="text-[#64748b]">Tasa Nominal Anual (TNA):</span>
              <div className="font-semibold text-[#0f172a]">
                {formatPct(plan.tasa_anual)}
              </div>
            </div>

            <div>
              <span className="text-[#64748b]">Modalidad / Fórmula:</span>
              <div className="font-semibold text-[#0f172a]">
                {plan.convencion_tasa}
              </div>
            </div>

            <div>
              <span className="text-[#64748b]">
                Total a Devolver (con IVA):
              </span>
              <div className="font-bold text-[#0f172a]">
                {formatMoney(plan.total_a_pagar_centavos)}
              </div>
            </div>

            <div>
              <span className="text-[#64748b]">Primer Vencimiento:</span>
              <div className="font-semibold text-[#0f172a]">
                {primerVencimiento
                  ? new Date(`${primerVencimiento}T00:00:00`).toLocaleDateString('es-AR')
                  : 'Sin fecha informada'}
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="mb-6">
          <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
            Observaciones o Referencia del Legajo (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Ej: Destino del préstamo, verificación telefónica efectuada, sucursal..."
            className="w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border [resize:vertical]"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-3 [border-top:1px_solid_#f1f5f9]">
          <button
            type="button"
            onClick={onClose}
            className="p-[0.6rem_1.1rem] rounded-lg [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#475569] cursor-pointer font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={otorgando || !persona || buscadorAbierto}
            className={[
              'inline-flex items-center gap-2 p-[0.6rem_1.4rem] rounded-lg [border:none]',
              persona
                ? '[background:linear-gradient(135deg,_#16a34a_0%,_#15803d_100%)]'
                : 'bg-[#94a3b8]',
              'text-[#ffffff] font-semibold',
              otorgando || !persona || buscadorAbierto ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              persona
                ? 'shadow-[0_2px_4px_rgba(22,_163,_74,_0.25)]'
                : 'shadow-[none]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {otorgando ? 'Instrumentando...' : 'Confirmar y Otorgar Préstamo'}
          </button>
        </div>
      </form>
      </>
    </Modal>
  );
};
