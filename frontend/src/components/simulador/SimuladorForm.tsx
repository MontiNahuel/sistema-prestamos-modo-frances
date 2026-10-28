import React, { useEffect, useState } from 'react';
import { LineaPrestamo } from '../../types/linea';
import { Persona } from '../../types/persona';
import { SimulacionPayload } from '../../types/simulacion';
import { getLineas } from '../../services/api/lineasApi';
import { formatMoney } from '../../utils/formatters';
import { CalculatorIcon } from '../common/Icons';
import { MotorCalculo } from '../../types/motor';
import { getMotores } from '../../services/api/motoresApi';

interface SimuladorFormProps {
  onSimular: (payload: SimulacionPayload) => void;
  simulando: boolean;
  personaSeleccionada: Persona | null;
  onParametrosChange: () => void;
  nuevaLinea?: boolean;
  revisionLineas?: number;
}

export const SimuladorForm: React.FC<SimuladorFormProps> = ({
  onSimular,
  simulando,
  personaSeleccionada,
  onParametrosChange,
  nuevaLinea = false,
  revisionLineas = 0
}) => {
  const [lineas, setLineas] = useState<LineaPrestamo[]>([]);
  const [selectedLineaId, setSelectedLineaId] = useState<number | ''>('');
  const [montoPesos, setMontoPesos] = useState<number>(100000);
  const [plazoMeses, setPlazoMeses] = useState<number>(12);
  const [tnaPorcentaje, setTnaPorcentaje] = useState<number>(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(21);
  const [motores, setMotores] = useState<MotorCalculo[]>([]);
  const [motorId, setMotorId] = useState<number | ''>('');
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [cargandoMotores, setCargandoMotores] = useState(true);
  const [cargandoLineas, setCargandoLineas] = useState(true);

  useEffect(() => {
    getMotores(true)
      .then((data) => {
        setMotores(data);
        setMotorId(data[0]?.id ?? '');
      })
      .catch(() =>
        setCargaError(
          'No se pudieron cargar los motores. Recargá la página para reintentar.'
        )
      )
      .finally(() => setCargandoMotores(false));
  }, []);

  useEffect(() => {
    getLineas(true)
      .then((data) => {
        setLineas(data);
        if (data.length > 0 && !nuevaLinea && revisionLineas === 0) {
          const primera = data[0];
          setSelectedLineaId(primera.id);
          setTnaPorcentaje(Number(primera.tasa_default) * 100);
          setIvaPorcentaje(Number(primera.alicuota_iva) * 100);
        }
      })
      .catch(() =>
        setCargaError(
          'No se pudieron cargar las líneas. Recargá la página para reintentar.'
        )
      )
      .finally(() => setCargandoLineas(false));
  }, [nuevaLinea, revisionLineas]);

  const handleLineaChange = (lineaId: number | '') => {
    setSelectedLineaId(lineaId);
    if (!lineaId) return;
    const l = lineas.find((x) => x.id === lineaId);
    if (l) {
      setTnaPorcentaje(Number(l.tasa_default) * 100);
      setIvaPorcentaje(Number(l.alicuota_iva) * 100);
      const minP = l.monto_minimo_centavos / 100;
      const maxP = l.monto_maximo_centavos / 100;
      if (montoPesos < minP) setMontoPesos(minP);
      if (montoPesos > maxP) setMontoPesos(maxP);
      if (plazoMeses < l.plazo_minimo_meses)
        setPlazoMeses(l.plazo_minimo_meses);
      if (plazoMeses > l.plazo_maximo_meses)
        setPlazoMeses(l.plazo_maximo_meses);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimular({
      monto_centavos: Math.round(montoPesos * 100),
      plazo_meses: plazoMeses,
      tna: tnaPorcentaje / 100,
      alicuota_iva: ivaPorcentaje / 100,
      linea_id: selectedLineaId ? Number(selectedLineaId) : null,
      motor_id: selectedLineaId
        ? lineas.find((l) => l.id === selectedLineaId)?.motor_id
        : Number(motorId)
    });
  };

  const lineaActiva = lineas.find((x) => x.id === selectedLineaId);

  return (
    <form
      onSubmit={handleSubmit}
      onChange={onParametrosChange}
      className="bg-[#ffffff] p-6 rounded-xl [border:1px_solid_#e2e8f0] shadow-[0_1px_3px_0_rgba(0,_0,_0,_0.04)] sticky top-20"
    >
      <h3 className="m-[0_0_1rem] text-[1.05rem] text-[#0f172a] font-bold">
        Parámetros de Simulación
      </h3>
      {cargaError && (
        <p role="alert" className="text-[#991b1b]">
          {cargaError}
        </p>
      )}

      {personaSeleccionada && (
        <div className="bg-[#eff6ff] p-3 rounded-lg mb-5 [border:1px_solid_#bfdbfe]">
          <div className="text-[0.725rem] text-[#1d4ed8] font-semibold uppercase">
            Socio Asignado:
          </div>
          <div className="font-bold text-[#1e3a8a] text-[0.9rem] mt-[0.15rem]">
            {personaSeleccionada.apellido} {personaSeleccionada.nombre}
          </div>
          <div className="text-[0.75rem] text-[#64748b]">
            IdPersona: #{personaSeleccionada.idPersona} · DNI:{' '}
            {personaSeleccionada.numeroDoc}
          </div>
        </div>
      )}

      {/* Selector de Línea de Crédito */}
      <div className="mb-5">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
          Línea de Crédito / Plan
        </label>
        <select
          value={selectedLineaId}
          onChange={(e) =>
            handleLineaChange(e.target.value ? Number(e.target.value) : '')
          }
          className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] bg-[#fff] text-[#0f172a]"
        >
          <option value="">Personalizado / Sin Línea</option>
          {lineas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre} ({l.tipo_tasa} {Number(l.tasa_default) * 100}%)
            </option>
          ))}
        </select>
        {lineaActiva && (
          <div className="mt-[0.4rem] text-[0.75rem] text-[#64748b] bg-[#f8fafc] p-2 rounded-md [border:1px_solid_#e2e8f0]">
            Fórmula:{' '}
            <strong>{lineaActiva.motor?.nombre || 'Francés Estándar'}</strong>
            <br />
            Rango: {formatMoney(lineaActiva.monto_minimo_centavos)} a{' '}
            {formatMoney(lineaActiva.monto_maximo_centavos)}
          </div>
        )}
      </div>

      {!selectedLineaId && (
        <label className="block mb-5 text-[0.8rem] font-semibold">
          Motor de cálculo
          <select
            required
            value={motorId}
            onChange={(e) => setMotorId(Number(e.target.value))}
            className="w-full p-[0.625rem] mt-[0.35rem] rounded-lg [border:1px_solid_#cbd5e1]"
          >
            <option value="" disabled>
              Seleccioná un motor
            </option>
            {motores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.codigo})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mb-[1.15rem]">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
          Monto a Financiar ($)
        </label>
        <input
          type="number"
          min="1000"
          step="100"
          value={montoPesos}
          onChange={(e) => setMontoPesos(Number(e.target.value))}
          className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.95rem] box-border"
          required
        />
        <div className="text-[#64748b] text-[0.725rem] mt-[0.2rem]">
          Equivale a {montoPesos * 100} centavos
        </div>
      </div>

      <div className="mb-[1.15rem]">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
          Cantidad de Cuotas (Meses)
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={plazoMeses}
          onChange={(e) => setPlazoMeses(Number(e.target.value))}
          className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.95rem] box-border"
          required
        />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-3 mb-6">
        <div>
          <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
            {lineaActiva?.motor?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365' ||
            motores.find((m) => m.id === motorId)?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365'
              ? 'Tasa Anual Comercial con IVA (%)'
              : 'Tasa Anual (%)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={tnaPorcentaje}
            onChange={(e) => setTnaPorcentaje(Number(e.target.value))}
            className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.95rem] box-border"
            required
          />
          {(lineaActiva?.motor?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365' ||
            motores.find((m) => m.id === motorId)?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365') && (
            <div className="text-[0.72rem] text-[#2563eb] font-medium mt-[0.2rem]">
              Base comercial 365/30 con IVA incluido (ej: 414.59%)
            </div>
          )}
        </div>

        <div>
          <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
            IVA s/Int (%)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={ivaPorcentaje}
            onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
            className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.95rem] box-border"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={
          simulando ||
          cargandoMotores ||
          cargandoLineas ||
          (!selectedLineaId && !motorId)
        }
        className={[
          'w-full flex items-center justify-center gap-2 p-3 bg-[#2563eb] text-[#ffffff] [border:none] rounded-lg font-semibold text-[0.9rem]',
          simulando ? 'cursor-not-allowed' : 'cursor-pointer',
          'shadow-[0_1px_2px_0_rgba(37,_99,_235,_0.2)] enabled:hover:bg-[#1d4ed8]'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <CalculatorIcon size={16} color="#ffffff" />
        <span>{simulando ? 'Calculando...' : 'Calcular Amortización'}</span>
      </button>
    </form>
  );
};
