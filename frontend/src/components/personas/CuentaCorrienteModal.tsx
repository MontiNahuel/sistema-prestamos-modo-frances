import React, { useState } from 'react';
import { CuentaCorrienteResumen } from '../../types/persona';
import { Modal } from '../common/Modal';
import { formatPesos } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { CheckCircleIcon, AlertTriangleIcon } from '../common/Icons';

interface CuentaCorrienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cc: CuentaCorrienteResumen | null;
}

export const CuentaCorrienteModal: React.FC<CuentaCorrienteModalProps> = ({
  isOpen,
  onClose,
  cc
}) => {
  const [tab, setTab] = useState<'cuotas' | 'meses' | 'movimientos'>('cuotas');

  if (!cc) return null;

  const t = cc.totales;
  const p = cc.persona;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cuenta Corriente (Estado Financiero)" maxWidth="920px">
      {/* Encabezado Persona */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.875rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
            {p.apellido} {p.nombre}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
            ID #{p.id} · DNI {p.numeroDoc} {p.cuil ? `· CUIL ${p.cuil}` : ''}
          </div>
        </div>
        <div>
          {t.algunaConMora ? (
            <Badge variant="danger"><AlertTriangleIcon size={13} color="#b91c1c" /> Registra Mora</Badge>
          ) : (
            <Badge variant="success"><CheckCircleIcon size={13} color="#15803d" /> Al Día</Badge>
          )}
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: t.saldo > 0 ? '#fef2f2' : '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${t.saldo > 0 ? '#fecaca' : '#bbf7d0'}` }}>
          <div style={{ fontSize: '0.75rem', color: t.saldo > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>Saldo Deudor</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: t.saldo > 0 ? '#b91c1c' : '#15803d', marginTop: '0.2rem' }}>
            {formatPesos(t.saldo)}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Cuota Mensual</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
            {formatPesos(t.obligacionMensual)}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Cobrado / Pagado</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>
            {formatPesos(t.importeCobrado || 0)}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Cuotas Cobradas</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0284c7', marginTop: '0.2rem' }}>
            {t.cobrados || 0} de {(t.cobrados || 0) + (t.pendientes || 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <button
          onClick={() => setTab('cuotas')}
          style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: tab === 'cuotas' ? '2px solid #2563eb' : '2px solid transparent', color: tab === 'cuotas' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Desglose de Cuotas ({cc.desglose?.length || 0})
        </button>
        <button
          onClick={() => setTab('meses')}
          style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: tab === 'meses' ? '2px solid #2563eb' : '2px solid transparent', color: tab === 'meses' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Períodos Mensuales ({cc.periodos?.length || 0})
        </button>
        <button
          onClick={() => setTab('movimientos')}
          style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: tab === 'movimientos' ? '2px solid #2563eb' : '2px solid transparent', color: tab === 'movimientos' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Movimientos / Pagos ({cc.movimientos?.length || 0})
        </button>
      </div>

      {/* Tabla Desglose */}
      {tab === 'cuotas' && (
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.5rem 0.75rem' }}>Cuota</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Período</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Concepto</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Importe</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Cobrado</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Pendiente</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cc.desglose && cc.desglose.length > 0 ? (
                cc.desglose.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                      {d.numeroCuota ? `${d.numeroCuota} de ${d.cantidadCuotas || '—'}` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{d.periodoObligacion ? d.periodoObligacion.substring(0, 10) : '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{d.planNombre || d.concepto}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{formatPesos(d.importePresentado)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{formatPesos(d.importeCobrado)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: d.importePendiente > 0 ? '#b91c1c' : '#64748b' }}>{formatPesos(d.importePendiente)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <Badge variant={d.estado === 'COBRADO' ? 'success' : (d.estado === 'EN_MORA' ? 'danger' : 'warning')}>
                        {d.estado}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin cuotas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Periodos */}
      {tab === 'meses' && (
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.5rem 0.75rem' }}>Mes</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Esperado</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Cubierto</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Cobrados</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {cc.periodos && cc.periodos.length > 0 ? (
                cc.periodos.map((pe, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{pe.mes ? pe.mes.substring(0, 7) : '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{formatPesos(pe.esperado)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{formatPesos(pe.cubierto)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{pe.cobrados}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{pe.pendientes}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin períodos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Movimientos */}
      {tab === 'movimientos' && (
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.5rem 0.75rem' }}>Fecha</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Origen / Banco</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Concepto</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Importe</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cc.movimientos && cc.movimientos.length > 0 ? (
                cc.movimientos.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{m.fechaImpacto ? m.fechaImpacto.substring(0, 10) : '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{m.origen || '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>{m.concepto}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{formatPesos(m.montoPesos)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <Badge variant="success">{m.estado}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin movimientos de cobro registrados aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};
