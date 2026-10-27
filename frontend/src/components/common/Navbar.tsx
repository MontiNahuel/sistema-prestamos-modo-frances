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

export type TabKey =
  'personas' | 'simulador' | 'bapro' | 'respuestas' | 'lineas' | 'motores' | 'reportes' | 'auditoria';

interface NavbarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  esAccesoCompleto?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  esAccesoCompleto
}) => {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'personas', label: 'Buscar Personas', icon: <UsersIcon size={17} /> },
    { key: 'simulador', label: 'Simulador Francés', icon: <CalculatorIcon size={17} /> },
    { key: 'bapro', label: 'Presentación BAPRO', icon: <BuildingIcon size={17} /> },
    { key: 'respuestas', label: 'Carga de respuesta', icon: <FileTextIcon size={17} /> },
    { key: 'reportes', label: 'Reportes', icon: <FileTextIcon size={17} /> },
    { key: 'lineas', label: 'Líneas de Préstamo', icon: <SlidersIcon size={17} /> },
    { key: 'motores', label: 'Motores de Fórmulas', icon: <CpuIcon size={17} /> },
    ...(esAccesoCompleto ? [{ key: 'auditoria' as TabKey, label: 'Auditoría', icon: <FileTextIcon size={17} /> }] : [])
  ];

  return (
    <header className="w-full bg-[#ffffff] [border-bottom:1px_solid_#e2e8f0] p-[0.75rem_2rem] flex justify-between items-center sticky top-0 z-[50] shadow-[0_1px_2px_0_rgba(0,_0,_0,_0.03)]">
      <div className="flex items-center gap-10">
        {/* Brand */}
        <div className="flex items-center gap-[0.625rem]">
          <div className="[background:linear-gradient(135deg,_#1d4ed8_0%,_#2563eb_100%)] text-[#fff] flex items-center justify-center w-[32px] h-[32px] rounded-lg shadow-[0_2px_4px_rgba(37,_99,_235,_0.2)]">
            <BuildingIcon size={18} color="#ffffff" />
          </div>
          <div>
            <div className="font-extrabold text-[1.05rem] text-[#0f172a] leading-[1.1]">
              CoopYa Préstamos
            </div>
            <div className="text-[0.7rem] text-[#64748b] font-medium">
              Microservicio Sistema Francés
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-[0.375rem] flex-wrap">
          {tabs.map((t) => {
            const active = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={[
                  'flex items-center gap-2 p-[0.5rem_0.875rem] rounded-md [border:none]',
                  active ? 'bg-[#eff6ff]' : 'bg-transparent',
                  active ? 'text-[#1d4ed8]' : 'text-[#475569]',
                  active ? 'font-semibold' : 'font-medium',
                  'cursor-pointer text-[0.85rem] [outline:none]'
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={active ? 'text-[#2563eb]' : 'text-[#64748b]'}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-[0.4rem] text-[0.75rem] text-[#047857] bg-[#ecfdf5] [border:1px_solid_#a7f3d0] p-[0.25rem_0.625rem] rounded-[999px] font-semibold">
          <span className="w-[6px] h-[6px] rounded-[50%] bg-[#10b981]" />
          Operador Autenticado
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-[0.4rem] p-[0.45rem_0.85rem] rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#475569] text-[0.825rem] font-medium cursor-pointer hover:[border-color:#94a3b8] hover:text-[#0f172a]"
        >
          <LogoutIcon size={14} color="#64748b" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
};
