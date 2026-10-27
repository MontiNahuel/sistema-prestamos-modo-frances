import React from 'react';

interface FiltrosOriginanteBnaProps {
  casa: string;
  setCasa: (val: string) => void;
  producto: string;
  setProducto: (val: string) => void;
  cuenta: string;
  setCuenta: (val: string) => void;
  indicadorLote: string;
  setIndicadorLote: (val: string) => void;
  nombreArchivo: string;
  setNombreArchivo: (val: string) => void;
  onRestablecerNombreArchivo: () => void;
}

export const FiltrosOriginanteBna: React.FC<FiltrosOriginanteBnaProps> = ({
  casa,
  setCasa,
  producto,
  setProducto,
  cuenta,
  setCuenta,
  indicadorLote,
  setIndicadorLote,
  nombreArchivo,
  setNombreArchivo,
  onRestablecerNombreArchivo,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
          Casa Originante
        </label>
        <input
          type="text"
          maxLength={4}
          value={casa}
          onChange={(e) => setCasa(e.target.value)}
          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
          Producto
        </label>
        <select
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        >
          <option value="10">10 - Cuenta Corriente</option>
          <option value="20">20 - Caja de Ahorro</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
          Cuenta Originante
        </label>
        <input
          type="text"
          maxLength={10}
          value={cuenta}
          onChange={(e) => setCuenta(e.target.value)}
          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
          Indicador de Lote
        </label>
        <select
          value={indicadorLote}
          onChange={(e) => setIndicadorLote(e.target.value)}
          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        >
          <option value="REE">REE - Clientes Comunes / Pasivos</option>
          <option value="EMP">EMP - Haberes BNA</option>
          <option value="BNA">BNA - Empleados BNA</option>
        </select>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Nombre Archivo</label>
          <button
            type="button"
            onClick={onRestablecerNombreArchivo}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}
          >
            Restablecer
          </button>
        </div>
        <input
          type="text"
          value={nombreArchivo}
          onChange={(e) => setNombreArchivo(e.target.value)}
          style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
      </div>
    </div>
  );
};
