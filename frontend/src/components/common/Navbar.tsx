import React from 'react';
import {
  UsersIcon,
  CalculatorIcon,
  SlidersIcon,
  CpuIcon,
  LogoutIcon,
  BuildingIcon,
  FileTextIcon
} from './Icons';

export type TabKey = 'personas' | 'simulador' | 'prestamos' | 'bapro' | 'lineas' | 'motores' | 'reportes' | 'auditoria';

interface NavbarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  esAccesoCompleto?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onLogout, esAccesoCompleto }) => {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'personas', label: 'Buscar Personas', icon: <UsersIcon size={17} /> },
    { key: 'simulador', label: 'Simulador Francés', icon: <CalculatorIcon size={17} /> },
    { key: 'prestamos', label: 'Préstamos Otorgados', icon: <FileTextIcon size={17} /> },
    { key: 'bapro', label: 'Presentación BAPRO', icon: <BuildingIcon size={17} /> },
    { key: 'reportes', label: 'Reportes', icon: <FileTextIcon size={17} /> },
    { key: 'lineas', label: 'Líneas de Préstamo', icon: <SlidersIcon size={17} /> },
    { key: 'motores', label: 'Motores de Fórmulas', icon: <CpuIcon size={17} /> },
    ...(esAccesoCompleto ? [{ key: 'auditoria' as TabKey, label: 'Auditoría', icon: <FileTextIcon size={17} /> }] : [])
  ];

  return (
    <header style={{
      width: '100%',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}>
            <BuildingIcon size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.1 }}>
              CoopYa Préstamos
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
              Microservicio Sistema Francés
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {tabs.map((t) => {
            const active = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#1d4ed8' : '#475569',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <span style={{ color: active ? '#2563eb' : '#64748b' }}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: '#047857',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '0.25rem 0.625rem',
          borderRadius: '999px',
          fontWeight: 600
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          Operador Autenticado
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            fontSize: '0.825rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#94a3b8';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#475569';
          }}
        >
          <LogoutIcon size={14} color="#64748b" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
};
