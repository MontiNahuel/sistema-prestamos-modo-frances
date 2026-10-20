import { useState, useEffect } from 'react';
import { TabKey, Navbar } from './components/common/Navbar';
import { LoginForm } from './components/auth/LoginForm';
import { PersonasBuscador } from './components/personas/PersonasBuscador';
import { PersonasTabla } from './components/personas/PersonasTabla';
import { PersonaFicha } from './components/personas/PersonaFicha';
import { SimuladorForm } from './components/simulador/SimuladorForm';
import { SimuladorTarjetas } from './components/simulador/SimuladorTarjetas';
import { CronogramaTabla } from './components/simulador/CronogramaTabla';
import { MotoresPanel } from './components/abm/motores/MotoresPanel';
import { LineasPanel } from './components/abm/lineas/LineasPanel';

import { Persona, CuentaCorrienteResumen, PersonaBusquedaParams } from './types/persona';
import { PlanAmortizacion, SimulacionPayload } from './types/simulacion';
import { buscarPersonas, getCuentaCorriente } from './services/api/personasApi';
import { simularPrestamo } from './services/api/simuladorApi';

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('coopya_token') || '');
  const [currentTab, setCurrentTab] = useState<TabKey>('personas');

  // Estado de Personas
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [buscando, setBuscando] = useState<boolean>(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [ccResumen, setCcResumen] = useState<CuentaCorrienteResumen | null>(null);
  const [cargandoCc, setCargandoCc] = useState<boolean>(false);
  const [busqError, setBusqError] = useState<string | null>(null);

  // Estado de Simulación
  const [simulando, setSimulando] = useState<boolean>(false);
  const [planResultado, setPlanResultado] = useState<PlanAmortizacion | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('coopya_token', token);
    } else {
      localStorage.removeItem('coopya_token');
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken('');
    setPersonaSeleccionada(null);
    setPersonas([]);
    setCcResumen(null);
    setPlanResultado(null);
  };

  // Buscar Personas
  const handleBuscar = async (params: PersonaBusquedaParams) => {
    setBuscando(true);
    setBusqError(null);
    setPersonaSeleccionada(null);
    setCcResumen(null);

    try {
      const data = await buscarPersonas(params);
      setPersonas(data);
    } catch (err: any) {
      setBusqError(err.message || 'Error al buscar personas');
    } finally {
      setBuscando(false);
    }
  };

  // Seleccionar Persona y ver Cuenta Corriente
  const handleSeleccionarPersona = async (p: Persona) => {
    setPersonaSeleccionada(p);
    setCargandoCc(true);
    setCcResumen(null);

    try {
      const cc = await getCuentaCorriente(p.idPersona);
      setCcResumen(cc);
    } catch (err: any) {
      console.error('Error al cargar CC:', err);
    } finally {
      setCargandoCc(false);
    }
  };

  // Transferir socio al simulador
  const handleSimularParaSocio = (p: Persona) => {
    setPersonaSeleccionada(p);
    setCurrentTab('simulador');
  };

  // Ejecutar Simulación
  const handleSimular = async (payload: SimulacionPayload) => {
    setSimulando(true);
    setSimError(null);

    try {
      const plan = await simularPrestamo(payload);
      setPlanResultado(plan);
    } catch (err: any) {
      setSimError(err.message || 'Error al calcular simulación');
    } finally {
      setSimulando(false);
    }
  };

  // Si no está autenticado, mostramos el login
  if (!token) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb', color: '#1f2937' }}>
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
      />

      <main style={{ padding: '2rem', maxWidth: '1240px', margin: '0 auto' }}>
        {/* Pestaña: Buscar Personas */}
        {currentTab === 'personas' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Gestión y Búsqueda de Personas
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Consulta de socios, verificación de morosidad y cuentas bancarias en tiempo real desde CoopYa.
              </p>
            </div>

            <PersonasBuscador onBuscar={handleBuscar} buscando={buscando} />

            {busqError && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.5rem' }}>
                {busqError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: personaSeleccionada ? '1fr 420px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              <PersonasTabla
                personas={personas}
                personaSeleccionada={personaSeleccionada}
                onSeleccionar={handleSeleccionarPersona}
                buscando={buscando}
              />

              {personaSeleccionada && (
                <PersonaFicha
                  persona={personaSeleccionada}
                  ccResumen={ccResumen}
                  cargandoCc={cargandoCc}
                  onSimularParaSocio={handleSimularParaSocio}
                />
              )}
            </div>
          </div>
        )}

        {/* Pestaña: Simulador Francés */}
        {currentTab === 'simulador' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Simulador del Sistema Francés
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Cálculo de cuotas de amortización según el plan y motor de fórmula seleccionados.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>
              <SimuladorForm
                onSimular={handleSimular}
                simulando={simulando}
                personaSeleccionada={personaSeleccionada}
              />

              <div>
                {simError && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>
                    {simError}
                  </div>
                )}

                {planResultado ? (
                  <div>
                    <SimuladorTarjetas plan={planResultado} />
                    <CronogramaTabla cronograma={planResultado.cronograma} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '8px', border: '2px dashed #e5e7eb', color: '#9ca3af' }}>
                    Seleccioná una línea o ingresá los parámetros y presioná "Calcular Amortización".
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: ABM Líneas de Préstamo */}
        {currentTab === 'lineas' && <LineasPanel />}

        {/* Pestaña: ABM Motores de Fórmulas */}
        {currentTab === 'motores' && <MotoresPanel />}
      </main>
    </div>
  );
}
