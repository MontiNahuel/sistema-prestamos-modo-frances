import React, { useState, useEffect } from 'react';
import { FiltrosBna } from './FiltrosBna';
import { TablaCuotasBna } from './TablaCuotasBna';
import { TablaHistorialBna } from './TablaHistorialBna';
import { BarraAccionesBna } from './BarraAccionesBna';
import { ModalHistorialBna } from './ModalHistorialBna';
import { CuotaPresentableBnaItem, PresentacionBnaArchivoItem, PresentacionBnaAuditoriaItem } from '../../types/presentacionesBna';
import {
  buscarCuotasBna, getProximoNroListaBna, validarNroListaBna, generarPresentacionBna,
  getArchivosBna, getDetallesArchivoBna, descargarArchivoBna, cargarRespuestaBna,
} from '../../services/api/presentacionesBnaApi';

export const PresentacionesBnaPanel: React.FC = () => {
  const [tab, setTab] = useState<'generar' | 'historial'>('generar');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [fechaImpacto, setFechaImpacto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [nroLista, setNroLista] = useState<number | ''>('');
  const [estadoNroLista, setEstadoNroLista] = useState<string>('');
  const [nroListaValido, setNroListaValido] = useState<boolean | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('BNA_1935.txt');
  const [casa, setCasa] = useState<string>('0085');
  const [producto, setProducto] = useState<string>('10');
  const [cuenta, setCuenta] = useState<string>('0005502347');
  const [indicadorLote, setIndicadorLote] = useState<string>('REE');
  const [incluirPresentadas, setIncluirPresentadas] = useState<boolean>(false);
  const [cuotas, setCuotas] = useState<CuotaPresentableBnaItem[]>([]);
  const [cuotasExcluidas, setCuotasExcluidas] = useState<CuotaPresentableBnaItem[]>([]);
  const [presentadasExcluidas, setPresentadasExcluidas] = useState<number>(0);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [archivos, setArchivos] = useState<PresentacionBnaArchivoItem[]>([]);
  const [archivoActivo, setArchivoActivo] = useState<PresentacionBnaArchivoItem | null>(null);
  const [detallesModal, setDetallesModal] = useState<PresentacionBnaAuditoriaItem[]>([]);
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [cargandoDetalles, setCargandoDetalles] = useState<boolean>(false);

  const cargarProximoNro = async () => {
    try {
      const res = await getProximoNroListaBna();
      setNroLista(res.proximo_nro_lista);
      setNombreArchivo(`BNA_${res.proximo_nro_lista}.txt`);
      setEstadoNroLista('Sugerido');
      setNroListaValido(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarProximoNro();
    getArchivosBna().then((res) => setArchivos(res.archivos)).catch(console.error);
  }, []);

  const handleValidarNro = async () => {
    if (!nroLista) return;
    try {
      const res = await validarNroListaBna(Number(nroLista));
      setEstadoNroLista(res.disponible ? 'Disponible' : 'Ya existe');
      setNroListaValido(res.disponible);
      if (res.disponible) setNombreArchivo(`BNA_${nroLista}.txt`);
    } catch {
      setEstadoNroLista('Error');
      setNroListaValido(false);
    }
  };

  const handleBuscar = async () => {
    setLoading(true);
    setMensaje(null);
    try {
      const res = await buscarCuotasBna({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        incluir_presentadas: true,
      });
      const filtrarPresentadas = (items: CuotaPresentableBnaItem[]) =>
        incluirPresentadas ? items : items.filter((c) => c.estado !== 'PRESENTADA');
      const presentablesVisibles = filtrarPresentadas(res.presentables);
      const presentadas = [...res.presentables, ...res.excluidas].filter(
        (c) => c.estado === 'PRESENTADA'
      );
      setCuotas(presentablesVisibles);
      setCuotasExcluidas(filtrarPresentadas(res.excluidas));
      setPresentadasExcluidas(incluirPresentadas ? 0 : presentadas.length);
      setSeleccionadas(
        new Set(
          presentablesVisibles
            .filter((c) => c.estado !== 'PRESENTADA')
            .map((c) => c.cuota_id)
        )
      );
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al buscar cuotas BNA' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerar = async () => {
    if (seleccionadas.size === 0) return;
    if (nroListaValido === false) {
      setMensaje({ tipo: 'error', texto: `El número de lista ${nroLista} ya fue utilizado. Por favor use el botón "Validar" o elija otro número.` });
      return;
    }
    const totalSeleccionado = cuotas
      .filter((c) => seleccionadas.has(c.cuota_id))
      .reduce((acc, c) => acc + c.monto_centavos, 0);
    const fechaFormateada = fechaImpacto
      ? new Date(`${fechaImpacto}T00:00:00`).toLocaleDateString('es-AR')
      : 'Sin fecha';
    const confirmado = window.confirm(
      `¿Generar el archivo BNA?\n\n` +
      `Cuotas seleccionadas: ${seleccionadas.size}\n` +
      `Total a debitar: $${(totalSeleccionado / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `Fecha de impacto: ${fechaFormateada}\n` +
      `Archivo: ${nombreArchivo || 'Automático'}\n\n` +
      `Las cuotas seleccionadas quedarán marcadas como presentadas.`
    );
    if (!confirmado) return;
    setLoading(true);
    setMensaje(null);
    try {
      const res = await generarPresentacionBna({
        cuota_ids: Array.from(seleccionadas),
        nro_lista: nroLista ? Number(nroLista) : undefined,
        nombre_archivo: nombreArchivo,
        fecha_impacto: fechaImpacto,
        casa, producto, cuenta, indicador_lote: indicadorLote,
      });
      setMensaje({
        tipo: 'ok',
        texto: `¡Lote BNA generado! Archivo: ${res.nombre_archivo} (${res.total_registros} registros por $${res.total_monto_pesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}).`,
      });
      await descargarArchivoBna(res.archivo_id, res.nombre_archivo);
      await cargarProximoNro();
      getArchivosBna().then((r) => setArchivos(r.archivos));
      handleBuscar();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al generar la presentación BNA' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = async (arch: PresentacionBnaArchivoItem) => {
    setArchivoActivo(arch); setModalAbierto(true); setCargandoDetalles(true);
    try { setDetallesModal(await getDetallesArchivoBna(arch.id)); }
    catch (err) { console.error(err); }
    finally { setCargandoDetalles(false); }
  };

  const handleSubirRespuesta = async (archivoId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await cargarRespuestaBna(archivoId, file);
      setMensaje({ tipo: 'ok', texto: res.mensaje });
      getArchivosBna().then((r) => setArchivos(r.archivos));
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al procesar la respuesta BNA' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const totalCentavos = cuotas.filter((c) => seleccionadas.has(c.cuota_id)).reduce((acc, c) => acc + c.monto_centavos, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Presentaciones Banco Nación (BNA) - Préstamos
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Formato de Débito Automático BNA (128 chars). Exclusivo para amortización de préstamos.
          </p>
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setTab('generar')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              background: tab === 'generar' ? '#ffffff' : 'transparent', color: tab === 'generar' ? '#0f172a' : '#64748b',
            }}
          >
            Generar Presentación
          </button>
          <button
            onClick={() => setTab('historial')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              background: tab === 'historial' ? '#ffffff' : 'transparent', color: tab === 'historial' ? '#0f172a' : '#64748b',
            }}
          >
            Historial de Lotes ({archivos.length})
          </button>
        </div>
      </div>

      {mensaje && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2', color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b', border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
          {mensaje.texto}
        </div>
      )}

      {tab === 'generar' && (
        <>
          <FiltrosBna
            fechaImpacto={fechaImpacto} setFechaImpacto={setFechaImpacto}
            fechaDesde={fechaDesde} setFechaDesde={setFechaDesde}
            fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
            nroLista={nroLista}
            setNroLista={(val) => { setNroLista(val); setEstadoNroLista(''); setNroListaValido(null); if (val) setNombreArchivo(`BNA_${val}.txt`); }}
            estadoNroLista={estadoNroLista} nroListaValido={nroListaValido} onValidarNroLista={handleValidarNro}
            nombreArchivo={nombreArchivo} setNombreArchivo={setNombreArchivo} onRestablecerNombreArchivo={cargarProximoNro}
            casa={casa} setCasa={setCasa} producto={producto} setProducto={setProducto} cuenta={cuenta} setCuenta={setCuenta}
            indicadorLote={indicadorLote} setIndicadorLote={setIndicadorLote}
            incluirPresentadas={incluirPresentadas} setIncluirPresentadas={setIncluirPresentadas}
            onBuscar={handleBuscar} onLimpiar={() => { setFechaDesde(''); setFechaHasta(''); setCuotas([]); setCuotasExcluidas([]); setPresentadasExcluidas(0); setSeleccionadas(new Set()); }}
            loading={loading}
          />

          {presentadasExcluidas > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              Ya presentadas excluidas: <strong>{presentadasExcluidas}</strong>. No se muestran porque la opción “Incluir cuotas presentadas” está desmarcada.
            </div>
          )}

          {cuotasExcluidas.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
              Se identificaron {cuotasExcluidas.length} cuotas no presentables en BNA (sin CBU 011 o datos de sucursal incompletos).
            </div>
          )}

          <BarraAccionesBna
            totalCuotas={cuotas.length}
            seleccionadasCount={seleccionadas.size}
            totalCentavos={totalCentavos}
            onGenerar={handleGenerar}
            loading={loading}
          />

          <TablaCuotasBna
            cuotas={cuotas}
            seleccionadas={seleccionadas}
            onToggleSeleccion={(id) => {
              const next = new Set(seleccionadas);
              if (next.has(id)) next.delete(id); else next.add(id);
              setSeleccionadas(next);
            }}
            onToggleTodos={() => {
              if (seleccionadas.size === cuotas.length) setSeleccionadas(new Set());
              else setSeleccionadas(new Set(cuotas.map((c) => c.cuota_id)));
            }}
            loading={loading}
          />
        </>
      )}

      {tab === 'historial' && (
        <TablaHistorialBna
          archivos={archivos}
          onDescargar={descargarArchivoBna}
          onVerDetalles={handleVerDetalles}
          onSubirRespuesta={handleSubirRespuesta}
        />
      )}

      <ModalHistorialBna
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        nroArchivo={archivoActivo?.nro_archivo || 0}
        nombreArchivo={archivoActivo?.nombre_archivo || ''}
        detalles={detallesModal}
        cargando={cargandoDetalles}
      />
    </div>
  );
};
