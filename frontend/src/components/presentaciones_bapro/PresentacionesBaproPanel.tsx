import React, { useState, useEffect, useCallback } from 'react';
import { CuotaPresentableItem, EmpresaOriginante } from '../../types/presentacionesBapro';
import {
  buscarCuotasBapro,
  generarPresentacionBapro,
  descargarArchivoBapro,
  getEmpresasOriginantes,
  getProximoNroLista,
  validarNroLista,
} from '../../services/api/presentacionesBaproApi';
import { FiltrosBapro } from './FiltrosBapro';
import { EmpresasModal } from './EmpresasModal';
import { Badge } from '../common/Badge';

export const PresentacionesBaproPanel: React.FC<{ onCargarRespuesta: () => void }> = ({ onCargarRespuesta }) => {
  const [empresas, setEmpresas] = useState<EmpresaOriginante[]>([]);
  const [empresaId, setEmpresaId] = useState<number | undefined>();
  const [dniDesde, setDniDesde] = useState<number | ''>('');
  const [dniHasta, setDniHasta] = useState<number | ''>('');
  const [fechaImpacto, setFechaImpacto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [nroLista, setNroLista] = useState<number | ''>('');
  const [estadoNroLista, setEstadoNroLista] = useState('Propuesto por el sistema.');
  const [nroListaValido, setNroListaValido] = useState<boolean | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [incluirPresentadas, setIncluirPresentadas] = useState(true);
  const [aplicarDesglose, setAplicarDesglose] = useState(false);
  const [montoMinimoDesglose, setMontoMinimoDesglose] = useState(50000);

  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState<CuotaPresentableItem[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  const [modalEmpresas, setModalEmpresas] = useState(false);

  const armarNombreArchivo = useCallback((empId?: number, nro?: number | '') => {
    const emp = empresas.find((e) => e.id === empId);
    return `${emp?.prefijo_archivo || 'EBT_COOPCREDITOYALTDA'}${nro || ''}.txt`;
  }, [empresas]);

  const cargarDatosIniciales = async () => {
    try {
      const emps = await getEmpresasOriginantes(true);
      setEmpresas(emps);
      const predet = emps.find((e) => e.predeterminado) || emps[0];
      if (predet) setEmpresaId(predet.id);

      const proximo = await getProximoNroLista();
      setNroLista(proximo.nro_lista_propuesto);
      setNombreArchivo(`${predet?.prefijo_archivo || 'EBT_COOPCREDITOYALTDA'}${proximo.nro_lista_propuesto}.txt`);
    } catch {}
  };

  useEffect(() => { cargarDatosIniciales(); }, []);

  const handleEmpresaChange = (id: number) => {
    setEmpresaId(id);
    setNombreArchivo(armarNombreArchivo(id, nroLista));
  };

  const handleRestablecerNombreArchivo = () => {
    setNombreArchivo(armarNombreArchivo(empresaId, nroLista));
  };

  const handleValidarNroLista = async () => {
    if (nroLista === '') return;
    try {
      const res = await validarNroLista(Number(nroLista));
      setNroListaValido(res.disponible);
      setEstadoNroLista(res.mensaje);
    } catch {
      setNroListaValido(false);
      setEstadoNroLista('Error validando número de lista');
    }
  };

  const handleBuscar = async () => {
    setLoading(true);
    setError(null);
    setExito(null);
    try {
      const res = await buscarCuotasBapro({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        dni_desde: dniDesde === '' ? null : dniDesde,
        dni_hasta: dniHasta === '' ? null : dniHasta,
        incluir_presentadas: incluirPresentadas,
      });
      setCuotas([...res.presentables, ...res.excluidas]);
      setSeleccionadas(new Set(res.presentables.map((c) => c.cuota_id)));
    } catch (err: any) {
      setError(err.message || 'Error al buscar cuotas');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setDniDesde(''); setDniHasta(''); setFechaDesde(''); setFechaHasta('');
    setCuotas([]); setSeleccionadas(new Set()); setError(null); setExito(null);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(seleccionadas);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSeleccionadas(next);
  };

  const toggleSelectAll = () => {
    const pres = cuotas.filter((c) => c.presentable).map((c) => c.cuota_id);
    setSeleccionadas(seleccionadas.size === pres.length ? new Set() : new Set(pres));
  };

  const handleGenerar = async () => {
    if (seleccionadas.size === 0) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await generarPresentacionBapro({
        cuota_ids: Array.from(seleccionadas),
        fecha_impacto: fechaImpacto,
        nro_lista: nroLista === '' ? undefined : Number(nroLista),
        nombre_archivo: nombreArchivo || undefined,
        empresa_originante_id: empresaId,
        aplicar_desglose: aplicarDesglose,
        monto_minimo_desglose_pesos: montoMinimoDesglose,
      });
      const montoFormateado = Number(res.total_monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setExito(`Lote #${res.nro_archivo} generado con éxito (${res.total_registros} débitos por $${montoFormateado}). Descargando...`);
      await descargarArchivoBapro(res.nro_archivo, res.nombre_archivo);
      await cargarDatosIniciales();
      await handleBuscar();
    } catch (err: any) {
      setError(err.message || 'Error al generar la presentación');
    } finally {
      setGenerando(false);
    }
  };

  const cuotasSeleccionadas = cuotas.filter((c) => seleccionadas.has(c.cuota_id));
  const totalMontoSeleccionado = cuotasSeleccionadas.reduce((acc, c) => acc + Number(c.monto_pesos || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Presentaciones Banco Provincia (BAPRO)</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Filtros de cuotas, numeración y layout oficial de 163 caracteres para Banco Provincia.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setModalEmpresas(true)} style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>⚙ Empresas Originantes</button>
          <button onClick={onCargarRespuesta} className="px-3 py-2 rounded-md [border:1px_solid_#16a34a] bg-[#f0fdf4] text-[#16a34a] text-sm font-semibold cursor-pointer">📥 Cargar respuesta</button>
        </div>
      </div>

      <FiltrosBapro
        empresas={empresas} empresaId={empresaId} onEmpresaChange={handleEmpresaChange}
        dniDesde={dniDesde} setDniDesde={setDniDesde} dniHasta={dniHasta} setDniHasta={setDniHasta}
        fechaImpacto={fechaImpacto} setFechaImpacto={setFechaImpacto}
        fechaDesde={fechaDesde} setFechaDesde={setFechaDesde} fechaHasta={fechaHasta} setFechaHasta={setFechaHasta}
        nroLista={nroLista} setNroLista={setNroLista} estadoNroLista={estadoNroLista} nroListaValido={nroListaValido}
        onValidarNroLista={handleValidarNroLista} nombreArchivo={nombreArchivo} setNombreArchivo={setNombreArchivo}
        onRestablecerNombreArchivo={handleRestablecerNombreArchivo}
        incluirPresentadas={incluirPresentadas} setIncluirPresentadas={setIncluirPresentadas}
        aplicarDesglose={aplicarDesglose} setAplicarDesglose={setAplicarDesglose}
        montoMinimoDesglose={montoMinimoDesglose} setMontoMinimoDesglose={setMontoMinimoDesglose}
        onBuscar={handleBuscar} onLimpiar={handleLimpiar} loading={loading}
      />

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}
      {exito && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>{exito}</div>}

      {cuotas.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#334155' }}>Seleccionadas: <strong>{seleccionadas.size}</strong> cuotas | Total a debitar: <strong>${totalMontoSeleccionado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <button onClick={handleGenerar} disabled={generando || seleccionadas.size === 0} style={{ padding: '0.5rem 1.25rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: seleccionadas.size === 0 ? 'not-allowed' : 'pointer' }}>
            {generando ? 'Generando lote...' : `Generar Archivo BAPRO (${seleccionadas.size})`}
          </button>
        </div>
      )}

      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                <input type="checkbox" onChange={toggleSelectAll} checked={cuotas.filter(c => c.presentable).length > 0 && seleccionadas.size === cuotas.filter(c => c.presentable).length} />
              </th>
              <th style={{ padding: '0.75rem 1rem' }}>Socio</th>
              <th style={{ padding: '0.75rem 1rem' }}>Cuota #</th>
              <th style={{ padding: '0.75rem 1rem' }}>Vencimiento</th>
              <th style={{ padding: '0.75rem 1rem' }}>CBU Banco Provincia</th>
              <th style={{ padding: '0.75rem 1rem' }}>Monto Cuota</th>
              <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cuotas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Hacé click en "Buscar" para visualizar las cuotas a presentar con los filtros seleccionados.</td></tr>
            ) : (
              cuotas.map((c) => (
                <tr key={c.cuota_id} style={{ borderBottom: '1px solid #f1f5f9', opacity: c.presentable ? 1 : 0.6 }}>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <input type="checkbox" disabled={!c.presentable} checked={seleccionadas.has(c.cuota_id)} onChange={() => toggleSelect(c.cuota_id)} />
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}><strong>{c.socio_nombre}</strong><br /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>DNI: {c.socio_documento || 'S/D'}</span></td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Cuota #{c.numero_cuota}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>{c.fecha_vencimiento || '-'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{c.cbu || <span style={{ color: '#dc2626' }}>{c.motivo_exclusion}</span>}</td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>${Number(c.monto_pesos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <Badge variant={c.estado === 'PAGADA' ? 'success' : c.estado === 'RECHAZADA' ? 'danger' : c.estado === 'PRESENTADA' ? 'info' : 'warning'}>{c.estado}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EmpresasModal isOpen={modalEmpresas} onClose={() => setModalEmpresas(false)} onEmpresasChanged={cargarDatosIniciales} />
    </div>
  );
};
