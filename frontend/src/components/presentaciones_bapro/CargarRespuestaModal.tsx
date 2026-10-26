import React, { useState } from 'react';
import { cargarRespuestaBapro } from '../../services/api/presentacionesBaproApi';
import { ProcesarRespuestaBaproResponse } from '../../types/presentacionesBapro';

interface CargarRespuestaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRespuestaProcesada?: () => void;
}

export const CargarRespuestaModal: React.FC<CargarRespuestaModalProps> = ({
  isOpen,
  onClose,
  onRespuestaProcesada,
}) => {
  const [nroArchivo, setNroArchivo] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ProcesarRespuestaBaproResponse | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroArchivo || !file) {
      setError('Debes ingresar el número de archivo y seleccionar un archivo .txt');
      return;
    }
    setError(null);
    setLoading(true);
    setResultado(null);
    try {
      const res = await cargarRespuestaBapro(Number(nroArchivo), file);
      setResultado(res);
      if (onRespuestaProcesada) onRespuestaProcesada();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la rendición de BAPRO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '10px', width: '90%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Cargar Rendición Bancaria BAPRO</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Número de Archivo / Lote Presentado:</label>
            <input
              type="number"
              required
              min={1}
              value={nroArchivo}
              onChange={(e) => setNroArchivo(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ej: 28"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Archivo de Respuesta (.txt de 163 chars):</label>
            <input
              type="file"
              required
              accept=".txt"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.65rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Procesando archivo...' : 'Imputar Débitos en Base de Datos'}
          </button>
        </form>

        {resultado && (
          <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Resultado de la Rendición:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>Total Registros: <strong>{resultado.total_procesados}</strong></div>
              <div style={{ color: '#16a34a' }}>Cobrados/Pagados: <strong>{resultado.aprobados}</strong></div>
              <div style={{ color: '#dc2626' }}>Rechazados: <strong>{resultado.rechazados}</strong></div>
              <div style={{ color: '#64748b' }}>No coincidentes: <strong>{resultado.no_encontrados}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
