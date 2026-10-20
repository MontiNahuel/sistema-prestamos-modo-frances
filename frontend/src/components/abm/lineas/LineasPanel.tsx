import React, { useEffect, useState } from 'react';
import { LineaPrestamo, LineaPrestamoCreate } from '../../../types/linea';
import { getLineas, createLinea, updateLinea, deleteLinea } from '../../../services/api/lineasApi';
import { Badge } from '../../common/Badge';
import { LineaModal } from './LineaModal';
import { formatMoney, formatPct } from '../../../utils/formatters';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            ABM: Líneas de Préstamo
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Catálogo comercial de productos crediticios, límites de montos, plazos y fórmulas asociadas.
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
          + Nueva Línea de Préstamo
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
              <th style={{ padding: '0.75rem 1rem' }}>Motor de Fórmula</th>
              <th style={{ padding: '0.75rem 1rem' }}>Tasa / IVA</th>
              <th style={{ padding: '0.75rem 1rem' }}>Montos ($)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Plazos (Meses)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Req. Al Día</th>
              <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lineas.length > 0 ? (
              lineas.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{l.nombre}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      <code>{l.codigo}</code>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{l.motor?.nombre || `Motor #${l.motor_id}`}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {l.motor?.convencion_tasa} ({l.motor?.modalidad_iva})
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#2563eb' }}>
                      {l.tipo_tasa}: {formatPct(l.tasa_default)}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      IVA: {formatPct(l.alicuota_iva)} {l.permite_override_tasa && '• Variable'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.8rem' }}>
                      Min: {formatMoney(l.monto_minimo_centavos)}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Max: {formatMoney(l.monto_maximo_centavos)}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {l.plazo_minimo_meses} a {l.plazo_maximo_meses} cuotas
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge variant={l.requiere_socio_al_dia ? 'warning' : 'neutral'}>
                      {l.requiere_socio_al_dia ? 'Exige Al Día' : 'Flexible'}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      onClick={() => handleToggleActivo(l)}
                      style={{ cursor: 'pointer' }}
                      title="Click para alternar estado"
                    >
                      <Badge variant={l.activo ? 'success' : 'danger'}>
                        {l.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditar(l)}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(l)}
                        style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid #fee2e2', background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
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
