import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CuotaPresentableItem, EmpresaOriginante, TipoCuotaPresentacion } from '../../types/presentacionesBapro';
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
import {
  aCuotaSocialCentavos,
  aplicarValorCuotaSocialEnItems,
  claveItemPresentable,
  esItemCuotaSocial,
  incluyeCuotaSocial,
  partirIdsSeleccionados,
} from '../../utils/presentacionHelpers';

export const PresentacionesBaproPanel: React.FC<{
  onCargarRespuesta: () => void;
  cuotaSocialDefaultPesos?: number;
  onCuotaSocialDefaultActualizada?: (nuevoValorPesos: number) => void;
}> = ({ onCargarRespuesta, cuotaSocialDefaultPesos = 5500, onCuotaSocialDefaultActualizada }) => {
  const [tipoCuota, setTipoCuota] = useState<TipoCuotaPresentacion>('CUOTA_PRESTAMO');
  const [cuotaSocialPesos, setCuotaSocialPesos] = useState<number | ''>(cuotaSocialDefaultPesos);
  const [cuotaSocialEditada, setCuotaSocialEditada] = useState(false);
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
  const [incluirPresentadas, setIncluirPresentadas] = useState(false);
  const [aplicarDesglose, setAplicarDesglose] = useState(false);
  const [montoMinimoDesglose, setMontoMinimoDesglose] = useState(50000);
  const [presentadasExcluidas, setPresentadasExcluidas] = useState(0);

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

  useEffect(() => {
    if (!cuotaSocialEditada) {
      setCuotaSocialPesos(cuotaSocialDefaultPesos);
    }
  }, [cuotaSocialDefaultPesos, cuotaSocialEditada]);

  const handleCuotaSocialPesosChange = (val: number | '') => {
    setCuotaSocialEditada(true);
    setCuotaSocialPesos(val);
  };

  const csCentavosVigente = useMemo(
    () =>
      incluyeCuotaSocial(tipoCuota)
        ? aCuotaSocialCentavos(cuotaSocialPesos, cuotaSocialDefaultPesos)
        : null,
    [tipoCuota, cuotaSocialPesos, cuotaSocialDefaultPesos]
  );

  const cuotasMostradas = useMemo(
    () =>
      csCentavosVigente
        ? aplicarValorCuotaSocialEnItems(cuotas, csCentavosVigente, seleccionadas)
        : cuotas,
    [cuotas, csCentavosVigente, seleccionadas]
  );

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
    const csCentavos = incluyeCuotaSocial(tipoCuota)
      ? aCuotaSocialCentavos(cuotaSocialPesos, cuotaSocialDefaultPesos)
      : undefined;
    if (incluyeCuotaSocial(tipoCuota) && csCentavos === null) {
      setError('El Valor Cuota Social ($) debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    setError(null);
    setExito(null);
    try {
      const res = await buscarCuotasBapro({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        dni_desde: dniDesde === '' ? null : dniDesde,
        dni_hasta: dniHasta === '' ? null : dniHasta,
        incluir_presentadas: true,
        tipo_cuota: tipoCuota,
        cuota_social_centavos: csCentavos ?? undefined,
      });
      const filtrarPresentadas = (items: CuotaPresentableItem[]) =>
        incluirPresentadas ? items : items.filter((c) => c.estado !== 'PRESENTADA');
      const presentablesVisibles = filtrarPresentadas(res.presentables);
      const presentadas = [...res.presentables, ...res.excluidas].filter(
        (c) => c.estado === 'PRESENTADA'
      );
      setCuotas([...presentablesVisibles, ...filtrarPresentadas(res.excluidas)]);
      setPresentadasExcluidas(incluirPresentadas ? 0 : presentadas.length);
      setSeleccionadas(
        new Set(
          presentablesVisibles
            .filter((c) => c.estado !== 'PRESENTADA')
            .map((c) => claveItemPresentable(c))
        )
      );
      if (csCentavos) {
        onCuotaSocialDefaultActualizada?.(csCentavos / 100);
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar cuotas');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setDniDesde(''); setDniHasta(''); setFechaDesde(''); setFechaHasta('');
    setCuotas([]); setSeleccionadas(new Set()); setPresentadasExcluidas(0); setError(null); setExito(null);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(seleccionadas);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSeleccionadas(next);
  };

  const toggleSelectAll = () => {
    const pres = cuotas.filter((c) => c.presentable).map((c) => claveItemPresentable(c));
    setSeleccionadas(seleccionadas.size === pres.length ? new Set() : new Set(pres));
  };

  const handleGenerar = async () => {
    if (seleccionadas.size === 0) return;
    const { cuota_ids, cuota_social_ids } = partirIdsSeleccionados(cuotasMostradas, seleccionadas);
    const csCentavos =
      cuota_social_ids.length > 0
        ? aCuotaSocialCentavos(cuotaSocialPesos, cuotaSocialDefaultPesos)
        : undefined;
    if (cuota_social_ids.length > 0 && csCentavos === null) {
      setError('El Valor Cuota Social ($) debe ser mayor a cero.');
      return;
    }
    const totalSeleccionado = cuotasMostradas
      .filter((c) => seleccionadas.has(claveItemPresentable(c)))
      .reduce((acc, c) => acc + Number(c.monto_pesos || 0), 0);
    const fechaFormateada = fechaImpacto
      ? new Date(`${fechaImpacto}T00:00:00`).toLocaleDateString('es-AR')
      : 'Sin fecha';
    const confirmado = window.confirm(
      `¿Generar el archivo BAPRO?\n\n` +
      `Cuotas seleccionadas: ${seleccionadas.size}\n` +
      `Total a debitar: $${totalSeleccionado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `Fecha de impacto: ${fechaFormateada}\n` +
      `Archivo: ${nombreArchivo || 'Automático'}\n\n` +
      `Las cuotas seleccionadas quedarán marcadas como presentadas.`
    );
    if (!confirmado) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await generarPresentacionBapro({
        cuota_ids,
        cuota_social_ids,
        fecha_impacto: fechaImpacto,
        nro_lista: nroLista === '' ? undefined : Number(nroLista),
        nombre_archivo: nombreArchivo || undefined,
        empresa_originante_id: empresaId,
        aplicar_desglose: aplicarDesglose,
        monto_minimo_desglose_pesos: montoMinimoDesglose,
        cuota_social_centavos: csCentavos ?? undefined,
      });
      const montoFormateado = Number(res.total_monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setExito(`Lote #${res.nro_archivo} generado con éxito (${res.total_registros} débitos por $${montoFormateado}). Descargando...`);
      if (csCentavos) {
        onCuotaSocialDefaultActualizada?.(csCentavos / 100);
      }
      await descargarArchivoBapro(res.nro_archivo, res.nombre_archivo);
      await cargarDatosIniciales();
      await handleBuscar();
    } catch (err: any) {
      setError(err.message || 'Error al generar la presentación');
    } finally {
      setGenerando(false);
    }
  };

  const cuotasSeleccionadas = cuotasMostradas.filter((c) => seleccionadas.has(claveItemPresentable(c)));
  const totalMontoSeleccionado = cuotasSeleccionadas.reduce((acc, c) => acc + Number(c.monto_pesos || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Presentaciones Banco Provincia (BAPRO)</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Filtros de cuotas, numeración y layout oficial de 163 caracteres para Banco Provincia.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
<button onClick={() => setModalEmpresas(true)} style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>🏢 Empresas Originantes</button>
          <button onClick={onCargarRespuesta} className="px-3 py-2 rounded-md [border:1px_solid_#16a34a] bg-[#f0fdf4] text-[#16a34a] text-sm font-semibold cursor-pointer">📥 Cargar respuesta</button>
        </div>
      </div>

      <FiltrosBapro
        tipoCuota={tipoCuota}
        onTipoCuotaChange={(v) => {
          setTipoCuota(v);
          setCuotas([]);
          setSeleccionadas(new Set());
          setPresentadasExcluidas(0);
        }}
        cuotaSocialPesos={cuotaSocialPesos}
        onCuotaSocialPesosChange={handleCuotaSocialPesosChange}
        cuotaSocialDefaultPesos={cuotaSocialDefaultPesos}
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
      {presentadasExcluidas > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.825rem' }}>
          Ya presentadas excluidas: <strong>{presentadasExcluidas}</strong>. No se muestran porque la opción “Incluir cuotas presentadas” está desmarcada.
        </div>
      )}

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
              <th style={{ padding: '0.75rem 1rem' }}>Concepto / Cuota</th>
              <th style={{ padding: '0.75rem 1rem' }}>Vencimiento</th>
              <th style={{ padding: '0.75rem 1rem' }}>CBU Banco Provincia</th>
              <th style={{ padding: '0.75rem 1rem' }}>Monto Cuota</th>
              <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cuotasMostradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Hacé click en "Buscar" para visualizar las cuotas a presentar con los filtros seleccionados.</td></tr>
            ) : (
              cuotasMostradas.map((c) => {
                const clave = claveItemPresentable(c);
                const esSocial = esItemCuotaSocial(c);
                return (
                <tr key={clave} style={{ borderBottom: '1px solid #f1f5f9', opacity: c.presentable ? 1 : 0.6 }}>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <input type="checkbox" disabled={!c.presentable} checked={seleccionadas.has(clave)} onChange={() => toggleSelect(clave)} />
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}><strong>{c.socio_nombre}</strong><br /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>DNI: {c.socio_documento || 'S/D'}</span></td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                    {esSocial ? (
                      <span style={{ color: '#1d4ed8' }}>Cuota Social · {c.periodo || '-'}</span>
                    ) : (
                      <span>Préstamo · Cuota #{c.numero_cuota}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 1rem' }}>{c.fecha_vencimiento || '-'}</td>
                  <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{c.cbu || <span style={{ color: '#dc2626' }}>{c.motivo_exclusion}</span>}</td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>${Number(c.monto_pesos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <Badge variant={c.estado === 'PAGADA' ? 'success' : c.estado === 'RECHAZADA' ? 'danger' : c.estado === 'PRESENTADA' ? 'info' : 'warning'}>{c.estado}</Badge>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EmpresasModal isOpen={modalEmpresas} onClose={() => setModalEmpresas(false)} onEmpresasChanged={cargarDatosIniciales} />
    </div>
  );
};
