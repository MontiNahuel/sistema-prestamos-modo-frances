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
    if (
      !window.confirm(
        `¿Confirmás el cobro del saldo pendiente de la Cuota #${c.numero_cuota}: ${formatMoney(c.cuota_total_centavos - c.monto_pagado_centavos)}?`
      )
    )
      return;

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
      case 'ACTIVO':
        return 'success';
      case 'FINALIZADO':
        return 'neutral';
      case 'CANCELADO':
        return 'danger';
      case 'MORA':
        return 'warning';
      default:
        return 'neutral';
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
          <div className="mb-5 p-[0.85rem_1rem] bg-[#fee2e2] text-[#991b1b] rounded-lg [border:1px_solid_#fecaca] text-[0.875rem]">
            {error}
          </div>
        )}

        {/* Encabezado del Socio y Estado */}
        <div className="bg-[#f8fafc] p-5 rounded-xl [border:1px_solid_#e2e8f0] mb-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-[1.25rem] font-bold m-0 text-[#0f172a]">
                {prestamo.persona_nombre || `Socio #${prestamo.persona_id}`}
              </h3>
              <Badge variant={getEstadoBadgeVariant(prestamo.estado)}>
                {prestamo.estado}
              </Badge>
            </div>
            <div className="text-[#64748b] text-[0.85rem] mt-[0.35rem]">
              DNI: <strong>{prestamo.persona_doc || 'S/D'}</strong> • ID Socio:{' '}
              <strong>{prestamo.persona_id}</strong> • Otorgado el:{' '}
              <strong>
                {new Date(prestamo.fecha_alta).toLocaleDateString('es-AR')}
              </strong>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {prestamo.estado === 'ACTIVO' && (
              <button
                onClick={handleCancelarPrestamo}
                disabled={procesando}
                className={[
                  'p-[0.45rem_0.9rem] rounded-md [border:1px_solid_#fecaca] bg-[#fef2f2] text-[#991b1b] text-[0.8rem] font-semibold',
                  procesando ? 'cursor-not-allowed' : 'cursor-pointer'
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                Cancelar Préstamo
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas de Resumen Financiero */}
        <div className="grid grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] gap-4 mb-6">
          <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-[10px] p-4">
            <div className="text-[#64748b] text-[0.75rem] font-semibold uppercase">
              Monto Solicitado
            </div>
            <div className="text-[#0f172a] text-[1.25rem] font-bold mt-1">
              {formatMoney(prestamo.monto_solicitado_centavos)}
            </div>
            <div className="text-[#64748b] text-[0.75rem] mt-[0.2rem]">
              {prestamo.plazo_meses} cuotas • TNA{' '}
              {formatPct(prestamo.tna_pactada)}
            </div>
          </div>

          <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-[10px] p-4">
            <div className="text-[#64748b] text-[0.75rem] font-semibold uppercase">
              Saldo Deudor Actual
            </div>
            <div
              className={[
                prestamo.saldo_deudor_actual_centavos > 0
                  ? 'text-[#dc2626]'
                  : 'text-[#16a34a]',
                'text-[1.25rem] font-bold mt-1'
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {formatMoney(prestamo.saldo_deudor_actual_centavos)}
            </div>
            <div className="text-[#64748b] text-[0.75rem] mt-[0.2rem]">
              Progreso: {cuotasPagadas} de {prestamo.plazo_meses} cuotas
            </div>
          </div>

          <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-[10px] p-4">
            <div className="text-[#64748b] text-[0.75rem] font-semibold uppercase">
              Intereses + IVA
            </div>
            <div className="text-[#0f172a] text-[1.25rem] font-bold mt-1">
              {formatMoney(
                prestamo.total_interes_centavos + prestamo.total_iva_centavos
              )}
            </div>
            <div className="text-[#64748b] text-[0.75rem] mt-[0.2rem]">
              Int: {formatMoney(prestamo.total_interes_centavos)} | IVA:{' '}
              {formatMoney(prestamo.total_iva_centavos)}
            </div>
          </div>

          <div className="bg-[#ffffff] [border:1px_solid_#e2e8f0] rounded-[10px] p-4">
            <div className="text-[#64748b] text-[0.75rem] font-semibold uppercase">
              Total a Liquidar
            </div>
            <div className="text-[#2563eb] text-[1.25rem] font-bold mt-1">
              {formatMoney(prestamo.total_a_pagar_centavos)}
            </div>
            <div className="text-[#64748b] text-[0.75rem] mt-[0.2rem]">
              Línea: {prestamo.linea_snapshot?.linea_nombre || 'Sin línea'}
            </div>
          </div>
        </div>

        {prestamo.linea_snapshot && (
          <div className="bg-[#f8fafc] [border:1px_solid_#e2e8f0] rounded-[10px] p-[0.85rem_1.1rem] mb-5">
            <div className="text-[0.75rem] font-bold text-[#475569] uppercase tracking-[0.04em] mb-[0.35rem]">
              Evidencia Legal del Contrato (Snapshot Inmutable de Línea)
            </div>
            <div className="flex flex-wrap gap-6 text-[0.825rem] text-[#334155]">
              <div>
                Línea: <strong>{prestamo.linea_snapshot.linea_nombre}</strong> (
                <code>{prestamo.linea_snapshot.linea_codigo}</code>)
              </div>
              <div>
                Motor: <strong>{prestamo.linea_snapshot.motor_nombre}</strong>
              </div>
              <div>
                Tasa Catálogo Vigente:{' '}
                <strong>
                  {formatPct(prestamo.linea_snapshot.tasa_catalogo_vigente)}
                </strong>
              </div>
              <div>
                Fecha Congelamiento:{' '}
                <strong>
                  {new Date(
                    prestamo.linea_snapshot.fecha_snapshot
                  ).toLocaleDateString('es-AR')}
                </strong>
              </div>
            </div>
          </div>
        )}

        {prestamo.observaciones && (
          <div className="mb-5 p-[0.75rem_1rem] bg-[#f1f5f9] rounded-lg text-[0.85rem] text-[#334155]">
            <strong>Observaciones del legajo:</strong> {prestamo.observaciones}
          </div>
        )}

        {/* Tabla de Cronograma de Cuotas */}
        <div className="[border:1px_solid_#e2e8f0] rounded-[10px] overflow-hidden">
          <div className="p-[0.75rem_1rem] bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] font-semibold text-[#334155] text-[0.9rem]">
            Cronograma Oficial de Cuotas ({cuotas.length} cuotas)
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full border-collapse text-right text-[0.825rem]">
              <thead className="bg-[#f8fafc] sticky top-0 z-[10] [border-bottom:1px_solid_#e2e8f0]">
                <tr>
                  <th className="p-[0.65rem_0.75rem] text-center">Cuota #</th>
                  <th className="p-[0.65rem_0.75rem] text-center">
                    Vencimiento
                  </th>
                  <th className="p-[0.65rem_0.75rem]">Saldo Inicial</th>
                  <th className="p-[0.65rem_0.75rem]">Capital</th>
                  <th className="p-[0.65rem_0.75rem]">Interés</th>
                  <th className="p-[0.65rem_0.75rem]">IVA s/Int</th>
                  <th className="p-[0.65rem_0.75rem] text-[#1d4ed8]">
                    Cuota Total
                  </th>
                  <th className="p-[0.65rem_0.75rem]">Saldo Final</th>
                  <th className="p-[0.65rem_0.75rem] text-center">Estado</th>
                  <th className="p-[0.65rem_0.75rem] text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((c) => (
                  <tr
                    key={c.id}
                    className={[
                      '[border-bottom:1px_solid_#f1f5f9]',
                      c.estado === 'PAGADA' ? 'bg-[#f0fdf4]' : 'bg-transparent'
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className="p-[0.65rem_0.75rem] text-center font-semibold">
                      {c.numero_cuota}
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-center text-[#64748b]">
                      {c.fecha_vencimiento
                        ? new Date(
                            c.fecha_vencimiento + 'T00:00:00'
                          ).toLocaleDateString('es-AR')
                        : `Mes ${c.numero_cuota}`}
                    </td>
                    <td className="p-[0.65rem_0.75rem]">
                      {formatMoney(c.saldo_inicial_centavos)}
                    </td>
                    <td className="p-[0.65rem_0.75rem] font-medium">
                      {formatMoney(c.capital_centavos)}
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-[#64748b]">
                      {formatMoney(c.interes_centavos)}
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-[#64748b]">
                      {formatMoney(c.iva_interes_centavos)}
                    </td>
                    <td className="p-[0.65rem_0.75rem] font-bold text-[#1d4ed8]">
                      {formatMoney(c.cuota_total_centavos)}
                      {c.monto_pagado_centavos > 0 && c.estado !== 'PAGADA' && <small className="block text-[#92400e]">Pendiente: {formatMoney(c.cuota_total_centavos - c.monto_pagado_centavos)}</small>}
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-[#64748b]">
                      {formatMoney(c.saldo_final_centavos)}
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-center">
                      <Badge
                        variant={c.estado === 'PAGADA' ? 'success' : 'neutral'}
                      >
                        {c.estado}
                      </Badge>
                    </td>
                    <td className="p-[0.65rem_0.75rem] text-center">
                      {['PENDIENTE', 'PARCIAL', 'RECHAZADA', 'VENCIDA'].includes(c.estado) &&
                      ['ACTIVO', 'MORA'].includes(prestamo.estado) ? (
                        <button
                          onClick={() => handlePagarCuota(c)}
                          disabled={procesando}
                          className="p-[0.3rem_0.6rem] rounded-sm [border:1px_solid_#bbf7d0] bg-[#dcfce7] text-[#15803d] text-[0.75rem] font-semibold cursor-pointer"
                        >
                          Cobrar
                        </button>
                      ) : (
                        <span className="text-[0.75rem] text-[#94a3b8]">
                          {c.fecha_pago
                            ? new Date(c.fecha_pago).toLocaleDateString('es-AR')
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="p-[0.55rem_1.25rem] rounded-lg [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#334155] font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
