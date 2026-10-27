import React, { useEffect, useState } from 'react';
import { LineaPrestamo, LineaPrestamoCreate } from '../../../types/linea';
import { MotorCalculo } from '../../../types/motor';
import { getMotores } from '../../../services/api/motoresApi';
import { Modal } from '../../common/Modal';

interface LineaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LineaPrestamoCreate) => Promise<void>;
  lineaParaEditar: LineaPrestamo | null;
  condicionesSimuladas?: {
    motor_id: number;
    tasa: number;
    iva: number;
    monto: number;
    plazo: number;
  };
}

export const LineaModal: React.FC<LineaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lineaParaEditar,
  condicionesSimuladas
}) => {
  const [motores, setMotores] = useState<MotorCalculo[]>([]);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [motorId, setMotorId] = useState<number>(1);
  const [tasaPorcentaje, setTasaPorcentaje] = useState<number>(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(21);
  const [permiteOverride, setPermiteOverride] = useState(true);

  const [montoMinPesos, setMontoMinPesos] = useState<number>(10000);
  const [montoMaxPesos, setMontoMaxPesos] = useState<number>(1500000);
  const [montoPasoPesos, setMontoPasoPesos] = useState<number>(1000);

  const [plazoMin, setPlazoMin] = useState<number>(3);
  const [plazoMax, setPlazoMax] = useState<number>(36);
  const [requiereSocioAlDia, setRequiereSocioAlDia] = useState(true);
  const [activo, setActivo] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getMotores(true)
      .then((m) => {
        setMotores(m);
        if (m.length > 0 && !lineaParaEditar && !condicionesSimuladas) {
          setMotorId(m[0].id);
        }
      })
      .catch(console.error);
  }, [isOpen, lineaParaEditar, condicionesSimuladas]);

  useEffect(() => {
    if (lineaParaEditar) {
      setCodigo(lineaParaEditar.codigo);
      setNombre(lineaParaEditar.nombre);
      setDescripcion(lineaParaEditar.descripcion || '');
      setMotorId(lineaParaEditar.motor_id);
      setTasaPorcentaje(Number(lineaParaEditar.tasa_default) * 100);
      setIvaPorcentaje(Number(lineaParaEditar.alicuota_iva) * 100);
      setPermiteOverride(lineaParaEditar.permite_override_tasa);
      setMontoMinPesos(lineaParaEditar.monto_minimo_centavos / 100);
      setMontoMaxPesos(lineaParaEditar.monto_maximo_centavos / 100);
      setMontoPasoPesos(lineaParaEditar.monto_paso_centavos / 100);
      setPlazoMin(lineaParaEditar.plazo_minimo_meses);
      setPlazoMax(lineaParaEditar.plazo_maximo_meses);
      setRequiereSocioAlDia(lineaParaEditar.requiere_socio_al_dia);
      setActivo(lineaParaEditar.activo);
    } else {
      setCodigo('');
      setNombre('');
      setDescripcion('');
      setTasaPorcentaje(
        condicionesSimuladas ? condicionesSimuladas.tasa * 100 : 60
      );
      setIvaPorcentaje(
        condicionesSimuladas ? condicionesSimuladas.iva * 100 : 21
      );
      if (condicionesSimuladas) setMotorId(condicionesSimuladas.motor_id);
      setPermiteOverride(true);
      setMontoMinPesos(
        condicionesSimuladas ? condicionesSimuladas.monto / 100 : 10000
      );
      setMontoMaxPesos(
        condicionesSimuladas ? condicionesSimuladas.monto / 100 : 1500000
      );
      setMontoPasoPesos(condicionesSimuladas ? 0.01 : 1000);
      setPlazoMin(condicionesSimuladas?.plazo ?? 3);
      setPlazoMax(condicionesSimuladas?.plazo ?? 36);
      setRequiereSocioAlDia(true);
      setActivo(true);
    }
    setError(null);
  }, [lineaParaEditar, isOpen, condicionesSimuladas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      montoMinPesos <= 0 ||
      montoMaxPesos < montoMinPesos ||
      montoPasoPesos <= 0 ||
      plazoMax < plazoMin
    ) {
      setError(
        'Revisá los límites: los máximos deben ser mayores o iguales a los mínimos y el paso debe ser positivo.'
      );
      return;
    }
    if (
      condicionesSimuladas &&
      (condicionesSimuladas.monto < Math.round(montoMinPesos * 100) ||
        condicionesSimuladas.monto > Math.round(montoMaxPesos * 100) ||
        condicionesSimuladas.plazo < plazoMin ||
        condicionesSimuladas.plazo > plazoMax)
    ) {
      setError(
        'Los límites de la línea deben incluir el monto y el plazo que simulaste.'
      );
      return;
    }
    setGuardando(true);
    setError(null);

    try {
      await onSave({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        motor_id: Number(motorId),
        tasa_default: tasaPorcentaje / 100,
        alicuota_iva: ivaPorcentaje / 100,
        permite_override_tasa: permiteOverride,
        monto_minimo_centavos: Math.round(montoMinPesos * 100),
        monto_maximo_centavos: Math.round(montoMaxPesos * 100),
        monto_paso_centavos: Math.round(montoPasoPesos * 100),
        plazo_minimo_meses: Number(plazoMin),
        plazo_maximo_meses: Number(plazoMax),
        requiere_socio_al_dia: requiereSocioAlDia,
        activo
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar línea');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        lineaParaEditar
          ? `Editar Línea: ${lineaParaEditar.nombre}`
          : 'Nueva Línea de Préstamo'
      }
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        {condicionesSimuladas && (
          <p className="text-[#475569] mt-0">
            Las condiciones financieras corresponden al cálculo realizado.
            Completá la identificación y los límites comerciales para crear la
            línea.
          </p>
        )}
        {error && (
          <div className="mb-5 p-[0.75rem_1rem] bg-[#fee2e2] text-[#991b1b] rounded-lg text-[0.85rem] [border:1px_solid_#fecaca]">
            {error}
          </div>
        )}

        {/* 1. Identificación */}
        <div className="grid grid-cols-[1fr_1.5fr] gap-4 mb-4">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
              Código Único
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EJ: PERS_RAPIDO"
              maxLength={50}
              disabled={Boolean(lineaParaEditar)}
              className={[
                'w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] box-border',
                lineaParaEditar ? 'bg-[#f8fafc]' : 'bg-[#ffffff]'
              ]
                .filter(Boolean)
                .join(' ')}
              required
            />
          </div>

          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
              Nombre Comercial
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Préstamo Personal Socios"
              maxLength={100}
              className="w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
              required
            />
          </div>
        </div>

        {/* Motor de Fórmula */}
        <div className="mb-5">
          <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
            Motor de Fórmula Matemática Asociado
          </label>
          <select
            value={motorId}
            disabled={Boolean(condicionesSimuladas)}
            onChange={(e) => setMotorId(Number(e.target.value))}
            className="w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] bg-[#fff]"
            required
          >
            {motores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.convencion_tasa} • {m.modalidad_iva})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Tasas e IVA */}
        <div className="bg-[#f8fafc] p-4 rounded-[10px] [border:1px_solid_#e2e8f0] mb-5">
          <div className="text-[0.8rem] font-bold text-[#475569] mb-3 uppercase tracking-[0.04em]">
            Condiciones Financieras
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Tipo Tasa (del Motor)
              </label>
              <div className="p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#e2e8f0] bg-[#f1f5f9] text-[0.85rem] text-[#1e293b] font-semibold">
                {motores
                  .find((m) => m.id === motorId)
                  ?.convencion_tasa.includes('TEA')
                  ? 'TEA (Efectiva)'
                  : 'TNA (Nominal)'}
              </div>
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Tasa Default (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={tasaPorcentaje}
                disabled={Boolean(condicionesSimuladas)}
                onChange={(e) => setTasaPorcentaje(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Alícuota IVA (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={ivaPorcentaje}
                disabled={Boolean(condicionesSimuladas)}
                onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Límites de Montos ($) y Plazos */}
        <div className="bg-[#f8fafc] p-4 rounded-[10px] [border:1px_solid_#e2e8f0] mb-5">
          <div className="text-[0.8rem] font-bold text-[#475569] mb-3 uppercase tracking-[0.04em]">
            Límites Comerciales de Crédito
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 mb-4">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Monto Mínimo ($)
              </label>
              <input
                type="number"
                value={montoMinPesos}
                step="0.01"
                onChange={(e) => setMontoMinPesos(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Monto Máximo ($)
              </label>
              <input
                type="number"
                value={montoMaxPesos}
                step="0.01"
                onChange={(e) => setMontoMaxPesos(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Salto / Paso ($)
              </label>
              <input
                type="number"
                value={montoPasoPesos}
                step="0.01"
                onChange={(e) => setMontoPasoPesos(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Plazo Mínimo (Meses)
              </label>
              <input
                type="number"
                min="1"
                value={plazoMin}
                onChange={(e) => setPlazoMin(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                Plazo Máximo (Meses)
              </label>
              <input
                type="number"
                min="1"
                value={plazoMax}
                onChange={(e) => setPlazoMax(Number(e.target.value))}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] box-border"
                required
              />
            </div>
          </div>
        </div>

        {/* 4. Flags */}
        <div className="mb-6 flex flex-col gap-[0.6rem]">
          <label className="flex items-center gap-[0.6rem] text-[0.85rem] text-[#334155] cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={permiteOverride}
              onChange={(e) => setPermiteOverride(e.target.checked)}
              className="w-[16px] h-[16px] [accent-color:#2563eb]"
            />
            Permitir al operador modificar la tasa al simular / otorgar
          </label>

          <label className="flex items-center gap-[0.6rem] text-[0.85rem] text-[#334155] cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={requiereSocioAlDia}
              onChange={(e) => setRequiereSocioAlDia(e.target.checked)}
              className="w-[16px] h-[16px] [accent-color:#2563eb]"
            />
            Exigir que el socio esté al día en CoopYa (sin deuda ni morosidad)
          </label>

          <label className="flex items-center gap-[0.6rem] text-[0.85rem] text-[#334155] cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-[16px] h-[16px] [accent-color:#2563eb]"
            />
            Línea de crédito activa comercialmente
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2 [border-top:1px_solid_#f1f5f9]">
          <button
            type="button"
            onClick={onClose}
            className="p-[0.55rem_1.1rem] rounded-lg [border:1px_solid_#cbd5e1] bg-[#fff] text-[#475569] cursor-pointer font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className={[
              'p-[0.55rem_1.4rem] rounded-lg [border:none] bg-[#2563eb] text-[#fff] font-semibold',
              guardando ? 'cursor-not-allowed' : 'cursor-pointer',
              'shadow-[0_1px_2px_rgba(37,99,235,0.2)]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {guardando
              ? 'Guardando...'
              : condicionesSimuladas
                ? 'Crear Línea de Préstamo'
                : 'Guardar Línea'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
