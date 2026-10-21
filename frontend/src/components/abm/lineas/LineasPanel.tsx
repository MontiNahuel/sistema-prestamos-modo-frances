import React, { useEffect, useState } from 'react';
import { LineaPrestamo, LineaPrestamoCreate } from '../../../types/linea';
import { getLineas, createLinea, updateLinea, deleteLinea } from '../../../services/api/lineasApi';
import { Badge } from '../../common/Badge';
import { LineaModal } from './LineaModal';
import { formatMoney, formatPct } from '../../../utils/formatters';
import { PlusIcon, EditIcon, TrashIcon, SlidersIcon } from '../../common/Icons';

export const LineasPanel: React.FC = () => {
  const [lineas, setLineas] = useState<LineaPrestamo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [lineaSeleccionada, setLineaSeleccionada] = useState<LineaPrestamo | null>(null);

  const cargarLineas = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getLineas();
      setLineas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar líneas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLineas();
  }, []);

  const handleNuevo = () => {
    setLineaSeleccionada(null);
    setModalAbierto(true);
  };

  const handleEditar = (l: LineaPrestamo) => {
    setLineaSeleccionada(l);
    setModalAbierto(true);
  };

  const handleSave = async (data: LineaPrestamoCreate) => {
    if (lineaSeleccionada) {
      await updateLinea(lineaSeleccionada.id, data);
    } else {
      await createLinea(data);
    }
    await cargarLineas();
  };

  const handleToggleActivo = async (l: LineaPrestamo) => {
    try {
      await updateLinea(l.id, { activo: !l.activo });
      await cargarLineas();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const handleEliminar = async (l: LineaPrestamo) => {
    if (!window.confirm(`¿Estás seguro de eliminar la línea "${l.nombre}"?`)) return;

    try {
      await deleteLinea(l.id);
      await cargarLineas();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar línea');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlidersIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Líneas de Préstamo
              </h2>
              <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                Catálogo comercial de productos crediticios, montos límite, plazos y motor financiero asignado.
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
          Nueva Línea de Préstamo
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
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Motor de Fórmula</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Tasa / IVA</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Rango Montos</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Plazos</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Condición</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length > 0 ? (
              lineas.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{l.nombre}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      <code style={{ background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', color: '#334155', fontFamily: 'monospace' }}>{l.codigo}</code>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{l.motor?.nombre || `Motor #${l.motor_id}`}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      {l.motor?.convencion_tasa} • {l.motor?.modalidad_iva}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.9rem' }}>
                      {l.tipo_tasa || (l.motor?.convencion_tasa?.includes('TEA') ? 'TEA' : 'TNA')}: {formatPct(l.tasa_default)}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      IVA: {formatPct(l.alicuota_iva)} {l.permite_override_tasa && <span style={{ color: '#059669', fontWeight: 500 }}>• Variable</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                      Mín: <strong style={{ color: '#1e293b' }}>{formatMoney(l.monto_minimo_centavos)}</strong>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.1rem' }}>
                      Máx: <strong style={{ color: '#1e293b' }}>{formatMoney(l.monto_maximo_centavos)}</strong>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{l.plazo_minimo_meses}</span> a <span style={{ fontWeight: 600, color: '#1e293b' }}>{l.plazo_maximo_meses}</span> cuotas
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <Badge variant={l.requiere_socio_al_dia ? 'warning' : 'neutral'}>
                      {l.requiere_socio_al_dia ? 'Exige Al Día' : 'Flexible'}
                    </Badge>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span
                      onClick={() => handleToggleActivo(l)}
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                      title="Haz click para alternar estado"
                    >
                      <Badge variant={l.activo ? 'success' : 'danger'}>
                        {l.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditar(l)}
                        title="Editar Línea"
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
                      <button
                        onClick={() => handleEliminar(l)}
                        title="Eliminar Línea"
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
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  {cargando ? 'Cargando líneas de préstamo...' : 'No hay líneas de crédito registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LineaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={handleSave}
        lineaParaEditar={lineaSeleccionada}
      />
    </div>
  );
};
