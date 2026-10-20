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
}

export const LineaModal: React.FC<LineaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lineaParaEditar
}) => {
  const [motores, setMotores] = useState<MotorCalculo[]>([]);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [motorId, setMotorId] = useState<number>(1);
  const [tipoTasa, setTipoTasa] = useState('TNA');
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
    getMotores(true).then((m) => {
      setMotores(m);
      if (m.length > 0 && !lineaParaEditar) {
        setMotorId(m[0].id);
      }
    }).catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (lineaParaEditar) {
      setCodigo(lineaParaEditar.codigo);
      setNombre(lineaParaEditar.nombre);
      setDescripcion(lineaParaEditar.descripcion || '');
      setMotorId(lineaParaEditar.motor_id);
      setTipoTasa(lineaParaEditar.tipo_tasa);
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
      setTipoTasa('TNA');
      setTasaPorcentaje(60);
      setIvaPorcentaje(21);
      setPermiteOverride(true);
      setMontoMinPesos(10000);
      setMontoMaxPesos(1500000);
      setMontoPasoPesos(1000);
      setPlazoMin(3);
      setPlazoMax(36);
      setRequiereSocioAlDia(true);
      setActivo(true);
    }
    setError(null);
  }, [lineaParaEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      await onSave({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        motor_id: Number(motorId),
        tipo_tasa: tipoTasa,
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
      title={lineaParaEditar ? `Editar Línea: ${lineaParaEditar.nombre}` : 'Nueva Línea de Préstamo'}
      maxWidth="650px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Código Único
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EJ: PERS_RAPIDO"
              disabled={Boolean(lineaParaEditar)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Nombre Comercial
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Préstamo Personal Jubilados"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Motor de Fórmula */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
            Motor de Fórmula Matemática
          </label>
          <select
            value={motorId}
            onChange={(e) => setMotorId(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fff' }}
            required
          >
            {motores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.convencion_tasa} - {m.modalidad_iva})
              </option>
            ))}
          </select>
        </div>

        {/* Tasas e IVA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Tipo Tasa
            </label>
            <select
              value={tipoTasa}
              onChange={(e) => setTipoTasa(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fff' }}
            >
              <option value="TNA">TNA</option>
              <option value="TEA">TEA</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Tasa por Defecto (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={tasaPorcentaje}
              onChange={(e) => setTasaPorcentaje(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              IVA s/Int (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={ivaPorcentaje}
              onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Límites de Montos ($) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Monto Mínimo ($)
            </label>
            <input
              type="number"
              value={montoMinPesos}
              onChange={(e) => setMontoMinPesos(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Monto Máximo ($)
            </label>
            <input
              type="number"
              value={montoMaxPesos}
              onChange={(e) => setMontoMaxPesos(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Escalonado ($)
            </label>
            <input
              type="number"
              value={montoPasoPesos}
              onChange={(e) => setMontoPasoPesos(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Plazos (Meses) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Plazo Mínimo (Meses)
            </label>
            <input
              type="number"
              min="1"
              value={plazoMin}
              onChange={(e) => setPlazoMin(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Plazo Máximo (Meses)
            </label>
            <input
              type="number"
              min="1"
              value={plazoMax}
              onChange={(e) => setPlazoMax(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Flags */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={permiteOverride}
              onChange={(e) => setPermiteOverride(e.target.checked)}
            />
            Permitir al operador modificar la tasa al otorgar
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requiereSocioAlDia}
              onChange={(e) => setRequiereSocioAlDia(e.target.checked)}
            />
            Exigir que el socio esté al día en CoopYa (sin mora)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Línea de crédito activa
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#4b5563', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}
          >
            {guardando ? 'Guardando...' : 'Guardar Línea'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
