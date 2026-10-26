import React, { useState, useEffect } from 'react';
import { EmpresaOriginante, EmpresaOriginanteCreate } from '../../types/presentacionesBapro';
import {
  getEmpresasOriginantes,
  crearEmpresaOriginante,
  actualizarEmpresaOriginante,
} from '../../services/api/presentacionesBaproApi';

interface EmpresasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmpresasChanged?: () => void;
}

export const EmpresasModal: React.FC<EmpresasModalProps> = ({ isOpen, onClose, onEmpresasChanged }) => {
  const [empresas, setEmpresas] = useState<EmpresaOriginante[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<EmpresaOriginanteCreate>({
    cuit: '',
    razon_social: '',
    nombre_fantasia: '',
    prefijo_archivo: 'EBT_COOPCREDITOYALTDA',
    descripcion_transaccion: 'SERVICI014',
    activo: true,
    predeterminado: false,
  });

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getEmpresasOriginantes(false);
      setEmpresas(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) cargar();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await crearEmpresaOriginante(form);
      setForm({
        cuit: '',
        razon_social: '',
        nombre_fantasia: '',
        prefijo_archivo: 'EBT_COOPCREDITOYALTDA',
        descripcion_transaccion: 'SERVICI014',
        activo: true,
        predeterminado: false,
      });
      await cargar();
      if (onEmpresasChanged) onEmpresasChanged();
    } catch (err: any) {
      setError(err.message || 'Error al guardar empresa');
    }
  };

  const handleTogglePredeterminado = async (id: number) => {
    try {
      await actualizarEmpresaOriginante(id, { predeterminado: true });
      await cargar();
      if (onEmpresasChanged) onEmpresasChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '10px', width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>ABM Empresas Originantes (BAPRO)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>CUIT (11 dígitos):</label>
            <input required maxLength={11} value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Razón Social:</label>
            <input required value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nombre Fantasía:</label>
            <input value={form.nombre_fantasia || ''} onChange={(e) => setForm({ ...form, nombre_fantasia: e.target.value })} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Prefijo Archivo:</label>
            <input required value={form.prefijo_archivo} onChange={(e) => setForm({ ...form, prefijo_archivo: e.target.value })} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ padding: '0.45rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
              {loading ? 'Guardando...' : '+ Agregar Empresa'}
            </button>
          </div>
        </form>

        <h4 style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>Empresas Registradas</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '6px' }}>CUIT</th>
              <th style={{ padding: '6px' }}>Razón Social</th>
              <th style={{ padding: '6px' }}>Prefijo</th>
              <th style={{ padding: '6px' }}>Predeterminada</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px', fontFamily: 'monospace' }}>{emp.cuit}</td>
                <td style={{ padding: '6px', fontWeight: 600 }}>{emp.razon_social}</td>
                <td style={{ padding: '6px', color: '#64748b' }}>{emp.prefijo_archivo}</td>
                <td style={{ padding: '6px' }}>
                  {emp.predeterminado ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Por Defecto</span>
                  ) : (
                    <button onClick={() => handleTogglePredeterminado(emp.id)} style={{ padding: '2px 6px', fontSize: '0.75rem', cursor: 'pointer' }}>Elegir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
