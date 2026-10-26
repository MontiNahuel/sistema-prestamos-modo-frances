import React from 'react';
import { EmpresaOriginante } from '../../types/presentacionesBapro';

interface FiltrosBaproProps {
  empresas: EmpresaOriginante[];
  empresaId: number | undefined;
  onEmpresaChange: (id: number) => void;
  dniDesde: number | '';
  setDniDesde: (val: number | '') => void;
  dniHasta: number | '';
  setDniHasta: (val: number | '') => void;
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
  incluirPresentadas: boolean;
  setIncluirPresentadas: (val: boolean) => void;
  aplicarDesglose: boolean;
  setAplicarDesglose: (val: boolean) => void;
  montoMinimoDesglose: number;
  setMontoMinimoDesglose: (val: number) => void;
  onBuscar: () => void;
  onLimpiar: () => void;
  loading: boolean;
}

export const FiltrosBapro: React.FC<FiltrosBaproProps> = ({
  empresas, empresaId, onEmpresaChange,
  dniDesde, setDniDesde, dniHasta, setDniHasta,
  fechaImpacto, setFechaImpacto,
  fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
  nroLista, setNroLista, estadoNroLista, nroListaValido, onValidarNroLista,
  nombreArchivo, setNombreArchivo, onRestablecerNombreArchivo,
  incluirPresentadas, setIncluirPresentadas,
  aplicarDesglose, setAplicarDesglose,
  montoMinimoDesglose, setMontoMinimoDesglose,
  onBuscar, onLimpiar, loading,
}) => {
  const digitos = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Fila 1: Empresa, DNI y Fecha de Impacto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Empresa</label>
          <select value={empresaId || ''} onChange={(e) => onEmpresaChange(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.razon_social} ({e.cuit})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Último dígito DNI</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <select
              value={dniDesde}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setDniDesde(val);
                if (val !== '' && dniHasta === '') setDniHasta(val);
              }}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Desde</option>
              {digitos.map((d) => (<option key={`d-${d}`} value={d}>{d}</option>))}
            </select>
            <select
              value={dniHasta}
              onChange={(e) => setDniHasta(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Hasta</option>
              {digitos.map((d) => (<option key={`h-${d}`} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Fecha de Impacto (en TXT)</label>
          <input type="date" value={fechaImpacto} onChange={(e) => setFechaImpacto(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Fila 2: Nro de Lista, Nombre del Archivo y Desglose */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nro de Lista</label>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <input type="number" min={1} value={nroLista} onChange={(e) => setNroLista(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            <button type="button" onClick={onValidarNroLista} style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ✓ Validar
            </button>
          </div>
          <small style={{ fontSize: '0.72rem', color: nroListaValido === false ? '#dc2626' : nroListaValido === true ? '#16a34a' : '#64748b' }}>
            {estadoNroLista}
          </small>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nombre del archivo</label>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <input type="text" value={nombreArchivo} onChange={(e) => setNombreArchivo(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }} />
            <button type="button" onClick={onRestablecerNombreArchivo} title="Restablecer nombre propuesto" style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}>
              🔄
            </button>
          </div>
          <small style={{ fontSize: '0.72rem', color: '#64748b' }}>Propuesto por el sistema.</small>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Opciones adicionales</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={incluirPresentadas} onChange={(e) => setIncluirPresentadas(e.target.checked)} />
              Incluir cuotas presentadas
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={aplicarDesglose} onChange={(e) => setAplicarDesglose(e.target.checked)} />
                Desglose (2 partes)
              </label>
              {aplicarDesglose && (
                <input type="number" min={1000} step={1000} value={montoMinimoDesglose} onChange={(e) => setMontoMinimoDesglose(Number(e.target.value))} title="Monto mínimo para desglosar ($)" style={{ width: '85px', padding: '0.2rem 0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fila 3: Rango Fecha Desde / Hasta y Acciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Fecha Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Fecha Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={onBuscar} disabled={loading} style={{ flex: 1, padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Buscando...' : '🔍 Buscar'}
          </button>
          <button type="button" onClick={onLimpiar} style={{ padding: '0.5rem 0.9rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            ⊗ Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};
