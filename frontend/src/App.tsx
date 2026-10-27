import { useState, useEffect, useMemo, useRef } from 'react';
import { TabKey, Navbar } from './components/common/Navbar';
import { LoginForm } from './components/auth/LoginForm';
import { PersonasBuscador } from './components/personas/PersonasBuscador';
import { PersonasTabla } from './components/personas/PersonasTabla';
import { PersonaFicha } from './components/personas/PersonaFicha';
import { PersonaCrearModal } from './components/personas/PersonaCrearModal';
import { SimuladorForm } from './components/simulador/SimuladorForm';
import { SimuladorTarjetas } from './components/simulador/SimuladorTarjetas';
import { CronogramaTabla } from './components/simulador/CronogramaTabla';
import { OtorgarPrestamoModal } from './components/simulador/OtorgarPrestamoModal';
import { MotoresPanel } from './components/abm/motores/MotoresPanel';
import { LineasPanel } from './components/abm/lineas/LineasPanel';
import { LineaModal } from './components/abm/lineas/LineaModal';
import { ReportesPanel } from './features/reportes/ReportesPanel';
import { AuditoriaPanel } from './components/auditoria/AuditoriaPanel';
import { PresentacionesBaproPanel } from './components/presentaciones_bapro/PresentacionesBaproPanel';
import { RespuestasPanel } from './features/respuestas/RespuestasPanel';
import { getPerfilActual } from './services/api/authApi';
import { UserProfile } from './types/auth';
import { createLinea } from './services/api/lineasApi';

import {
  Persona,
  CuentaCorrienteResumen,
  PersonaBusquedaParams
} from './types/persona';
import { PlanAmortizacion, SimulacionPayload } from './types/simulacion';
import { Prestamo } from './types/prestamo';
import { buscarPersonas, getCuentaCorriente } from './services/api/personasApi';
import { simularPrestamo } from './services/api/simuladorApi';
import { CheckCircleIcon, FileTextIcon } from './components/common/Icons';

export default function App() {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem('coopya_token') || ''
  );
  const [currentTab, setCurrentTab] = useState<TabKey>('personas');
  const [perfil, setPerfil] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (token) {
      getPerfilActual().then(setPerfil).catch(() => setPerfil(null));
    } else {
      setPerfil(null);
    }
  }, [token]);
  const [reportePrestamoId, setReportePrestamoId] = useState<
    string | undefined
  >();

  // Estado de Personas
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [buscando, setBuscando] = useState<boolean>(false);
  const [personaSeleccionada, setPersonaSeleccionada] =
    useState<Persona | null>(null);
  const [ccResumen, setCcResumen] = useState<CuentaCorrienteResumen | null>(
    null
  );
  const [cargandoCc, setCargandoCc] = useState<boolean>(false);
  const [busqError, setBusqError] = useState<string | null>(null);
  const [modalCrearPersonaAbierto, setModalCrearPersonaAbierto] =
    useState(false);

  // Estado de Simulación
  const [simulando, setSimulando] = useState<boolean>(false);
  const [ultimoPayload, setUltimoPayload] = useState<SimulacionPayload | null>(
    null
  );
  const [planResultado, setPlanResultado] = useState<PlanAmortizacion | null>(
    null
  );
  const [simError, setSimError] = useState<string | null>(null);
  const [modalLineaAbierto, setModalLineaAbierto] = useState(false);
  const [lineaCreada, setLineaCreada] = useState<string | null>(null);
  const [revisionLineas, setRevisionLineas] = useState(0);
  const [nuevaLinea, setNuevaLinea] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const revisionSimulacion = useRef(0);
  const condicionesSimuladas = useMemo(
    () =>
      ultimoPayload && planResultado && ultimoPayload.motor_id
        ? {
            motor_id: ultimoPayload.motor_id,
            tasa: Number(planResultado.tasa_anual),
            iva: Number(planResultado.alicuota_iva),
            monto: ultimoPayload.monto_centavos,
            plazo: ultimoPayload.plazo_meses
          }
        : undefined,
    [ultimoPayload, planResultado]
  );

  const invalidarSimulacion = () => {
    revisionSimulacion.current += 1;
    setPlanResultado(null);
    setUltimoPayload(null);
    setSimError(null);
    setLineaCreada(null);
    setModalLineaAbierto(false);
    setModalOtorgarAbierto(false);
  };

  const iniciarNuevaLinea = () => {
    invalidarSimulacion();
    setNuevaLinea(true);
    setFormVersion((v) => v + 1);
    setCurrentTab('simulador');
  };

  // Modal de Otorgamiento
  const [modalOtorgarAbierto, setModalOtorgarAbierto] =
    useState<boolean>(false);
  const [prestamoOtorgadoExito, setPrestamoOtorgadoExito] =
    useState<Prestamo | null>(null);

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
    invalidarSimulacion();
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
    invalidarSimulacion();
    setPersonaSeleccionada(p);
    setCurrentTab('simulador');
  };

  // Ejecutar Simulación
  const handleSimular = async (payload: SimulacionPayload) => {
    const revision = ++revisionSimulacion.current;
    setSimulando(true);
    setPlanResultado(null);
    setLineaCreada(null);
    setSimError(null);
    setUltimoPayload(payload);
    setPrestamoOtorgadoExito(null);

    try {
      const plan = await simularPrestamo(payload);
      if (revision === revisionSimulacion.current) setPlanResultado(plan);
    } catch (err: any) {
      if (revision === revisionSimulacion.current)
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
    <div className="[font-family:system-ui,_sans-serif] min-h-screen bg-[#f9fafb] text-[#1f2937]">
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab !== currentTab) invalidarSimulacion();
          if (tab === 'reportes') setReportePrestamoId(undefined);
          setCurrentTab(tab);
        }}
        onLogout={handleLogout}
        esAccesoCompleto={perfil?.es_acceso_completo}
      />

      <main className="p-[1.75rem_2.5rem] w-full box-border">
        {/* Pestaña: Buscar Personas */}
        {currentTab === 'personas' && (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[1.6rem] font-bold m-0 text-[#0f172a] tracking-[-0.02em]">
                  Gestión y Búsqueda de Personas
                </h2>
                <p className="m-[0.35rem_0_0] text-[#64748b] text-[0.9rem]">
                  Consulta de socios, verificación de morosidad y cuentas
                  bancarias en tiempo real desde CoopYa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalCrearPersonaAbierto(true)}
                className="flex items-center gap-[0.4rem] p-[0.65rem_1.25rem] bg-[#2563eb] text-[#ffffff] [border:none] rounded-lg font-semibold text-[0.875rem] cursor-pointer shadow-[0_1px_2px_rgba(37,_99,_235,_0.2)]"
              >
                <span>+ Nueva Persona</span>
              </button>
            </div>

            <PersonasBuscador onBuscar={handleBuscar} buscando={buscando} />

            {busqError && (
              <div className="p-[0.85rem_1.25rem] bg-[#fee2e2] text-[#991b1b] rounded-lg mb-6 [border:1px_solid_#fecaca] font-medium">
                {busqError}
              </div>
            )}

            <div
              className={[
                'grid',
                personaSeleccionada
                  ? 'grid-cols-[minmax(0,_1fr)_460px]'
                  : 'grid-cols-[1fr]',
                'gap-7 [align-items:start]'
              ]
                .filter(Boolean)
                .join(' ')}
            >
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

            <PersonaCrearModal
              isOpen={modalCrearPersonaAbierto}
              onClose={() => setModalCrearPersonaAbierto(false)}
              onPersonaCreada={(res) => {
                handleBuscar({ documento: res.documento });
              }}
            />
          </div>
        )}

        {/* Pestaña: Simulador Francés */}
        {currentTab === 'simulador' && (
          <div>
            <div className="mb-6">
              <h2 className="text-[1.6rem] font-bold m-0 text-[#0f172a] tracking-[-0.02em]">
                Simulador del Sistema Francés
              </h2>
              <p className="m-[0.35rem_0_0] text-[#64748b] text-[0.9rem]">
                Simulá las condiciones, calculá las cuotas y creá una línea de
                préstamo desde el resultado.
              </p>
            </div>

            {/* Banner de Éxito al Otorgar */}
            {prestamoOtorgadoExito && (
              <div className="mb-6 p-5 bg-[#f0fdf4] [border:1px_solid_#bbf7d0] rounded-xl flex justify-between items-center flex-wrap gap-4 shadow-[0_2px_4px_rgba(22,_163,_74,_0.08)]">
                <div className="flex items-center gap-3">
                  <div className="text-[#16a34a]">
                    <CheckCircleIcon size={28} />
                  </div>
                  <div>
                    <div className="font-bold text-[#166534] text-[1.05rem]">
                      ¡Préstamo #
                      {prestamoOtorgadoExito.id.substring(0, 8).toUpperCase()}{' '}
                      Otorgado con Éxito!
                    </div>
                    <div className="text-[#15803d] text-[0.875rem] mt-[0.2rem]">
                      Titular:{' '}
                      <strong>{prestamoOtorgadoExito.persona_nombre}</strong> •
                      Monto:{' '}
                      <strong>
                        $
                        {(
                          prestamoOtorgadoExito.monto_solicitado_centavos / 100
                        ).toLocaleString('es-AR')}
                      </strong>{' '}
                      en{' '}
                      <strong>
                        {prestamoOtorgadoExito.plazo_meses} cuotas
                      </strong>
                      .
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setReportePrestamoId(prestamoOtorgadoExito.id);
                    setCurrentTab('reportes');
                  }}
                  className="inline-flex items-center gap-2 p-[0.6rem_1.25rem] rounded-lg [border:none] bg-[#16a34a] text-[#ffffff] font-semibold text-[0.875rem] cursor-pointer"
                >
                  <FileTextIcon size={16} />
                  Ver en Reportes → Préstamos otorgados
                </button>
              </div>
            )}

            <div className="grid grid-cols-[380px_minmax(0,_1fr)] gap-8 [align-items:start]">
              <SimuladorForm
                key={formVersion}
                onSimular={handleSimular}
                onParametrosChange={invalidarSimulacion}
                nuevaLinea={nuevaLinea}
                revisionLineas={revisionLineas}
                simulando={simulando}
                personaSeleccionada={personaSeleccionada}
              />

              <div>
                {simError && (
                  <div className="mb-5 p-[0.85rem_1.25rem] bg-[#fee2e2] text-[#991b1b] rounded-lg [border:1px_solid_#fecaca] font-medium">
                    {simError}
                  </div>
                )}

                {planResultado ? (
                  <div>
                    {/* Botón CTA para Otorgar Préstamo */}
                    <div className="[background:linear-gradient(135deg,_#1e293b_0%,_#0f172a_100%)] text-[#ffffff] p-[1.25rem_1.5rem] rounded-xl mb-6 flex justify-between items-center flex-wrap gap-4 shadow-[0_4px_6px_-1px_rgba(0,_0,_0,_0.1)]">
                      <div>
                        <div className="text-[1.1rem] font-bold">
                          ¿Deseas instrumentar este crédito?
                        </div>
                        <div className="text-[#94a3b8] text-[0.85rem] mt-[0.2rem]">
                          {personaSeleccionada
                            ? `Socio titular listo: ${personaSeleccionada.apellido} ${personaSeleccionada.nombre} (DNI ${personaSeleccionada.numeroDoc})`
                            : 'Seleccioná primero un socio en "Buscar Personas" para registrar el legajo formal.'}
                        </div>
                      </div>

                      <button
                        onClick={() => setModalOtorgarAbierto(true)}
                        className={[
                          'inline-flex items-center gap-2 p-[0.7rem_1.5rem] rounded-lg [border:none]',
                          personaSeleccionada
                            ? '[background:linear-gradient(135deg,_#16a34a_0%,_#15803d_100%)]'
                            : 'bg-[#475569]',
                          'text-[#ffffff] font-bold text-[0.9rem]',
                          personaSeleccionada
                            ? 'cursor-pointer'
                            : '[cursor:default]',
                          personaSeleccionada
                            ? 'shadow-[0_2px_4px_rgba(22,_163,_74,_0.3)]'
                            : 'shadow-[none]'
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <FileTextIcon size={18} />
                        {personaSeleccionada
                          ? 'Otorgar este Préstamo Oficial'
                          : 'Asignar Socio para Otorgar'}
                      </button>
                    </div>

                    <SimuladorTarjetas plan={planResultado} />
                    <CronogramaTabla cronograma={planResultado.cronograma} />
                    {ultimoPayload && !ultimoPayload.linea_id && (
                      <div className="mt-6 p-6 bg-[#eff6ff] [border:1px_solid_#bfdbfe] rounded-xl">
                        {lineaCreada ? (
                          <p role="status" className="text-[#166534] m-0">
                            La línea “{lineaCreada}” se creó correctamente y ya
                            está disponible en Líneas de Préstamo.
                          </p>
                        ) : (
                          <>
                            <h3 className="m-[0_0_0.5rem]">
                              Crear una línea con estas condiciones
                            </h3>
                            <p className="text-[#475569]">
                              Guardá el motor, la tasa y el IVA calculados como
                              una nueva línea de préstamo.
                            </p>
                            <button
                              type="button"
                              disabled={simulando || !condicionesSimuladas}
                              onClick={() => setModalLineaAbierto(true)}
                              className="p-[0.8rem_1.25rem] [border:0] rounded-lg bg-[#2563eb] text-[#fff] font-semibold cursor-pointer"
                            >
                              Crear línea con esta simulación
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-[5rem_2rem] bg-[#ffffff] rounded-xl [border:2px_dashed_#e2e8f0] text-[#94a3b8]">
                    <div className="text-[1.1rem] font-medium text-[#64748b] mb-2">
                      Ninguna simulación calculada
                    </div>
                    Seleccioná una línea o ingresá los parámetros y presioná
                    "Calcular Amortización".
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
            <LineaModal
              isOpen={modalLineaAbierto}
              onClose={() => setModalLineaAbierto(false)}
              lineaParaEditar={null}
              condicionesSimuladas={condicionesSimuladas}
              onSave={async (data) => {
                const creada = await createLinea(data);
                setLineaCreada(creada.nombre);
                setRevisionLineas((v) => v + 1);
              }}
            />
          </div>
        )}

        {/* Pestaña: Préstamos Otorgados */}
        {currentTab === 'bapro' && <PresentacionesBaproPanel onCargarRespuesta={() => setCurrentTab('respuestas')} />}
        {currentTab === 'respuestas' && <RespuestasPanel onAplicada={() => {
          if (personaSeleccionada) void handleSeleccionarPersona(personaSeleccionada);
        }} />}
        {currentTab === 'reportes' && (
          <ReportesPanel
            key={reportePrestamoId ?? 'cartera'}
            prestamoInicialId={reportePrestamoId}
          />
        )}

        {/* Pestaña: ABM Líneas de Préstamo */}
        {currentTab === 'lineas' && (
          <LineasPanel onNuevaLinea={iniciarNuevaLinea} />
        )}

        {/* Pestaña: ABM Motores de Fórmulas */}
        {currentTab === 'motores' && <MotoresPanel />}

        {/* Pestaña: Auditoría y Trazabilidad */}
        {currentTab === 'auditoria' && <AuditoriaPanel />}
      </main>
    </div>
  );
}
