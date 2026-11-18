import React from 'react';
import {
  UsersIcon,
  CalculatorIcon,
  SlidersIcon,
  CpuIcon,
  LogoutIcon,
  BuildingIcon,
  FileTextIcon,
  ExternalLinkIcon
} from './Icons';

export type TabKey =
  | 'personas'
  | 'simulador'
  | 'bapro'
  | 'bna'
  | 'respuestas'
  | 'lineas'
  | 'motores'
  | 'cuotas_sociales'
  | 'reportes'
  | 'auditoria';

interface NavbarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  esAccesoCompleto?: boolean;
  sistemaCentralUrl: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  esAccesoCompleto,
  sistemaCentralUrl
}) => {
  const adminItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'lineas', label: 'Líneas de Préstamo', icon: <SlidersIcon size={15} /> },
    { key: 'motores', label: 'Motores de Fórmulas', icon: <CpuIcon size={15} /> },
    { key: 'cuotas_sociales', label: 'Cuotas Sociales', icon: <UsersIcon size={15} /> },
    ...(esAccesoCompleto
      ? [{ key: 'auditoria' as TabKey, label: 'Auditoría', icon: <FileTextIcon size={15} /> }]
      : [])
  ];

  const presentacionesItems: { key: TabKey; label: string }[] = [
    { key: 'bapro', label: 'Presentaciones BAPRO' },
    { key: 'bna', label: 'Presentaciones BNA' }
  ];

  const directTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'personas', label: 'Buscar Personas', icon: <UsersIcon size={17} /> },
    { key: 'simulador', label: 'Simulador Francés', icon: <CalculatorIcon size={17} /> },
    { key: 'respuestas', label: 'Carga de respuesta', icon: <FileTextIcon size={17} /> },
    { key: 'reportes', label: 'Reportes', icon: <FileTextIcon size={17} /> }
  ];

  const renderDropdown = (
    key: string,
    label: string,
    icon: React.ReactNode,
    items: { key: TabKey; label: string; icon?: React.ReactNode }[]
  ) => {
    const active = items.some((it) => it.key === currentTab);
    return (
      <div
        key={key}
        className={`flex items-center gap-2 px-3.5 rounded-md ${
          active ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'text-[#475569]'
        }`}
      >
        {icon}
        <details className="relative group">
          <summary
            className={`list-none py-2 text-[0.85rem] cursor-pointer select-none [&::-webkit-details-marker]:hidden ${
              active ? 'font-semibold' : 'font-medium'
            }`}
          >
            {label} <span aria-hidden="true" className="ml-1 text-xs">▾</span>
          </summary>
          <div className="absolute left-0 top-full z-[60] mt-1 min-w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {items.map((item) => {
              const itemActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={(event) => {
                    onTabChange(item.key);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    itemActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </details>
      </div>
    );
  };

  const renderTabButton = (t: { key: TabKey; label: string; icon: React.ReactNode }) => {
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
        <span className={active ? 'text-[#2563eb]' : 'text-[#64748b]'}>{t.icon}</span>
        <span>{t.label}</span>
      </button>
    );
  };

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
          {renderTabButton(directTabs[0])}
          {renderTabButton(directTabs[1])}
          {renderDropdown('presentaciones', 'Presentaciones', <BuildingIcon size={17} />, presentacionesItems)}
          {renderTabButton(directTabs[2])}
          {renderTabButton(directTabs[3])}
          {renderDropdown('admin', 'Admin', <SlidersIcon size={17} />, adminItems)}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        <a
          href={sistemaCentralUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md [border:1px_solid_#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] text-[0.8rem] font-semibold no-underline hover:bg-[#dbeafe] transition-colors whitespace-nowrap"
        >
          <ExternalLinkIcon size={14} color="#1d4ed8" />
          <span>Ir al Sistema Central</span>
        </a>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="inline-flex items-center justify-center p-2 rounded-md [border:1px_solid_#cbd5e1] bg-[#ffffff] text-[#475569] cursor-pointer hover:[border-color:#94a3b8] hover:text-[#0f172a]"
        >
          <LogoutIcon size={16} color="#475569" />
        </button>
      </div>
    </header>
  );
};
