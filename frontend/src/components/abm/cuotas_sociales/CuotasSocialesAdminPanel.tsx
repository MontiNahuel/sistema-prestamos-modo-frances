import React, { useCallback, useEffect, useState } from 'react';
import {
  actualizarConfiguracionCuotaSocial,
  bajaCuotaSocialSocio,
  getConfiguracionCuotaSocial,
  getSociosCuotaSocialActivos,
} from '../../../services/api/cuotasSocialesApi';
import {
  CuotaSocialConfig,
  CuotaSocialSocioActivoItem,
} from '../../../types/cuotaSocial';
import { formatMoney } from '../../../utils/formatters';

interface CuotasSocialesAdminPanelProps {
  onConfigActualizada?: (nuevoValorPesos: number) => void;
}

export const CuotasSocialesAdminPanel: React.FC<CuotasSocialesAdminPanelProps> = ({
  onConfigActualizada,
}) => {
  const [config, setConfig] = useState<CuotaSocialConfig | null>(null);
  const [socios, setSocios] = useState<CuotaSocialSocioActivoItem[]>([]);
  const [totalSocios, setTotalSocios] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [valorPesos, setValorPesos] = useState<string>('5500');
  const [aplicarAActivos, setAplicarAActivos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [bajaEnProcesoId, setBajaEnProcesoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarTodo = useCallback(async (termino?: string) => {
    setCargando(true);
    setError(null);
    try {
      const [cfgRes, activosRes] = await Promise.all([
        getConfiguracionCuotaSocial(),
        getSociosCuotaSocialActivos(termino),
      ]);
      setConfig(cfgRes);
      setValorPesos(String(cfgRes.valor_default_centavos / 100));
      setSocios(activosRes.items);
      setTotalSocios(activosRes.total);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la configuración de Cuotas Sociales');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      getConfiguracionCuotaSocial(),
      getSociosCuotaSocialActivos(''),
    ])
      .then(([cfgRes, activosRes]) => {
        if (cancelado) return;
        setConfig(cfgRes);
        setValorPesos(String(cfgRes.valor_default_centavos / 100));
        setSocios(activosRes.items);
        setTotalSocios(activosRes.total);
      })
      .catch((err: any) => {
        if (!cancelado) {
          setError(err.message || 'No se pudo cargar la configuración de Cuotas Sociales');
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(valorPesos);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError('El valor por defecto debe ser mayor a cero.');
      return;
    }

    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      const res = await actualizarConfiguracionCuotaSocial({
        valor_default_centavos: Math.round(monto * 100),
        aplicar_a_activos: aplicarAActivos,
      });
      setConfig(res);
      setValorPesos(String(res.valor_default_centavos / 100));
      setAplicarAActivos(false);
      onConfigActualizada?.(res.valor_default_centavos / 100);

      const detalleMasivo =
        aplicarAActivos
          ? ` Se actualizaron ${res.socios_actualizados} socio(s) activos y ${res.cuotas_pendientes_actualizadas} cuota(s) pendientes sin pagos.`
          : ' Se aplicará a nuevas simulaciones, préstamos y adhesiones.';
      setExito(
        `Valor por defecto actualizado a ${formatMoney(res.valor_default_centavos)}.${detalleMasivo}`
      );
      const activosRes = await getSociosCuotaSocialActivos(buscar);
      setSocios(activosRes.items);
      setTotalSocios(activosRes.total);
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el valor por defecto');
    } finally {
      setGuardando(false);
    }
  };

  const handleBuscarSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const activosRes = await getSociosCuotaSocialActivos(buscar);
      setSocios(activosRes.items);
      setTotalSocios(activosRes.total);
    } catch (err: any) {
      setError(err.message || 'No se pudo filtrar el listado de socios');
    }
  };

  const handleDarBaja = async (socio: CuotaSocialSocioActivoItem) => {
    if (
      !window.confirm(
        `¿Dar de baja la Cuota Social de ${socio.nombre_completo}? Se anularán sus períodos pendientes no presentados.`
      )
    ) {
      return;
    }
    setBajaEnProcesoId(socio.socio_id);
    setError(null);
    try {
      await bajaCuotaSocialSocio(socio.socio_id);
      await cargarTodo(buscar);
    } catch (err: any) {
      setError(err.message || 'No se pudo dar de baja la Cuota Social del socio');
    } finally {
      setBajaEnProcesoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-[1.35rem] font-bold text-[#0f172a]">
          Administración de Cuotas Sociales
        </h2>
        <p className="mt-1 mb-0 text-[0.875rem] text-[#64748b]">
          Configurá el importe por defecto utilizado en simulaciones, otorgamientos y activaciones (editable en cada formulario).
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <div className="bg-white [border:1px_solid_#e2e8f0] rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#64748b]">
            Valor por defecto actual
          </div>
          <div className="text-[1.4rem] font-extrabold text-[#1d4ed8] mt-1">
            {config ? formatMoney(config.valor_default_centavos) : '—'}
          </div>
          <div className="text-[0.75rem] text-[#64748b] mt-1">
            {config?.actualizado_por
              ? `Último cambio por ${config.actualizado_por}`
              : 'Valor inicial del sistema'}
            {config?.fecha_actualizacion
              ? ` · ${new Date(config.fecha_actualizacion).toLocaleDateString('es-AR')}`
              : ''}
          </div>
        </div>

        <div className="bg-white [border:1px_solid_#e2e8f0] rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#64748b]">
            Socios con Cuota Social activa
          </div>
          <div className="text-[1.4rem] font-extrabold text-[#0f172a] mt-1">
            {config?.socios_activos_count ?? 0}
          </div>
          <div className="text-[0.75rem] text-[#64748b] mt-1">
            Adhesiones vigentes mes a mes hasta la baja
          </div>
        </div>

        <div className="bg-white [border:1px_solid_#e2e8f0] rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#64748b]">
            Cuotas pendientes modificables
          </div>
          <div className="text-[1.4rem] font-extrabold text-[#0f172a] mt-1">
            {config?.cuotas_pendientes_modificables_count ?? 0}
          </div>
          <div className="text-[0.75rem] text-[#64748b] mt-1">
            En estado PENDIENTE y sin pagos registrados
          </div>
        </div>
      </div>

      {/* Formulario de configuración */}
      <form
        onSubmit={handleGuardarConfig}
        className="bg-white [border:1px_solid_#e2e8f0] rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <h3 className="m-0 mb-3 text-[1rem] font-bold text-[#0f172a]">
          Definir nuevo valor por defecto
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#fef2f2] [border:1px_solid_#fecaca] text-[#b91c1c] text-[0.85rem]">
            {error}
          </div>
        )}
        {exito && (
          <div className="mb-4 p-3 rounded-lg bg-[#f0fdf4] [border:1px_solid_#bbf7d0] text-[#166534] text-[0.85rem]">
            {exito}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label
              htmlFor="cuota-social-default-pesos"
              className="block text-[0.8rem] font-semibold text-[#334155] mb-1"
            >
              Valor por defecto mensual ($)
            </label>
            <input
              id="cuota-social-default-pesos"
              type="number"
              min="1"
              step="any"
              required
              value={valorPesos}
              onChange={(e) => setValorPesos(e.target.value)}
              className="w-full p-[0.55rem_0.75rem] rounded-lg [border:1px_solid_#cbd5e1] text-[0.95rem] font-semibold text-[#0f172a]"
            />
          </div>

          <button
            type="submit"
            disabled={guardando || cargando}
            className="p-[0.6rem_1.25rem] rounded-lg [border:none] bg-[#2563eb] text-white font-semibold text-[0.875rem] cursor-pointer hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar valor por defecto'}
          </button>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-[#f8fafc] [border:1px_solid_#e2e8f0]">
          <label className="flex items-start gap-2.5 text-[0.85rem] font-semibold text-[#1e293b] cursor-pointer">
            <input
              type="checkbox"
              checked={aplicarAActivos}
              onChange={(e) => setAplicarAActivos(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Aplicar el nuevo monto a los socios activos actuales y sus cuotas pendientes sin pagos
            </span>
          </label>
          <p className="mt-1.5 mb-0 pl-6 text-[0.78rem] text-[#64748b]">
            {aplicarAActivos
              ? `Al guardar se actualizarán las ${config?.socios_activos_count ?? 0} suscripción(es) activas y ${config?.cuotas_pendientes_modificables_count ?? 0} cuota(s) en estado PENDIENTE sin cobros (no toca cuotas PRESENTADA ni PAGADA).`
              : 'Por defecto permanece desmarcado: el nuevo monto solo se precarga en nuevas simulaciones, nuevos préstamos y nuevas adhesiones sin modificar socios existentes.'}
          </p>
        </div>
      </form>

      {/* Listado de socios con cuota social activa */}
      <div className="bg-white [border:1px_solid_#e2e8f0] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="p-4 [border-bottom:1px_solid_#e2e8f0] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="m-0 text-[1rem] font-bold text-[#0f172a]">
              Socios con Cuota Social activa ({totalSocios})
            </h3>
            <p className="m-0 text-[0.78rem] text-[#64748b]">
              Padrón vigente adherido al cobro mensual de Cuota Social.
            </p>
          </div>
          <form onSubmit={handleBuscarSocios} className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o ID..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="p-[0.45rem_0.75rem] rounded-md [border:1px_solid_#cbd5e1] text-[0.85rem] min-w-[230px]"
            />
            <button
              type="submit"
              className="p-[0.45rem_0.9rem] rounded-md [border:1px_solid_#cbd5e1] bg-[#f8fafc] text-[#334155] text-[0.82rem] font-semibold cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </div>

        <table className="w-full border-collapse text-[0.85rem]">
          <thead>
            <tr className="bg-[#f8fafc] [border-bottom:1px_solid_#e2e8f0] text-left text-[#475569]">
              <th className="p-[0.7rem_1rem]">Socio</th>
              <th className="p-[0.7rem_1rem]">Documento</th>
              <th className="p-[0.7rem_1rem]">Valor mensual</th>
              <th className="p-[0.7rem_1rem]">Fecha alta</th>
              <th className="p-[0.7rem_1rem]">Pendientes</th>
              <th className="p-[0.7rem_1rem] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-[#64748b]">
                  Cargando socios activos...
                </td>
              </tr>
            ) : socios.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-[#64748b]">
                  No hay socios con Cuota Social activa para el filtro actual.
                </td>
              </tr>
            ) : (
              socios.map((s) => (
                <tr key={s.socio_id} className="[border-bottom:1px_solid_#f1f5f9]">
                  <td className="p-[0.65rem_1rem] font-semibold text-[#0f172a]">
                    #{s.socio_id} · {s.nombre_completo}
                  </td>
                  <td className="p-[0.65rem_1rem] text-[#475569]">
                    {s.documento || '—'}
                  </td>
                  <td className="p-[0.65rem_1rem] font-bold text-[#1d4ed8]">
                    {formatMoney(s.valor_centavos)}
                  </td>
                  <td className="p-[0.65rem_1rem] text-[#64748b]">
                    {s.fecha_alta
                      ? new Date(s.fecha_alta).toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td className="p-[0.65rem_1rem] text-[#475569]">
                    {s.cuotas_pendientes}
                  </td>
                  <td className="p-[0.65rem_1rem] text-right">
                    <button
                      type="button"
                      disabled={bajaEnProcesoId === s.socio_id}
                      onClick={() => handleDarBaja(s)}
                      className="p-[0.3rem_0.65rem] rounded [border:1px_solid_#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[0.75rem] font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {bajaEnProcesoId === s.socio_id ? 'Procesando...' : 'Dar de baja'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
