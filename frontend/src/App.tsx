import { useState, useEffect } from 'react';
import { TabKey, Navbar } from './components/common/Navbar';
import { LoginForm } from './components/auth/LoginForm';
import { PersonasBuscador } from './components/personas/PersonasBuscador';
import { PersonasTabla } from './components/personas/PersonasTabla';
import { PersonaFicha } from './components/personas/PersonaFicha';
import { SimuladorForm } from './components/simulador/SimuladorForm';
import { SimuladorTarjetas } from './components/simulador/SimuladorTarjetas';
import { CronogramaTabla } from './components/simulador/CronogramaTabla';
import { OtorgarPrestamoModal } from './components/simulador/OtorgarPrestamoModal';
import { PrestamosPanel } from './components/prestamos/PrestamosPanel';
import { MotoresPanel } from './components/abm/motores/MotoresPanel';
import { LineasPanel } from './components/abm/lineas/LineasPanel';

import { Persona, CuentaCorrienteResumen, PersonaBusquedaParams } from './types/persona';
import { PlanAmortizacion, SimulacionPayload } from './types/simulacion';
import { Prestamo } from './types/prestamo';
import { buscarPersonas, getCuentaCorriente } from './services/api/personasApi';
import { simularPrestamo } from './services/api/simuladorApi';
import { CheckCircleIcon, FileTextIcon } from './components/common/Icons';

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
  const [ultimoPayload, setUltimoPayload] = useState<SimulacionPayload | null>(null);
  const [planResultado, setPlanResultado] = useState<PlanAmortizacion | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Modal de Otorgamiento
  const [modalOtorgarAbierto, setModalOtorgarAbierto] = useState<boolean>(false);
  const [prestamoOtorgadoExito, setPrestamoOtorgadoExito] = useState<Prestamo | null>(null);

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
    setUltimoPayload(null);
    setPrestamoOtorgadoExito(null);
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
    setUltimoPayload(payload);
    setPrestamoOtorgadoExito(null);

    try {
      const plan = await simularPrestamo(payload);
      setPlanResultado(plan);
    } catch (err: any) {
      setSimError(err.message || 'Error al calcular simulación');
    } finally {
      setSimulando(false);
    }
  };

  // Callback de préstamo otorgado con éxito
  const handlePrestamoOtorgado = (nuevo: Prestamo) => {
    setPrestamoOtorgadoExito(nuevo);
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

      <main style={{ padding: '1.75rem 2.5rem', width: '100%', boxSizing: 'border-box' }}>
        {/* Pestaña: Buscar Personas */}
        {currentTab === 'personas' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Gestión y Búsqueda de Personas
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Consulta de socios, verificación de morosidad y cuentas bancarias en tiempo real desde CoopYa.
              </p>
            </div>

            <PersonasBuscador onBuscar={handleBuscar} buscando={buscando} />

            {busqError && (
              <div style={{ padding: '0.85rem 1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fecaca', fontWeight: 500 }}>
                {busqError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: personaSeleccionada ? 'minmax(0, 1fr) 460px' : '1fr', gap: '1.75rem', alignItems: 'start' }}>
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
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Simulador del Sistema Francés
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Cálculo de amortización y emisión formal de préstamos a socios de la cooperativa.
              </p>
            </div>

            {/* Banner de Éxito al Otorgar */}
            {prestamoOtorgadoExito && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ color: '#16a34a' }}>
                    <CheckCircleIcon size={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.05rem' }}>
                      ¡Préstamo #{prestamoOtorgadoExito.id.substring(0, 8).toUpperCase()} Otorgado con Éxito!
                    </div>
                    <div style={{ color: '#15803d', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                      Titular: <strong>{prestamoOtorgadoExito.persona_nombre}</strong> • Monto: <strong>${(prestamoOtorgadoExito.monto_solicitado_centavos / 100).toLocaleString('es-AR')}</strong> en <strong>{prestamoOtorgadoExito.plazo_meses} cuotas</strong>.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentTab('prestamos')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <FileTextIcon size={16} />
                  Ver en Préstamos Otorgados
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
              <SimuladorForm
                onSimular={handleSimular}
                simulando={simulando}
                personaSeleccionada={personaSeleccionada}
              />

              <div>
                {simError && (
                  <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: 500 }}>
                    {simError}
                  </div>
                )}

                {planResultado ? (
                  <div>
                    {/* Botón CTA para Otorgar Préstamo */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      color: '#ffffff',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '12px',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          ¿Deseas instrumentar este crédito?
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                          {personaSeleccionada
                            ? `Socio titular listo: ${personaSeleccionada.apellido} ${personaSeleccionada.nombre} (DNI ${personaSeleccionada.numeroDoc})`
                            : 'Seleccioná primero un socio en "Buscar Personas" para registrar el legajo formal.'}
                        </div>
                      </div>

                      <button
                        onClick={() => setModalOtorgarAbierto(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.7rem 1.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: personaSeleccionada ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#475569',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: personaSeleccionada ? 'pointer' : 'default',
                          boxShadow: personaSeleccionada ? '0 2px 4px rgba(22, 163, 74, 0.3)' : 'none'
                        }}
                      >
                        <FileTextIcon size={18} />
                        {personaSeleccionada ? 'Otorgar este Préstamo Oficial' : 'Asignar Socio para Otorgar'}
                      </button>
                    </div>

                    <SimuladorTarjetas plan={planResultado} />
                    <CronogramaTabla cronograma={planResultado.cronograma} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#ffffff', borderRadius: '12px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#64748b', marginBottom: '0.5rem' }}>
                      Ninguna simulación calculada
                    </div>
                    Seleccioná una línea o ingresá los parámetros y presioná "Calcular Amortización".
                  </div>
                )}
              </div>
            </div>

            {/* Modal de Otorgamiento */}
            <OtorgarPrestamoModal
              isOpen={modalOtorgarAbierto}
              onClose={() => setModalOtorgarAbierto(false)}
              persona={personaSeleccionada}
              payload={ultimoPayload}
              plan={planResultado}
              onOtorgado={handlePrestamoOtorgado}
            />
          </div>
        )}

        {/* Pestaña: Préstamos Otorgados */}
        {currentTab === 'prestamos' && <PrestamosPanel />}

        {/* Pestaña: ABM Líneas de Préstamo */}
        {currentTab === 'lineas' && <LineasPanel />}

        {/* Pestaña: ABM Motores de Fórmulas */}
        {currentTab === 'motores' && <MotoresPanel />}
      </main>
    </div>
  );
}
