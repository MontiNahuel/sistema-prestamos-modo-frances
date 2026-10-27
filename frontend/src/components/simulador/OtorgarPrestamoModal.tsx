import React, { useState, useMemo } from 'react';
import { Persona } from '../../types/persona';
import { PlanAmortizacion, SimulacionPayload } from '../../types/simulacion';
import { Prestamo } from '../../types/prestamo';
import { Modal } from '../common/Modal';
import { formatMoney, formatPct } from '../../utils/formatters';
import { otorgarPrestamo } from '../../services/api/prestamosApi';
import { AlertTriangleIcon, CheckCircleIcon } from '../common/Icons';

interface OtorgarPrestamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  payload: SimulacionPayload | null;
  plan: PlanAmortizacion | null;
  onOtorgado: (p: Prestamo) => void;
}

export const OtorgarPrestamoModal: React.FC<OtorgarPrestamoModalProps> = ({
  isOpen,
  onClose,
  persona,
  payload,
  plan,
  onOtorgado
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [otorgando, setOtorgando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cbuPredeterminado = useMemo(() => {
    if (!persona?.mediosDePago?.length) return '';
    const p = persona.mediosDePago.find(m => m.predeterminado && m.valor);
    return p ? p.valor : (persona.mediosDePago[0]?.valor || '');
  }, [persona]);

  if (!isOpen || !payload || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <form onSubmit={handleSubmit}>
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
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#b45309] bg-[#fef3c7] p-3 rounded-lg text-[0.85rem]">
              <AlertTriangleIcon size={18} />
              <span>
                No hay socio seleccionado. Regresá a la pestaña "Buscar
                Personas" para asociar un socio.
              </span>
            </div>
          )}
        </div>

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
                {plan.cronograma[0]?.fecha_vencimiento
                  ? new Date(
                      plan.cronograma[0].fecha_vencimiento + 'T00:00:00'
                    ).toLocaleDateString('es-AR')
                  : '30 días desde otorgamiento'}
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
            disabled={otorgando || !persona}
            className={[
              'inline-flex items-center gap-2 p-[0.6rem_1.4rem] rounded-lg [border:none]',
              persona
                ? '[background:linear-gradient(135deg,_#16a34a_0%,_#15803d_100%)]'
                : 'bg-[#94a3b8]',
              'text-[#ffffff] font-semibold',
              otorgando || !persona ? 'cursor-not-allowed' : 'cursor-pointer',
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
    </Modal>
  );
};
