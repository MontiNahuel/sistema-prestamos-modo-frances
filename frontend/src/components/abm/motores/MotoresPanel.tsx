import React, { useEffect, useState } from 'react';
import { MotorCalculo, MotorCalculoCreate } from '../../../types/motor';
import { getMotores, createMotor, updateMotor, deleteMotor } from '../../../services/api/motoresApi';
import { Badge } from '../../common/Badge';
import { MotorModal } from './MotorModal';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            ABM: Motores de Fórmulas Financieras
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Estrategias matemáticas del Sistema Francés configurables para las líneas de crédito.
          </p>
        </div>
        <button
          onClick={handleNuevo}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          + Nuevo Motor de Cálculo
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem' }}>Código / Nombre</th>
              <th style={{ padding: '0.75rem 1rem' }}>Convención Tasa</th>
              <th style={{ padding: '0.75rem 1rem' }}>Base Días</th>
              <th style={{ padding: '0.75rem 1rem' }}>Modalidad IVA</th>
              <th style={{ padding: '0.75rem 1rem' }}>Centavo Residual</th>
              <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {motores.length > 0 ? (
              motores.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{m.nombre}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      <code>{m.codigo}</code> {m.es_sistema && '★ Sistema'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge variant="info">{m.convencion_tasa}</Badge>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>{m.base_dias}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge variant={m.modalidad_iva === 'CUOTA_TOTAL_PLANA' ? 'warning' : 'neutral'}>
                      {m.modalidad_iva}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#4b5563' }}>
                    {m.ajuste_residual}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      onClick={() => handleToggleActivo(m)}
                      style={{ cursor: 'pointer' }}
                      title="Click para alternar estado"
                    >
                      <Badge variant={m.activo ? 'success' : 'danger'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditar(m)}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                      {!m.es_sistema && (
                        <button
                          onClick={() => handleEliminar(m)}
                          style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #fee2e2', background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
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
