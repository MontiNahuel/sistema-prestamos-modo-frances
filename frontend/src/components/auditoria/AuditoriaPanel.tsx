import React, { useState, useEffect, useCallback } from 'react';
import {
  getAuditoriaPrestamos,
  getAuditoriaPresentacionesBapro,
  getAuditoriaConfiguracionCreditos,
  getAuditoriaSincronizacionPersonas,
} from '../../services/api/auditoriaApi';
import {
  AuditoriaPrestamoItem,
  AuditoriaPresentacionBaproItem,
  AuditoriaConfiguracionCreditoItem,
  AuditoriaSincronizacionPersonaItem,
} from '../../types/auditoria';
import { AuditoriaDetalleModal } from './AuditoriaDetalleModal';
import { AuditoriaTable, AuditTab } from './AuditoriaTable';

export const AuditoriaPanel: React.FC = () => {
  const [tab, setTab] = useState<AuditTab>('prestamos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filtro de búsqueda
  const [search, setSearch] = useState('');

  // Estados de datos
  const [prestamos, setPrestamos] = useState<AuditoriaPrestamoItem[]>([]);
  const [bapro, setBapro] = useState<AuditoriaPresentacionBaproItem[]>([]);
  const [configuracion, setConfiguracion] = useState<AuditoriaConfiguracionCreditoItem[]>([]);
  const [personas, setPersonas] = useState<AuditoriaSincronizacionPersonaItem[]>([]);

  // Modal detalle
  const [modalDetalle, setModalDetalle] = useState<{ open: boolean; titulo: string; data: any }>({
    open: false,
    titulo: '',
    data: null,
  });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'prestamos') {
        const res = await getAuditoriaPrestamos({
          prestamoId: search ? search.trim() : undefined,
          limit,
          offset,
        });
        setPrestamos(res.items);
        setTotal(res.total);
      } else if (tab === 'bapro') {
        const nro = search && !isNaN(Number(search)) ? Number(search) : undefined;
        const res = await getAuditoriaPresentacionesBapro({ nroArchivo: nro, limit, offset });
        setBapro(res.items);
        setTotal(res.total);
      } else if (tab === 'configuracion') {
        const res = await getAuditoriaConfiguracionCreditos({ limit, offset });
        setConfiguracion(res.items);
        setTotal(res.total);
      } else if (tab === 'personas') {
        const res = await getAuditoriaSincronizacionPersonas({
          documento: search ? search.trim() : undefined,
          limit,
          offset,
        });
        setPersonas(res.items);
        setTotal(res.total);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los logs de auditoría');
    } finally {
      setLoading(false);
    }
  }, [tab, limit, offset, search]);

  useEffect(() => {
    setOffset(0);
  }, [tab, search]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const totalPaginas = Math.ceil(total / limit) || 1;
  const paginaActual = Math.floor(offset / limit) + 1;

  const handleVerDetalle = (titulo: string, data: any) => {
    setModalDetalle({ open: true, titulo, data });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header y Selector de Sub-pestañas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
            Auditoría y Trazabilidad del Sistema
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Registro inmutable de transacciones, presentaciones bancarias y configuraciones (Acceso Completo).
          </p>
        </div>

        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '2px' }}>
          {[
            { id: 'prestamos', label: 'Préstamos' },
            { id: 'bapro', label: 'Presentaciones BAPRO' },
            { id: 'configuracion', label: 'Líneas y Motores' },
            { id: 'personas', label: 'Sincronización Personas' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as AuditTab)}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? '#0f172a' : '#64748b',
                background: tab === t.id ? '#ffffff' : 'transparent',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder={
            tab === 'prestamos'
              ? 'Buscar por UUID de préstamo...'
              : tab === 'bapro'
              ? 'Buscar por Nro de Archivo...'
              : tab === 'personas'
              ? 'Buscar por DNI...'
              : 'Filtrar registros...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
        />
        <button
          onClick={cargarDatos}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          Refrescar
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Tabla según el dominio */}
      <AuditoriaTable
        tab={tab}
        loading={loading}
        total={total}
        prestamos={prestamos}
        bapro={bapro}
        configuracion={configuracion}
        personas={personas}
        onVerDetalle={handleVerDetalle}
      />

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', padding: '0.25rem 0.5rem' }}>
        <span>Total: <strong>{total}</strong> registros</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
            disabled={offset === 0 || loading}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span>Página {paginaActual} de {totalPaginas}</span>
          <button
            onClick={() => setOffset((prev) => prev + limit)}
            disabled={offset + limit >= total || loading}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', opacity: offset + limit >= total ? 0.5 : 1 }}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal Detalle JSON */}
      <AuditoriaDetalleModal
        isOpen={modalDetalle.open}
        onClose={() => setModalDetalle({ open: false, titulo: '', data: null })}
        titulo={modalDetalle.titulo}
        data={modalDetalle.data}
      />
    </div>
  );
};
