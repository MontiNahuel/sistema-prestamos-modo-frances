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
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* 1. Identificación */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Código Único
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EJ: PERS_RAPIDO"
              disabled={Boolean(lineaParaEditar)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                background: lineaParaEditar ? '#f8fafc' : '#ffffff'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Nombre Comercial
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Préstamo Personal Socios"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
        </div>

        {/* Motor de Fórmula */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Motor de Fórmula Matemática Asociado
          </label>
          <select
            value={motorId}
            onChange={(e) => setMotorId(Number(e.target.value))}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
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
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Condiciones Financieras
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Tipo Tasa (del Motor)
              </label>
              <div style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                {motores.find((m) => m.id === motorId)?.convencion_tasa.includes('TEA') ? 'TEA (Efectiva)' : 'TNA (Nominal)'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Tasa Default (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={tasaPorcentaje}
                onChange={(e) => setTasaPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Alícuota IVA (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={ivaPorcentaje}
                onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Límites de Montos ($) y Plazos */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Límites Comerciales de Crédito
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Monto Mínimo ($)
              </label>
              <input
                type="number"
                value={montoMinPesos}
                onChange={(e) => setMontoMinPesos(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Monto Máximo ($)
              </label>
              <input
                type="number"
                value={montoMaxPesos}
                onChange={(e) => setMontoMaxPesos(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Salto / Paso ($)
              </label>
              <input
                type="number"
                value={montoPasoPesos}
                onChange={(e) => setMontoPasoPesos(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Plazo Mínimo (Meses)
              </label>
              <input
                type="number"
                min="1"
                value={plazoMin}
                onChange={(e) => setPlazoMin(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Plazo Máximo (Meses)
              </label>
              <input
                type="number"
                min="1"
                value={plazoMax}
                onChange={(e) => setPlazoMax(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>
        </div>

        {/* 4. Flags */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={permiteOverride}
              onChange={(e) => setPermiteOverride(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            Permitir al operador modificar la tasa al simular / otorgar
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={requiereSocioAlDia}
              onChange={(e) => setRequiereSocioAlDia(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            Exigir que el socio esté al día en CoopYa (sin deuda ni morosidad)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            Línea de crédito activa comercialmente
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '0.55rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: guardando ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar Línea'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
