import React, { useEffect, useState } from 'react';
import { LineaPrestamo } from '../../types/linea';
import { Persona } from '../../types/persona';
import { SimulacionPayload } from '../../types/simulacion';
import { getLineas } from '../../services/api/lineasApi';
import { formatMoney } from '../../utils/formatters';
import { CalculatorIcon } from '../common/Icons';
import { MotorCalculo } from '../../types/motor';
import { getMotores } from '../../services/api/motoresApi';
import { SocioSelector } from './SocioSelector';

function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function primerVencimientoSugerido(): string {
  const hoy = new Date();
  return fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 10));
}

interface SimuladorFormProps {
  onSimular: (payload: SimulacionPayload) => void;
  simulando: boolean;
  personaSeleccionada: Persona | null;
  onSeleccionarPersona?: (persona: Persona | null) => void;
  onParametrosChange: () => void;
  nuevaLinea?: boolean;
  revisionLineas?: number;
}

export const SimuladorForm: React.FC<SimuladorFormProps> = ({
  onSimular,
  simulando,
  personaSeleccionada,
  onSeleccionarPersona,
  onParametrosChange,
  nuevaLinea = false,
  revisionLineas = 0
}) => {
  const [lineas, setLineas] = useState<LineaPrestamo[]>([]);
  const [selectedLineaId, setSelectedLineaId] = useState<number | ''>('');
  const [montoPesos, setMontoPesos] = useState<number | ''>(100000);
  const [plazoMeses, setPlazoMeses] = useState<number | ''>(12);
  const [tnaPorcentaje, setTnaPorcentaje] = useState<number | ''>(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number | ''>(21);
  const [fechaPrimerVencimiento, setFechaPrimerVencimiento] = useState<string>(() => primerVencimientoSugerido());
  const [motores, setMotores] = useState<MotorCalculo[]>([]);
  const [motorId, setMotorId] = useState<number | ''>('');
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [cargandoMotores, setCargandoMotores] = useState(true);
  const [cargandoLineas, setCargandoLineas] = useState(true);
  const [errores, setErrores] = useState<{ [campo: string]: string }>({});

  useEffect(() => {
    getMotores(true)
      .then((d) => { setMotores(d); setMotorId(d[0]?.id ?? ''); })
      .catch(() => setCargaError('No se pudieron cargar los motores.'))
      .finally(() => setCargandoMotores(false));
  }, []);

  useEffect(() => {
    getLineas(true)
      .then((d) => {
        setLineas(d);
        if (d.length > 0 && !nuevaLinea && revisionLineas === 0) {
          setSelectedLineaId(d[0].id);
          setTnaPorcentaje(Number(d[0].tasa_default) * 100);
          setIvaPorcentaje(Number(d[0].alicuota_iva) * 100);
        }
      })
      .catch(() => setCargaError('No se pudieron cargar las líneas.'))
      .finally(() => setCargandoLineas(false));
  }, [nuevaLinea, revisionLineas]);

  const handleLineaChange = (lineaId: number | '') => {
    setSelectedLineaId(lineaId);
    if (!lineaId) return;
    const l = lineas.find((x) => x.id === lineaId);
    if (l) {
      setTnaPorcentaje(Number(l.tasa_default) * 100);
      setIvaPorcentaje(Number(l.alicuota_iva) * 100);
      if (typeof montoPesos === 'number') {
        setMontoPesos(Math.min(Math.max(montoPesos, l.monto_minimo_centavos / 100), l.monto_maximo_centavos / 100));
      }
      if (typeof plazoMeses === 'number') {
        setPlazoMeses(Math.min(Math.max(plazoMeses, l.plazo_minimo_meses), l.plazo_maximo_meses));
      }
    }
  };

  const handleNumChange = (val: string, setter: (v: number | '') => void, campo: string, isInt = false) => {
    if (val === '') {
      setter('');
      setErrores((p) => ({ ...p, [campo]: 'Campo obligatorio' }));
    } else {
      const num = isInt ? parseInt(val, 10) : Number(val);
      setter(isNaN(num) ? '' : num);
      setErrores((p) => { const c = { ...p }; delete c[campo]; return c; });
    }
    onParametrosChange();
  };

  const handleFechaChange = (valor: string) => {
    setFechaPrimerVencimiento(valor);
    setErrores((p) => {
      const copia = { ...p };
      delete copia.fecha;
      return copia;
    });
    onParametrosChange();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: { [campo: string]: string } = {};
    if (montoPesos === '' || montoPesos <= 0) nuevos.monto = 'El monto debe ser mayor a $0';
    if (plazoMeses === '' || plazoMeses < 1) nuevos.plazo = 'El plazo debe ser al menos 1 mes';
    if (tnaPorcentaje === '' || tnaPorcentaje < 0) nuevos.tna = 'La tasa es obligatoria';
    if (ivaPorcentaje === '' || ivaPorcentaje < 0) nuevos.iva = 'El IVA es obligatorio';
    if (!fechaPrimerVencimiento) nuevos.fecha = 'Indicá la fecha del primer vencimiento';
    else if (fechaPrimerVencimiento < fechaLocalISO(new Date())) nuevos.fecha = 'La fecha no puede ser anterior a hoy';

    if (Object.keys(nuevos).length > 0) {
      setErrores(nuevos);
      return;
    }
    setErrores({});
    onSimular({
      monto_centavos: Math.round(Number(montoPesos) * 100),
      plazo_meses: Number(plazoMeses),
      tna: Number(tnaPorcentaje) / 100,
      alicuota_iva: Number(ivaPorcentaje) / 100,
      fecha_primer_vencimiento: fechaPrimerVencimiento,
      linea_id: selectedLineaId ? Number(selectedLineaId) : null,
      motor_id: selectedLineaId ? lineas.find((l) => l.id === selectedLineaId)?.motor_id : Number(motorId)
    });
  };

  const lineaActiva = lineas.find((x) => x.id === selectedLineaId);
  const esRomi = lineaActiva?.motor?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365' ||
    motores.find((m) => m.id === motorId)?.convencion_tasa === 'TASA_ROMI_COMERCIAL_365';
  const inputErrCls = (campo: string) =>
    `w-full p-[0.625rem_0.75rem] rounded-lg text-[0.95rem] box-border ${
      errores[campo] ? '[border:1px_solid_#ef4444] bg-[#fef2f2]' : '[border:1px_solid_#cbd5e1]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm sticky top-20">
      <h3 className="m-[0_0_1rem] text-[1.05rem] text-[#0f172a] font-bold">Parámetros de Simulación</h3>
      {cargaError && <p role="alert" className="text-[#991b1b]">{cargaError}</p>}

      <SocioSelector personaSeleccionada={personaSeleccionada} onSeleccionarPersona={onSeleccionarPersona || (() => {})} />

      <div className="mb-5">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">Línea de Crédito / Plan</label>
        <select
          value={selectedLineaId}
          onChange={(e) => handleLineaChange(e.target.value ? Number(e.target.value) : '')}
          className="w-full p-[0.625rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] bg-white text-[#0f172a]"
        >
          <option value="">Personalizado / Sin Línea</option>
          {lineas.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre} ({l.tipo_tasa} {Number(l.tasa_default) * 100}%)</option>
          ))}
        </select>
        {lineaActiva && (
          <div className="mt-[0.4rem] text-[0.75rem] text-[#64748b] bg-[#f8fafc] p-2 rounded-md [border:1px_solid_#e2e8f0]">
            Fórmula: <strong>{lineaActiva.motor?.nombre || 'Francés Estándar'}</strong>
            <br />
            Rango: {formatMoney(lineaActiva.monto_minimo_centavos)} a {formatMoney(lineaActiva.monto_maximo_centavos)}
          </div>
        )}
      </div>

      {!selectedLineaId && (
        <label className="block mb-5 text-[0.8rem] font-semibold text-[#475569]">
          Motor de cálculo
          <select
            required
            value={motorId}
            onChange={(e) => setMotorId(Number(e.target.value))}
            className="w-full p-[0.625rem] mt-[0.35rem] rounded-lg [border:1px_solid_#cbd5e1] bg-white"
          >
            <option value="" disabled>Seleccioná un motor</option>
            {motores.map((m) => (<option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>))}
          </select>
        </label>
      )}

      <div className="mb-[1.15rem]">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">Monto a Financiar ($)</label>
        <input
          type="number"
          min="1"
          step="any"
          placeholder="Ej: 150000"
          value={montoPesos}
          onChange={(e) => handleNumChange(e.target.value, setMontoPesos, 'monto')}
          className={inputErrCls('monto')}
        />
        {errores.monto ? (
          <div className="text-[0.75rem] text-[#ef4444] mt-1 font-medium">{errores.monto}</div>
        ) : montoPesos !== '' ? (
          <div className="text-[#64748b] text-[0.725rem] mt-[0.2rem]">Equivale a {Number(montoPesos) * 100} centavos</div>
        ) : null}
      </div>

      <div className="mb-[1.15rem]">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">Cantidad de Cuotas (Meses)</label>
        <input
          type="number"
          min="1"
          max="120"
          placeholder="Ej: 12"
          value={plazoMeses}
          onChange={(e) => handleNumChange(e.target.value, setPlazoMeses, 'plazo', true)}
          className={inputErrCls('plazo')}
        />
        {errores.plazo && <div className="text-[0.75rem] text-[#ef4444] mt-1 font-medium">{errores.plazo}</div>}
      </div>

      <div className="mb-[1.15rem]">
        <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">Primer Vencimiento</label>
        <input
          type="date"
          min={fechaLocalISO(new Date())}
          value={fechaPrimerVencimiento}
          onChange={(e) => handleFechaChange(e.target.value)}
          className={inputErrCls('fecha')}
        />
        {errores.fecha ? (
          <div className="text-[0.75rem] text-[#ef4444] mt-1 font-medium">{errores.fecha}</div>
        ) : (
          <div className="text-[#64748b] text-[0.725rem] mt-[0.2rem]">Se usa para calcular y otorgar el préstamo con esta fecha real.</div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-3 mb-6">
        <div>
          <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">
            {esRomi ? 'Tasa Comercial c/IVA (%)' : 'Tasa Anual (%)'}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder={esRomi ? '414.59' : '60'}
            value={tnaPorcentaje}
            onChange={(e) => handleNumChange(e.target.value, setTnaPorcentaje, 'tna')}
            className={inputErrCls('tna')}
          />
          {errores.tna ? (
            <div className="text-[0.75rem] text-[#ef4444] mt-1 font-medium">{errores.tna}</div>
          ) : esRomi ? (
            <div className="text-[0.72rem] text-[#2563eb] font-medium mt-[0.2rem]">Base 365/30 con IVA</div>
          ) : null}
        </div>

        <div>
          <label className="block font-semibold text-[0.8rem] mb-[0.35rem] text-[#475569]">IVA s/Int (%)</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="21"
            value={ivaPorcentaje}
            onChange={(e) => handleNumChange(e.target.value, setIvaPorcentaje, 'iva')}
            className={inputErrCls('iva')}
          />
          {errores.iva && <div className="text-[0.75rem] text-[#ef4444] mt-1 font-medium">{errores.iva}</div>}
        </div>
      </div>

      <button
        type="submit"
        disabled={simulando || cargandoMotores || cargandoLineas || (!selectedLineaId && !motorId)}
        className={`w-full flex items-center justify-center gap-2 p-3 bg-[#2563eb] text-white [border:none] rounded-lg font-semibold text-[0.9rem] ${
          simulando ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-[#1d4ed8]'
        }`}
      >
        <CalculatorIcon size={16} color="#ffffff" />
        <span>{simulando ? 'Calculando...' : 'Calcular Amortización'}</span>
      </button>
    </form>
  );
};
