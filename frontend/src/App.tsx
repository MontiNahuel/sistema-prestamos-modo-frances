import React, { useState, useEffect } from 'react';

interface CuotaItem {
  numero_cuota: number;
  saldo_inicial_centavos: number;
  capital_centavos: number;
  interes_centavos: number;
  iva_interes_centavos: number;
  cuota_pura_centavos: number;
  cuota_total_centavos: number;
  saldo_final_centavos: number;
}

interface PlanAmortizacion {
  monto_solicitado_centavos: number;
  plazo_meses: number;
  tna: string;
  tem: string;
  alicuota_iva: string;
  cuota_pura_teorica_centavos: number;
  total_capital_centavos: number;
  total_interes_centavos: number;
  total_iva_centavos: number;
  total_a_pagar_centavos: number;
  cronograma: CuotaItem[];
}

interface MedioPago {
  id: number;
  tipo: number;
  valor: string;
  predeterminado: boolean;
  banco: string | null;
}

interface Persona {
  idPersona: number;
  numeroDoc: string;
  cuil: string;
  apellido: string;
  nombre: string;
  estadoNombre: string;
  nroSocio: number;
  calle: string;
  localidadId: number;
  mediosDePago: MedioPago[];
}

interface CuentaCorrienteResumen {
  persona: {
    id: number;
    apellido: string;
    nombre: string;
    numeroDoc: string;
  };
  totales: {
    saldo: number;
    algunaConMora: boolean;
    obligacionMensual: number;
  };
}

export function formatMoney(centavos: number): string {
  return (centavos / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPesos(pesos: number): string {
  return pesos.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function App() {
  // Autenticación
  const [token, setToken] = useState<string>(() => localStorage.getItem('coopya_token') || '');
  const [usuario, setUsuario] = useState<string>('');
  const [contrasena, setContrasena] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Navegación
  const [seccion, setSeccion] = useState<'simulador' | 'personas'>('personas');

  // Búsqueda de Personas
  const [busqTexto, setBusqTexto] = useState<string>('');
  const [busqDoc, setBusqDoc] = useState<string>('');
  const [busqIdPersona, setBusqIdPersona] = useState<string>('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [buscando, setBuscando] = useState<boolean>(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [ccResumen, setCcResumen] = useState<CuentaCorrienteResumen | null>(null);
  const [cargandoCc, setCargandoCc] = useState<boolean>(false);
  const [busqError, setBusqError] = useState<string | null>(null);

  // Simulador
  const [montoPesos, setMontoPesos] = useState<number>(100000);
  const [plazoMeses, setPlazoMeses] = useState<number>(12);
  const [tnaPorcentaje, setTnaPorcentaje] = useState<number>(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(21);
  const [simulando, setSimulando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<PlanAmortizacion | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('coopya_token', token);
    } else {
      localStorage.removeItem('coopya_token');
    }
  }, [token]);

  // Manejo de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Usuario o contraseña inválidos');
      }

      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setPersonaSeleccionada(null);
    setPersonas([]);
    setCcResumen(null);
  };

  // Buscar Personas
  const handleBuscarPersonas = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setBusqError(null);
    setPersonaSeleccionada(null);
    setCcResumen(null);

    const idPersonaNum = busqIdPersona.trim() ? parseInt(busqIdPersona.trim(), 10) : null;

    try {
      const res = await fetch('/api/v1/personas/buscar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombreApellido: busqTexto,
          documento: busqDoc,
          idPersona: isNaN(idPersonaNum as number) ? null : idPersonaNum
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al buscar personas');
      }

      const data: Persona[] = await res.json();
      setPersonas(data);
    } catch (err: any) {
      setBusqError(err.message || 'Error consultando socios');
    } finally {
      setBuscando(false);
    }
  };

  // Ver Detalle y Cuenta Corriente
  const handleSeleccionarPersona = async (p: Persona) => {
    setPersonaSeleccionada(p);
    setCargandoCc(true);
    setCcResumen(null);

    try {
      const res = await fetch(`/api/v1/personas/${p.idPersona}/cuenta-corriente`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data: CuentaCorrienteResumen = await res.json();
        setCcResumen(data);
      }
    } catch (err) {
      console.error('Error al cargar CC:', err);
    } finally {
      setCargandoCc(false);
    }
  };

  // Simular Préstamo
  const handleSimular = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulando(true);
    setSimError(null);

    const montoCentavos = Math.round(montoPesos * 100);
    const tnaDecimal = (tnaPorcentaje / 100).toString();
    const ivaDecimal = (ivaPorcentaje / 100).toString();

    try {
      const res = await fetch('/api/v1/simulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_centavos: montoCentavos,
          plazo_meses: plazoMeses,
          tna: tnaDecimal,
          alicuota_iva: ivaDecimal
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al simular');
      }

      const data: PlanAmortizacion = await res.json();
      setResultado(data);
    } catch (err: any) {
      setSimError(err.message || 'Error de cálculo');
    } finally {
      setSimulando(false);
    }
  };

  // Si no está autenticado, mostramos la pantalla de Login conectada al Monolito
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '1.5rem', fontWeight: 700 }}>Sistema de Préstamos</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>Autenticación centralizada con CoopYa</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingresá tu usuario"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>Contraseña</label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingresá tu contraseña"
                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: loginLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {loginLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>

            {loginError && (
              <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Vista Autenticada
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb', color: '#1f2937' }}>
      {/* Barra de Navegación Superior */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>CoopYa Préstamos</span>
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSeccion('personas')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: seccion === 'personas' ? '#e0e7ff' : 'transparent',
                color: seccion === 'personas' ? '#3730a3' : '#4b5563',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Buscar Personas
            </button>
            <button
              onClick={() => setSeccion('simulador')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: seccion === 'simulador' ? '#e0e7ff' : 'transparent',
                color: seccion === 'simulador' ? '#3730a3' : '#4b5563',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Simulador Francés
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.25rem 0.625rem', borderRadius: '999px', fontWeight: 600 }}>
            Sesión Activa
          </span>
          <button
            onClick={handleLogout}
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

      {/* Contenido Principal */}
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {seccion === 'personas' ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Gestión y Búsqueda de Personas</h2>

            {/* Buscador */}
            <form onSubmit={handleBuscarPersonas} style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Apellido o Nombre..."
                value={busqTexto}
                onChange={(e) => setBusqTexto(e.target.value)}
                style={{ flex: 1, minWidth: '180px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
              />
              <input
                type="text"
                placeholder="N° Documento (DNI)..."
                value={busqDoc}
                onChange={(e) => setBusqDoc(e.target.value)}
                style={{ width: '180px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
              />
              <input
                type="number"
                placeholder="IdPersona..."
                value={busqIdPersona}
                onChange={(e) => setBusqIdPersona(e.target.value)}
                style={{ width: '130px', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
              />
              <button
                type="submit"
                disabled={buscando}
                style={{
                  padding: '0.625rem 1.5rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: buscando ? 'not-allowed' : 'pointer'
                }}
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {busqError && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.5rem' }}>
                {busqError}
              </div>
            )}

            {/* Grilla de Resultados y Ficha Detallada */}
            <div style={{ display: 'grid', gridTemplateColumns: personaSeleccionada ? '1fr 420px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Tabla de Socios */}
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>IdPersona</th>
                      <th style={{ padding: '0.75rem 1rem' }}>N° Socio</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Apellido y Nombre</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Documento</th>
                      <th style={{ padding: '0.75rem 1rem' }}>CUIL</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personas.length > 0 ? (
                      personas.map((p) => {
                        const esSeleccionado = personaSeleccionada?.idPersona === p.idPersona;
                        return (
                          <tr
                            key={p.idPersona}
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              background: esSeleccionado ? '#eff6ff' : '#ffffff'
                            }}
                          >
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>{p.idPersona}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{p.nroSocio ? `#${p.nroSocio}` : '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#111827' }}>
                              {p.apellido} {p.nombre}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>{p.numeroDoc}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{p.cuil}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: p.estadoNombre === 'Activo' ? '#d1fae5' : '#fee2e2',
                                color: p.estadoNombre === 'Activo' ? '#065f46' : '#991b1b'
                              }}>
                                {p.estadoNombre}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleSeleccionarPersona(p)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #2563eb',
                                  background: esSeleccionado ? '#2563eb' : '#ffffff',
                                  color: esSeleccionado ? '#ffffff' : '#2563eb',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {esSeleccionado ? 'Seleccionado' : 'Ver Ficha'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                          {buscando ? 'Buscando socios...' : 'Ingresá un término de búsqueda para ver personas.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Panel Lateral: Ficha del Socio y Cuenta Corriente */}
              {personaSeleccionada && (
                <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#2563eb' }}>Ficha del Socio</span>
                      <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                        ID Persona: {personaSeleccionada.idPersona}
                      </span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.25rem', color: '#111827' }}>
                      {personaSeleccionada.apellido} {personaSeleccionada.nombre}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      N° Socio: {personaSeleccionada.nroSocio || '-'} | DNI: {personaSeleccionada.numeroDoc} | CUIL: {personaSeleccionada.cuil}
                    </p>
                  </div>

                  {/* Resumen de Cuenta Corriente (Solo Lectura) */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Estado Crediticio (CoopYa):</div>
                    {cargandoCc ? (
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Consultando cuenta corriente...</div>
                    ) : ccResumen ? (
                      <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Saldo Deudor:</span>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{formatPesos(ccResumen.totales.saldo)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Registra Mora:</span>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: ccResumen.totales.algunaConMora ? '#fee2e2' : '#d1fae5',
                            color: ccResumen.totales.algunaConMora ? '#991b1b' : '#065f46'
                          }}>
                            {ccResumen.totales.algunaConMora ? 'CON MORA' : 'AL DÍA'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No se pudo obtener el resumen.</div>
                    )}
                  </div>

                  {/* Cuentas / CBU para Desembolso */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Medios de Pago / CBU:</div>
                    {personaSeleccionada.mediosDePago && personaSeleccionada.mediosDePago.length > 0 ? (
                      personaSeleccionada.mediosDePago.map((m) => (
                        <div key={m.id} style={{ background: '#f9fafb', padding: '0.625rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.5rem', border: '1px solid #f3f4f6' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{m.valor}</div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{m.predeterminado ? '★ Predeterminado' : 'Secundario'}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No registra CBU / Cuentas.</div>
                    )}
                  </div>

                  {/* Botón para Simular Préstamo a esta persona */}
                  <button
                    onClick={() => setSeccion('simulador')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Simular Préstamo para {personaSeleccionada.apellido}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Pestaña Simulador */
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
            <form onSubmit={handleSimular} style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', color: '#111827' }}>Parámetros de Simulación</h3>

              {personaSeleccionada && (
                <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Socio Destinatario:</div>
                  <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>{personaSeleccionada.apellido} {personaSeleccionada.nombre}</div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>Monto Solicitado ($)</label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={montoPesos}
                  onChange={(e) => setMontoPesos(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                  required
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Se envían {montoPesos * 100} centavos exactos</small>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>Plazo (Meses)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={plazoMeses}
                  onChange={(e) => setPlazoMeses(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>TNA (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tnaPorcentaje}
                  onChange={(e) => setTnaPorcentaje(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>IVA sobre Interés (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={simulando}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: simulando ? 'not-allowed' : 'pointer'
                }}
              >
                {simulando ? 'Calculando...' : 'Calcular Amortización'}
              </button>

              {simError && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {simError}
                </div>
              )}
            </form>

            {/* Resultado de la Simulación */}
            <div>
              {resultado ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Capital</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '0.25rem' }}>{formatMoney(resultado.monto_solicitado_centavos)}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Intereses</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>{formatMoney(resultado.total_interes_centavos)}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>IVA (21%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.25rem' }}>{formatMoney(resultado.total_iva_centavos)}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Total Devolver</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>{formatMoney(resultado.total_a_pagar_centavos)}</div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.875rem' }}>
                      <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'center' }}>N°</th>
                          <th style={{ padding: '0.75rem' }}>Saldo Inicial</th>
                          <th style={{ padding: '0.75rem' }}>Capital</th>
                          <th style={{ padding: '0.75rem' }}>Interés</th>
                          <th style={{ padding: '0.75rem' }}>IVA s/Int</th>
                          <th style={{ padding: '0.75rem', color: '#15803d' }}>Cuota Total</th>
                          <th style={{ padding: '0.75rem' }}>Saldo Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.cronograma.map((c) => (
                          <tr key={c.numero_cuota} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{c.numero_cuota}</td>
                            <td style={{ padding: '0.75rem' }}>{formatMoney(c.saldo_inicial_centavos)}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{formatMoney(c.capital_centavos)}</td>
                            <td style={{ padding: '0.75rem', color: '#2563eb' }}>{formatMoney(c.interes_centavos)}</td>
                            <td style={{ padding: '0.75rem', color: '#7c3aed' }}>{formatMoney(c.iva_interes_centavos)}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#15803d' }}>{formatMoney(c.cuota_total_centavos)}</td>
                            <td style={{ padding: '0.75rem', color: '#4b5563' }}>{formatMoney(c.saldo_final_centavos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '8px', border: '2px dashed #e5e7eb', color: '#9ca3af' }}>
                  Completá los datos y presioná "Calcular Amortización" para visualizar la grilla.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
