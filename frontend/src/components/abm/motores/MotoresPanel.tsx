import React, { useEffect, useState } from 'react';
import { MotorCalculo, MotorCalculoCreate } from '../../../types/motor';
import {
  getMotores,
  createMotor,
  updateMotor,
  deleteMotor
} from '../../../services/api/motoresApi';
import { Badge } from '../../common/Badge';
import { MotorModal } from './MotorModal';
import { PlusIcon, EditIcon, TrashIcon, CpuIcon } from '../../common/Icons';

export const MotoresPanel: React.FC = () => {
  const [motores, setMotores] = useState<MotorCalculo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motorSeleccionado, setMotorSeleccionado] = useState<MotorCalculo | null>(null);

  const cargarMotores = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getMotores();
      setMotores(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar motores');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMotores();
  }, []);

  const handleNuevo = () => {
    setMotorSeleccionado(null);
    setModalAbierto(true);
  };

  const handleEditar = (m: MotorCalculo) => {
    setMotorSeleccionado(m);
    setModalAbierto(true);
  };

  const handleSave = async (data: MotorCalculoCreate) => {
    if (motorSeleccionado) {
      await updateMotor(motorSeleccionado.id, data);
    } else {
      await createMotor(data);
    }
    await cargarMotores();
  };

  const handleToggleActivo = async (m: MotorCalculo) => {
    try {
      await updateMotor(m.id, { activo: !m.activo });
      await cargarMotores();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const handleEliminar = async (m: MotorCalculo) => {
    if (m.es_sistema) {
      alert('Los motores estándar del sistema no pueden eliminarse.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar el motor "${m.nombre}"?`)) return;

    try {
      await deleteMotor(m.id);
      await cargarMotores();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar motor');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-[0.6rem]">
            <div className="w-[36px] h-[36px] rounded-lg bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center">
              <CpuIcon size={20} />
            </div>
            <div>
              <h2 className="text-[1.5rem] font-bold m-0 text-[#0f172a] tracking-[-0.02em]">
                Motores de Fórmulas Financieras
              </h2>
              <p className="m-[0.2rem_0_0] text-[#64748b] text-[0.875rem]">
                Estrategias de amortización francesa, base de cálculo de días, tratamiento de IVA y redondeos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNuevo}
          className="inline-flex items-center gap-2 p-[0.65rem_1.25rem] [background:linear-gradient(135deg,_#2563eb_0%,_#1d4ed8_100%)] text-[#fff] [border:none] rounded-lg font-semibold cursor-pointer text-[0.875rem] shadow-[0_2px_4px_rgba(37,_99,_235,_0.2)]"
        >
          <PlusIcon size={18} />
          Nuevo Motor de Cálculo
        </button>
      </div>

      {error && (
        <div className="p-[0.85rem_1.25rem] bg-[#fee2e2] text-[#991b1b] rounded-lg mb-5 [border:1px_solid_#fecaca]">
          {error}
        </div>
      )}

      <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <table className="w-full border-collapse text-left text-[0.875rem]">
          <thead className="bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] text-[#475569]">
            <tr>
              <th className="p-[0.85rem_1.25rem] font-semibold">Código / Nombre</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Convención Tasa</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Base Días</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Modalidad IVA</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Ajuste y Redondeo</th>
              <th className="p-[0.85rem_1.25rem] font-semibold">Estado</th>
              <th className="p-[0.85rem_1.25rem] font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {motores.length > 0 ? (
              motores.map((m) => (
                <tr key={m.id} className="[border-bottom:1px_solid_#f1f5f9] hover:bg-[#f8fafc]">
                  <td className="p-[1rem_1.25rem]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0f172a]">{m.nombre}</span>
                      {m.es_sistema && (
                        <span className="bg-[#e0f2fe] text-[#0369a1] text-[0.7rem] p-[0.15rem_0.45rem] rounded-sm font-semibold">
                          Sistema
                        </span>
                      )}
                    </div>
                    <div className="text-[#64748b] text-[0.78rem] mt-[0.15rem]">
                      <code className="bg-[#f1f5f9] p-[0.15rem_0.35rem] rounded-sm text-[#334155] [font-family:monospace]">
                        {m.codigo}
                      </code>
                      {m.descripcion && <span className="ml-2">— {m.descripcion}</span>}
                    </div>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <Badge variant="info">{m.convencion_tasa}</Badge>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <span className="text-[0.825rem] text-[#334155] font-medium">{m.base_dias}</span>
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <Badge variant={m.modalidad_iva === 'CUOTA_TOTAL_PLANA' ? 'warning' : 'neutral'}>
                      {m.modalidad_iva}
                    </Badge>
                  </td>
                  <td className="p-[1rem_1.25rem] text-[0.825rem] text-[#475569]">
                    <div>{m.ajuste_residual === 'ULTIMA_CUOTA' ? 'Última Cuota' : 'Primera Cuota'}</div>
                    {m.redondeo_cuota === 'PESOS_ENTEROS' ? (
                      <span className="inline-block mt-1 bg-[#f0fdf4] text-[#166534] [border:1px_solid_#bbf7d0] text-[0.7rem] px-1.5 py-0.5 rounded font-medium">
                        Pesos Enteros
                      </span>
                    ) : (
                      <span className="inline-block mt-1 bg-[#f8fafc] text-[#64748b] [border:1px_solid_#e2e8f0] text-[0.7rem] px-1.5 py-0.5 rounded">
                        Con Centavos
                      </span>
                    )}
                  </td>
                  <td className="p-[1rem_1.25rem]">
                    <span
                      onClick={() => handleToggleActivo(m)}
                      className="cursor-pointer [display:inline-block]"
                      title="Haz click para alternar estado"
                    >
                      <Badge variant={m.activo ? 'success' : 'danger'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </span>
                  </td>
                  <td className="p-[1rem_1.25rem] text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEditar(m)}
                        title="Editar Motor"
                        className="inline-flex items-center gap-[0.35rem] p-[0.4rem_0.75rem] rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#334155] text-[0.775rem] font-medium cursor-pointer"
                      >
                        <EditIcon size={14} />
                        Editar
                      </button>
                      {!m.es_sistema && (
                        <button
                          onClick={() => handleEliminar(m)}
                          title="Eliminar Motor"
                          className="inline-flex items-center gap-[0.35rem] p-[0.4rem_0.75rem] rounded-md [border:1px_solid_#fee2e2] bg-[#fef2f2] text-[#991b1b] text-[0.775rem] font-medium cursor-pointer"
                        >
                          <TrashIcon size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-14 text-center text-[#94a3b8]">
                  {cargando ? 'Cargando motores de cálculo...' : 'No hay motores registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MotorModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleSave}
        motorParaEditar={motorSeleccionado}
      />
    </div>
  );
};