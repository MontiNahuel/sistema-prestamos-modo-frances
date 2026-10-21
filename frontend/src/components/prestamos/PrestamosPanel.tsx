import React, { useEffect, useState } from 'react';
import { Prestamo } from '../../types/prestamo';
import { getPrestamos, getPrestamoById } from '../../services/api/prestamosApi';
import { Badge } from '../common/Badge';
import { formatMoney, formatPct } from '../../utils/formatters';
import { FileTextIcon, SearchIcon } from '../common/Icons';
import { PrestamoDetalleModal } from './PrestamoDetalleModal';

export const PrestamosPanel: React.FC = () => {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [buscar, setBuscar] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');

  // Modal de Detalle
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarPrestamos = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getPrestamos({
        buscar: buscar.trim() || undefined,
        estado: estadoFiltro || undefined
      });
      setPrestamos(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar préstamos otorgados');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPrestamos();
  }, [estadoFiltro]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarPrestamos();
  };

  const handleVerDetalle = async (p: Prestamo) => {
    try {
      // Cargar con las cuotas completas
      const detalle = await getPrestamoById(p.id);
      setPrestamoSeleccionado(detalle);
      setModalAbierto(true);
    } catch (err: any) {
      alert(err.message || 'Error al cargar detalle del préstamo');
    }
  };

  const handleActualizarSeleccionado = async () => {
    if (!prestamoSeleccionado) return;
    const actualizado = await getPrestamoById(prestamoSeleccionado.id);
    setPrestamoSeleccionado(actualizado);
    await cargarPrestamos();
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'FINALIZADO': return 'neutral';
      case 'CANCELADO': return 'danger';
      case 'MORA': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div>
      {/* Título y Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileTextIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Préstamos Otorgados
            </h2>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Registro histórico oficial de operaciones otorgadas, saldos vigentes y seguimiento de cobranza.
            </p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por socio o DNI..."
              style={{
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                width: '240px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <SearchIcon size={15} />
            </div>
          </div>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="FINALIZADO">Finalizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Tabla de Préstamos */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <tr>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Folio / Fecha</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Socio / DNI</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Línea / Motor</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Monto Otorgado</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Plazo / Tasa</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Saldo Deudor</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length > 0 ? (
              prestamos.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      #{p.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      {new Date(p.fecha_alta).toLocaleDateString('es-AR')}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.persona_nombre || `Socio #${p.persona_id}`}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      DNI: {p.persona_doc || 'S/D'} • Id: {p.persona_id}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {p.linea_nombre || 'Tradicional'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      {p.motor_nombre || 'Sistema Francés'}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {formatMoney(p.monto_solicitado_centavos)}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      Total c/int: {formatMoney(p.total_a_pagar_centavos)}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>
                      {p.plazo_meses} cuotas
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      TNA: {formatPct(p.tna_pactada)}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 700, color: p.saldo_deudor_actual_centavos > 0 ? '#dc2626' : '#16a34a' }}>
                      {formatMoney(p.saldo_deudor_actual_centavos)}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <Badge variant={getEstadoBadgeVariant(p.estado)}>
                      {p.estado}
                    </Badge>
                  </td>

                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleVerDetalle(p)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  {cargando ? 'Cargando préstamos otorgados...' : 'No se encontraron préstamos otorgados con los filtros seleccionados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PrestamoDetalleModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        prestamo={prestamoSeleccionado}
        onActualizado={handleActualizarSeleccionado}
      />
    </div>
  );
};
