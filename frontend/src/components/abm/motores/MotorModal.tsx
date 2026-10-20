import React, { useEffect, useState } from 'react';
import {
  MotorCalculo,
  MotorCalculoCreate,
  ConvencionTasa,
  BaseDias,
  ModalidadIva,
  AjusteResidual
} from '../../../types/motor';
import { Modal } from '../../common/Modal';

interface MotorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MotorCalculoCreate) => Promise<void>;
  motorParaEditar: MotorCalculo | null;
}

export const MotorModal: React.FC<MotorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  motorParaEditar
}) => {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [convencionTasa, setConvencionTasa] = useState<ConvencionTasa>('TNA_PROPORCIONAL');
  const [baseDias, setBaseDias] = useState<BaseDias>('COMERCIAL_30_360');
  const [modalidadIva, setModalidadIva] = useState<ModalidadIva>('IVA_DECRECIENTE');
  const [ajusteResidual, setAjusteResidual] = useState<AjusteResidual>('ULTIMA_CUOTA');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (motorParaEditar) {
      setCodigo(motorParaEditar.codigo);
      setNombre(motorParaEditar.nombre);
      setDescripcion(motorParaEditar.descripcion || '');
      setConvencionTasa(motorParaEditar.convencion_tasa);
      setBaseDias(motorParaEditar.base_dias);
      setModalidadIva(motorParaEditar.modalidad_iva);
      setAjusteResidual(motorParaEditar.ajuste_residual);
      setActivo(motorParaEditar.activo);
    } else {
      setCodigo('');
      setNombre('');
      setDescripcion('');
      setConvencionTasa('TNA_PROPORCIONAL');
      setBaseDias('COMERCIAL_30_360');
      setModalidadIva('IVA_DECRECIENTE');
      setAjusteResidual('ULTIMA_CUOTA');
      setActivo(true);
    }
    setError(null);
  }, [motorParaEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      await onSave({
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        convencion_tasa: convencionTasa,
        base_dias: baseDias,
        modalidad_iva: modalidadIva,
        ajuste_residual: ajusteResidual,
        activo
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar motor');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={motorParaEditar ? `Editar Motor: ${motorParaEditar.nombre}` : 'Nuevo Motor de Fórmula Financiera'}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Código Único
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EJ: FRANCES_CUSTOM"
              disabled={Boolean(motorParaEditar?.es_sistema)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Nombre Visible
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Francés Tasa Efectiva"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Breve explicación de cómo opera esta fórmula..."
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              1. Convención de Tasa
            </label>
            <select
              value={convencionTasa}
              onChange={(e) => setConvencionTasa(e.target.value as ConvencionTasa)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="TNA_PROPORCIONAL">TNA Proporcional (TNA / 12)</option>
              <option value="TEA_COMPUESTA">TEA Compuesta ((1+TEA)^(1/12) - 1)</option>
              <option value="TNA_DIAS_REALES">TNA Base Días Reales</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              2. Base de Días / Calendario
            </label>
            <select
              value={baseDias}
              onChange={(e) => setBaseDias(e.target.value as BaseDias)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="COMERCIAL_30_360">Comercial 30/360 (Mes fijo)</option>
              <option value="ACTUAL_365">Actual / 365 (Días reales)</option>
              <option value="ACTUAL_360">Actual / 360 (Días reales base 360)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              3. Modalidad de IVA
            </label>
            <select
              value={modalidadIva}
              onChange={(e) => setModalidadIva(e.target.value as ModalidadIva)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="IVA_DECRECIENTE">IVA s/Interés Decreciente (Estándar)</option>
              <option value="CUOTA_TOTAL_PLANA">Cuota Total Fija con IVA Incluido</option>
              <option value="EXENTO">Exento de IVA (0%)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              4. Centavo Residual
            </label>
            <select
              value={ajusteResidual}
              onChange={(e) => setAjusteResidual(e.target.value as AjusteResidual)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="ULTIMA_CUOTA">Absorber en Última Cuota (Recomendado)</option>
              <option value="PRIMERA_CUOTA">Absorber en Primera Cuota</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="chkActivoMotor"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <label htmlFor="chkActivoMotor" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            Motor habilitado y disponible para nuevas líneas
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
            {guardando ? 'Guardando...' : 'Guardar Motor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
