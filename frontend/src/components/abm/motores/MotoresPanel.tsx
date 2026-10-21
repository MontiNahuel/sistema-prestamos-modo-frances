import React, { useEffect, useState } from 'react';
import { MotorCalculo, MotorCalculoCreate } from '../../../types/motor';
import { getMotores, createMotor, updateMotor, deleteMotor } from '../../../services/api/motoresApi';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CpuIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Motores de Fórmulas Financieras
              </h2>
              <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                Estrategias de amortización francesa, base de cálculo de días, tratamiento de IVA y redondeos de centavos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNuevo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            transition: 'all 0.15s ease'
          }}
        >
          <PlusIcon size={18} />
          Nuevo Motor de Cálculo
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <tr>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Código / Nombre</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Convención Tasa</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Base Días</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Modalidad IVA</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Centavo Residual</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {motores.length > 0 ? (
              motores.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.nombre}</span>
                      {m.es_sistema && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                          Sistema
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      <code style={{ background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', color: '#334155', fontFamily: 'monospace' }}>{m.codigo}</code>
                      {m.descripcion && <span style={{ marginLeft: '0.5rem' }}>— {m.descripcion}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <Badge variant="info">{m.convencion_tasa}</Badge>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 500 }}>{m.base_dias}</span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <Badge variant={m.modalidad_iva === 'CUOTA_TOTAL_PLANA' ? 'warning' : 'neutral'}>
                      {m.modalidad_iva}
                    </Badge>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: '#475569' }}>
                    {m.ajuste_residual === 'ULTIMA_CUOTA' ? 'Última Cuota' : 'Primera Cuota'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span
                      onClick={() => handleToggleActivo(m)}
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                      title="Haz click para alternar estado"
                    >
                      <Badge variant={m.activo ? 'success' : 'danger'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditar(m)}
                        title="Editar Motor"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '0.775rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        <EditIcon size={14} />
                        Editar
                      </button>
                      {!m.es_sistema && (
                        <button
                          onClick={() => handleEliminar(m)}
                          title="Eliminar Motor"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#991b1b',
                            fontSize: '0.775rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
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
                <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
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
