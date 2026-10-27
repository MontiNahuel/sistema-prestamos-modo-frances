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
  const [convencionTasa, setConvencionTasa] =
    useState<ConvencionTasa>('TNA_PROPORCIONAL');
  const [baseDias, setBaseDias] = useState<BaseDias>('COMERCIAL_30_360');
  const [modalidadIva, setModalidadIva] =
    useState<ModalidadIva>('IVA_DECRECIENTE');
  const [ajusteResidual, setAjusteResidual] =
    useState<AjusteResidual>('ULTIMA_CUOTA');
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
      title={
        motorParaEditar
          ? `Editar Motor: ${motorParaEditar.nombre}`
          : 'Nuevo Motor de Fórmula Financiera'
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 p-[0.75rem_1rem] bg-[#fee2e2] text-[#991b1b] rounded-lg text-[0.85rem] [border:1px_solid_#fecaca]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[1fr_1.5fr] gap-4 mb-5">
          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
              Código Único
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EJ: FRANCES_CUSTOM"
              disabled={Boolean(motorParaEditar?.es_sistema)}
              className={[
                'w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] box-border',
                motorParaEditar?.es_sistema ? 'bg-[#f8fafc]' : 'bg-[#ffffff]'
              ]
                .filter(Boolean)
                .join(' ')}
              required
            />
          </div>

          <div>
            <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
              Nombre Visible
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Francés Tasa Efectiva"
              className="w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] box-border"
              required
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Breve explicación de las características y uso de este motor de cálculo..."
            className="w-full p-[0.6rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.875rem] box-border [resize:vertical]"
          />
        </div>

        <div className="bg-[#f8fafc] p-4 rounded-[10px] [border:1px_solid_#e2e8f0] mb-5">
          <div className="text-[0.8rem] font-bold text-[#475569] mb-3 uppercase tracking-[0.04em]">
            Reglas de Cálculo Matemático
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-4 mb-4">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                1. Convención de Tasa
              </label>
              <select
                value={convencionTasa}
                onChange={(e) =>
                  setConvencionTasa(e.target.value as ConvencionTasa)
                }
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] bg-[#fff]"
              >
                <option value="TNA_PROPORCIONAL">
                  TNA Proporcional (TNA / 12)
                </option>
                <option value="TEA_COMPUESTA">
                  TEA Compuesta ((1+TEA)^(1/12) - 1)
                </option>
                <option value="TNA_DIAS_REALES">TNA Base Días Reales</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                2. Base de Días / Calendario
              </label>
              <select
                value={baseDias}
                onChange={(e) => setBaseDias(e.target.value as BaseDias)}
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] bg-[#fff]"
              >
                <option value="COMERCIAL_30_360">
                  Comercial 30/360 (Mes fijo)
                </option>
                <option value="ACTUAL_365">Actual / 365 (Días reales)</option>
                <option value="ACTUAL_360">
                  Actual / 360 (Días reales base 360)
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                3. Modalidad de IVA
              </label>
              <select
                value={modalidadIva}
                onChange={(e) =>
                  setModalidadIva(e.target.value as ModalidadIva)
                }
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] bg-[#fff]"
              >
                <option value="IVA_DECRECIENTE">
                  IVA s/Interés Decreciente (Estándar)
                </option>
                <option value="CUOTA_TOTAL_PLANA">
                  Cuota Total Fija con IVA Incluido
                </option>
                <option value="EXENTO">Exento de IVA (0%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.8rem] font-semibold text-[#334155] mb-[0.35rem]">
                4. Centavo Residual
              </label>
              <select
                value={ajusteResidual}
                onChange={(e) =>
                  setAjusteResidual(e.target.value as AjusteResidual)
                }
                className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.85rem] bg-[#fff]"
              >
                <option value="ULTIMA_CUOTA">
                  Absorber en Última Cuota (Recomendado)
                </option>
                <option value="PRIMERA_CUOTA">Absorber en Primera Cuota</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-[0.6rem]">
          <input
            type="checkbox"
            id="chkActivoMotor"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="w-[16px] h-[16px] [accent-color:#2563eb] cursor-pointer"
          />
          <label
            htmlFor="chkActivoMotor"
            className="text-[0.875rem] text-[#334155] cursor-pointer font-medium"
          >
            Motor habilitado y disponible para nuevas líneas
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
            {guardando ? 'Guardando...' : 'Guardar Motor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
