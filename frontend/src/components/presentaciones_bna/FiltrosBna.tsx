import React from 'react';
import { FiltrosOriginanteBna } from './FiltrosOriginanteBna';

interface FiltrosBnaProps {
  fechaImpacto: string;
  setFechaImpacto: (val: string) => void;
  fechaDesde: string;
  setFechaDesde: (val: string) => void;
  fechaHasta: string;
  setFechaHasta: (val: string) => void;
  nroLista: number | '';
  setNroLista: (val: number | '') => void;
  estadoNroLista: string;
  nroListaValido: boolean | null;
  onValidarNroLista: () => void;
  nombreArchivo: string;
  setNombreArchivo: (val: string) => void;
  onRestablecerNombreArchivo: () => void;
  casa: string;
  setCasa: (val: string) => void;
  producto: string;
  setProducto: (val: string) => void;
  cuenta: string;
  setCuenta: (val: string) => void;
  indicadorLote: string;
  setIndicadorLote: (val: string) => void;
  incluirPresentadas: boolean;
  setIncluirPresentadas: (val: boolean) => void;
  onBuscar: () => void;
  onLimpiar: () => void;
  loading: boolean;
}

export const FiltrosBna: React.FC<FiltrosBnaProps> = ({
  fechaImpacto,
  setFechaImpacto,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  nroLista,
  setNroLista,
  estadoNroLista,
  nroListaValido,
  onValidarNroLista,
  nombreArchivo,
  setNombreArchivo,
  onRestablecerNombreArchivo,
  casa,
  setCasa,
  producto,
  setProducto,
  cuenta,
  setCuenta,
  indicadorLote,
  setIndicadorLote,
  incluirPresentadas,
  setIncluirPresentadas,
  onBuscar,
  onLimpiar,
  loading,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        padding: '1.25rem',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Fila 1: Fechas y Número de Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Fecha de Impacto / Rendición
          </label>
          <input
            type="date"
            value={fechaImpacto}
            onChange={(e) => setFechaImpacto(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Vencimiento Cuota (Desde)
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Vencimiento Cuota (Hasta)
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>N.º de Lista BNA</label>
            {estadoNroLista && (
              <span style={{ fontSize: '0.7rem', color: nroListaValido ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {estadoNroLista}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="number"
              value={nroLista}
              onChange={(e) => setNroLista(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ej: 1935"
              style={{
                flex: 1,
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: nroListaValido === false ? '1px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="button"
              onClick={onValidarNroLista}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Validar
            </button>
          </div>
        </div>
      </div>

      {/* Fila 2: Parámetros Originantes BNA */}
      <FiltrosOriginanteBna
        casa={casa}
        setCasa={setCasa}
        producto={producto}
        setProducto={setProducto}
        cuenta={cuenta}
        setCuenta={setCuenta}
        indicadorLote={indicadorLote}
        setIndicadorLote={setIndicadorLote}
        nombreArchivo={nombreArchivo}
        setNombreArchivo={setNombreArchivo}
        onRestablecerNombreArchivo={onRestablecerNombreArchivo}
      />

      {/* Fila 3: Acciones y checkbox */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={incluirPresentadas}
            onChange={(e) => setIncluirPresentadas(e.target.checked)}
          />
          <span>Incluir cuotas ya presentadas</span>
        </label>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onLimpiar}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Limpiar Filtros
          </button>
          <button
            type="button"
            onClick={onBuscar}
            disabled={loading}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
            }}
          >
            {loading ? 'Buscando...' : 'Buscar Cuotas BNA'}
          </button>
        </div>
      </div>
    </div>
  );
};
