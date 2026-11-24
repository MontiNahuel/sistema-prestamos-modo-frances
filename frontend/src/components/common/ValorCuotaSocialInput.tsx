import React from 'react';

interface ValorCuotaSocialInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  defaultPesos: number;
}

export const ValorCuotaSocialInput: React.FC<ValorCuotaSocialInputProps> = ({
  value,
  onChange,
  defaultPesos,
}) => {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#1e40af',
          marginBottom: '4px',
        }}
      >
        Valor Cuota Social ($)
      </label>
      <input
        type="number"
        min={1}
        step="any"
        aria-label="Valor Cuota Social ($)"
        placeholder={String(defaultPesos)}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{
          width: '100%',
          padding: '0.45rem 0.65rem',
          borderRadius: '6px',
          border: '1px solid #93c5fd',
          background: '#eff6ff',
          color: '#0f172a',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};
