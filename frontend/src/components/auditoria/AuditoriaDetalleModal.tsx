import React from 'react';
import { Modal } from '../common/Modal';

interface AuditoriaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  data: Record<string, any> | null;
}

export const AuditoriaDetalleModal: React.FC<AuditoriaDetalleModalProps> = ({
  isOpen,
  onClose,
  titulo,
  data,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
          Detalle inmutable registrado en la base de datos de auditoría:
        </p>
        <pre
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontFamily: 'Consolas, monospace',
            overflowX: 'auto',
            maxHeight: '400px',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {data ? JSON.stringify(data, null, 2) : 'Sin datos adicionales'}
        </pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
