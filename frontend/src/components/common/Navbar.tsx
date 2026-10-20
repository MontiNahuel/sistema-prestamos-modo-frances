import React from 'react';

export type TabKey = 'personas' | 'simulador' | 'lineas' | 'motores';

interface NavbarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onLogout }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'personas', label: 'Buscar Personas' },
    { key: 'simulador', label: 'Simulador Francés' },
    { key: 'lineas', label: 'Líneas de Préstamo (ABM)' },
    { key: 'motores', label: 'Motores de Fórmulas (ABM)' }
  ];

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: '#2563eb',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '6px'
          }}>
            CY
          </span>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>
            Préstamos CoopYa
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '0.375rem' }}>
          {tabs.map(t => {
            const active = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#1d4ed8' : '#4b5563',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{
          fontSize: '0.75rem',
          color: '#059669',
          background: '#d1fae5',
          padding: '0.25rem 0.625rem',
          borderRadius: '999px',
          fontWeight: 600
        }}>
          Sesión Activa
        </span>
        <button
          onClick={onLogout}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: '#4b5563',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};
