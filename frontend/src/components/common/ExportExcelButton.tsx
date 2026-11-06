import { useState } from 'react';

/** Botón compartido que controla el progreso y los errores de una exportación. */
export function ExportExcelButton({ onExport, disabled = false }: {
  onExport: () => Promise<void>;
  disabled?: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  /** Ejecuta la descarga y permite reintentar si falla. */
  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await onExport();
    } catch {
      setError('No se pudo exportar a Excel. Intentá nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleExport} disabled={disabled || exporting}
        style={{ padding: '0.55rem 0.85rem', border: '1px solid #15803d', borderRadius: '8px', background: '#15803d', color: '#fff', fontWeight: 600, cursor: disabled || exporting ? 'default' : 'pointer', opacity: disabled || exporting ? 0.6 : 1 }}>
        {exporting ? 'Exportando…' : 'Exportar a Excel'}
      </button>
      {error && <div role="alert" style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '0.35rem' }}>{error}</div>}
    </div>
  );
}
