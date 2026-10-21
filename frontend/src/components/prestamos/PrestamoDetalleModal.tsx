import React, { useState } from 'react';
import { Prestamo, CuotaPrestamo } from '../../types/prestamo';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { formatMoney, formatPct } from '../../utils/formatters';
import { pagarCuota, cancelarPrestamo } from '../../services/api/prestamosApi';

interface PrestamoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestamo: Prestamo | null;
  onActualizado: () => Promise<void>;
}

export const PrestamoDetalleModal: React.FC<PrestamoDetalleModalProps> = ({
  isOpen,
  onClose,
  prestamo,
  onActualizado
}) => {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prestamo) return null;

  const cuotas = prestamo.cuotas || [];
  const cuotasPagadas = cuotas.filter((c) => c.estado === 'PAGADA').length;

  const handlePagarCuota = async (c: CuotaPrestamo) => {
    if (!window.confirm(`¿Confirmás el registro de cobro para la Cuota #${c.numero_cuota} de ${formatMoney(c.cuota_total_centavos)}?`)) return;

    setProcesando(true);
    setError(null);
    try {
      await pagarCuota(prestamo.id, c.numero_cuota);
      await onActualizado();
    } catch (err: any) {
      setError(err.message || 'Error al cobrar cuota');
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelarPrestamo = async () => {
    if (!window.confirm('¿Estás seguro de cancelar este préstamo?')) return;

    setProcesando(true);
    setError(null);
    try {
      await cancelarPrestamo(prestamo.id);
      await onActualizado();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar préstamo');
    } finally {
      setProcesando(false);
    }
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Legajo de Préstamo: #${prestamo.id.substring(0, 8).toUpperCase()}`}
      maxWidth="1100px"
    >
      <div>
        {error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Encabezado del Socio y Estado */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {prestamo.persona_nombre || `Socio #${prestamo.persona_id}`}
              </h3>
              <Badge variant={getEstadoBadgeVariant(prestamo.estado)}>
                {prestamo.estado}
              </Badge>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              DNI: <strong>{prestamo.persona_doc || 'S/D'}</strong> • ID Socio: <strong>{prestamo.persona_id}</strong> • Otorgado el: <strong>{new Date(prestamo.fecha_alta).toLocaleDateString('es-AR')}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {prestamo.estado === 'ACTIVO' && (
              <button
                onClick={handleCancelarPrestamo}
                disabled={procesando}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: procesando ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar Préstamo
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas de Resumen Financiero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Monto Solicitado</div>
            <div style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {formatMoney(prestamo.monto_solicitado_centavos)}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {prestamo.plazo_meses} cuotas • TNA {formatPct(prestamo.tna_pactada)}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Saldo Deudor Actual</div>
            <div style={{ color: prestamo.saldo_deudor_actual_centavos > 0 ? '#dc2626' : '#16a34a', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {formatMoney(prestamo.saldo_deudor_actual_centavos)}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Progreso: {cuotasPagadas} de {prestamo.plazo_meses} cuotas
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Intereses + IVA</div>
            <div style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {formatMoney(prestamo.total_interes_centavos + prestamo.total_iva_centavos)}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Int: {formatMoney(prestamo.total_interes_centavos)} | IVA: {formatMoney(prestamo.total_iva_centavos)}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total a Liquidar</div>
            <div style={{ color: '#2563eb', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {formatMoney(prestamo.total_a_pagar_centavos)}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Línea: {prestamo.linea_snapshot?.linea_nombre || 'Sin línea'}
            </div>
          </div>
        </div>

        {prestamo.linea_snapshot && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Evidencia Legal del Contrato (Snapshot Inmutable de Línea)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.825rem', color: '#334155' }}>
              <div>Línea: <strong>{prestamo.linea_snapshot.linea_nombre}</strong> (<code>{prestamo.linea_snapshot.linea_codigo}</code>)</div>
              <div>Motor: <strong>{prestamo.linea_snapshot.motor_nombre}</strong></div>
              <div>Tasa Catálogo Vigente: <strong>{formatPct(prestamo.linea_snapshot.tasa_catalogo_vigente)}</strong></div>
              <div>Fecha Congelamiento: <strong>{new Date(prestamo.linea_snapshot.fecha_snapshot).toLocaleDateString('es-AR')}</strong></div>
            </div>
          </div>
        )}

        {prestamo.observaciones && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#334155' }}>
            <strong>Observaciones del legajo:</strong> {prestamo.observaciones}
          </div>
        )}

        {/* Tabla de Cronograma de Cuotas */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
            Cronograma Oficial de Cuotas ({cuotas.length} cuotas)
          </div>
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Cuota #</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Vencimiento</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Saldo Inicial</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Capital</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Interés</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>IVA s/Int</th>
                  <th style={{ padding: '0.65rem 0.75rem', color: '#1d4ed8' }}>Cuota Total</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Saldo Final</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: c.estado === 'PAGADA' ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{c.numero_cuota}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#64748b' }}>
                      {c.fecha_vencimiento ? new Date(c.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR') : `Mes ${c.numero_cuota}`}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{formatMoney(c.saldo_inicial_centavos)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>{formatMoney(c.capital_centavos)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>{formatMoney(c.interes_centavos)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>{formatMoney(c.iva_interes_centavos)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#1d4ed8' }}>
                      {formatMoney(c.cuota_total_centavos)}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>{formatMoney(c.saldo_final_centavos)}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <Badge variant={c.estado === 'PAGADA' ? 'success' : 'neutral'}>
                        {c.estado}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      {c.estado === 'PENDIENTE' && prestamo.estado === 'ACTIVO' ? (
                        <button
                          onClick={() => handlePagarCuota(c)}
                          disabled={procesando}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            border: '1px solid #bbf7d0',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cobrar
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-AR') : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
