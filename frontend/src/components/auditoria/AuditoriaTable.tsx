import React from 'react';
import {
  AuditoriaPrestamoItem,
  AuditoriaPresentacionBaproItem,
  AuditoriaConfiguracionCreditoItem,
  AuditoriaSincronizacionPersonaItem,
} from '../../types/auditoria';
import { Badge } from '../common/Badge';

export type AuditTab = 'prestamos' | 'bapro' | 'configuracion' | 'personas';

interface AuditoriaTableProps {
  tab: AuditTab;
  loading: boolean;
  total: number;
  prestamos: AuditoriaPrestamoItem[];
  bapro: AuditoriaPresentacionBaproItem[];
  configuracion: AuditoriaConfiguracionCreditoItem[];
  personas: AuditoriaSincronizacionPersonaItem[];
  onVerDetalle: (titulo: string, data: any) => void;
}

export const AuditoriaTable: React.FC<AuditoriaTableProps> = ({
  tab,
  loading,
  total,
  prestamos,
  bapro,
  configuracion,
  personas,
  onVerDetalle,
}) => {
  return (
    <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem' }}>Fecha</th>
            {tab === 'prestamos' && (
              <>
                <th style={{ padding: '0.75rem 1rem' }}>Préstamo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                <th style={{ padding: '0.75rem 1rem' }}>Cuota #</th>
                <th style={{ padding: '0.75rem 1rem' }}>Monto</th>
                <th style={{ padding: '0.75rem 1rem' }}>Operador</th>
              </>
            )}
            {tab === 'bapro' && (
              <>
                <th style={{ padding: '0.75rem 1rem' }}>Lote / Archivo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                <th style={{ padding: '0.75rem 1rem' }}>Total Regs</th>
                <th style={{ padding: '0.75rem 1rem' }}>Monto Lote</th>
                <th style={{ padding: '0.75rem 1rem' }}>Aprobados</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rechazados</th>
              </>
            )}
            {tab === 'configuracion' && (
              <>
                <th style={{ padding: '0.75rem 1rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Código / Nombre</th>
                <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tasa (Ant → Nueva)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Operador</th>
              </>
            )}
            {tab === 'personas' && (
              <>
                <th style={{ padding: '0.75rem 1rem' }}>Documento</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Acción</th>
                <th style={{ padding: '0.75rem 1rem' }}>Oracle ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>CoopYa ID</th>
              </>
            )}
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando registros...</td></tr>
          ) : total === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron registros de auditoría.</td></tr>
          ) : (
            tab === 'prestamos' && prestamos.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>{new Date(p.fecha_registro).toLocaleString()}</td>
                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{p.prestamo_id.substring(0, 8)}...</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant={p.accion === 'CREATE' ? 'success' : p.accion === 'CANCEL' ? 'danger' : 'info'}>{p.accion}</Badge></td>
                <td style={{ padding: '0.65rem 1rem' }}>{p.cuota_numero || '-'}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{p.monto_centavos ? `$${(p.monto_centavos / 100).toLocaleString('es-AR')}` : '-'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>{p.usuario_operador || 'SISTEMA'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => onVerDetalle(`Auditoría Préstamo ${p.prestamo_id}`, p.detalles_json)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Detalle</button>
                </td>
              </tr>
            )) ||
            tab === 'bapro' && bapro.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>{new Date(b.fecha_registro).toLocaleString()}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{b.nro_archivo ? `Lote #${b.nro_archivo}` : '-'}</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant="info">{b.accion}</Badge></td>
                <td style={{ padding: '0.65rem 1rem' }}>{b.total_registros || 0}</td>
                <td style={{ padding: '0.65rem 1rem' }}>{b.total_monto ? `$${Number(b.total_monto).toLocaleString('es-AR')}` : '-'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#16a34a' }}>{b.registros_aprobados ?? '-'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#dc2626' }}>{b.registros_rechazados ?? '-'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => onVerDetalle(`Auditoría Lote BAPRO #${b.nro_archivo}`, b.detalles_json)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Detalle</button>
                </td>
              </tr>
            )) ||
            tab === 'configuracion' && configuracion.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>{new Date(c.fecha_registro).toLocaleString()}</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant="neutral">{c.tipo_entidad}</Badge></td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{c.codigo || c.nombre || `#${c.entidad_id}`}</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant={c.accion === 'CREATE' ? 'success' : c.accion === 'UPDATE' ? 'warning' : 'danger'}>{c.accion}</Badge></td>
                <td style={{ padding: '0.65rem 1rem' }}>{c.tasa_anterior !== undefined ? `${c.tasa_anterior}% → ` : ''}{c.tasa_nueva !== undefined ? `${c.tasa_nueva}%` : '-'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>{c.usuario_operador || 'SISTEMA'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => onVerDetalle(`Auditoría ${c.tipo_entidad} #${c.entidad_id}`, c.cambios_json)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Detalle</button>
                </td>
              </tr>
            )) ||
            tab === 'personas' && personas.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>{new Date(s.fecha_registro).toLocaleString()}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{s.documento}</td>
                <td style={{ padding: '0.65rem 1rem' }}><Badge variant={s.estado === 'EXITO' ? 'success' : 'danger'}>{s.estado}</Badge></td>
                <td style={{ padding: '0.65rem 1rem' }}>{s.accion}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>{s.id_persona_oracle || '-'}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>{s.id_persona_coopya || '-'}</td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => onVerDetalle(`Sincronización DNI ${s.documento}`, { error: s.detalle_error, payload: s.payload_json })} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Detalle</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
