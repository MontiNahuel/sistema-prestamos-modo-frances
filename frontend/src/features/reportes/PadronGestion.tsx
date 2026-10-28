import { useState } from 'react';
import { PersonasBuscador } from '../../components/personas/PersonasBuscador';
import { PersonasTabla } from '../../components/personas/PersonasTabla';
import { buscarPersonas } from '../../services/api/personasApi';
import { apiClient } from '../../services/api/client';
import type { Persona, PersonaBusquedaParams } from '../../types/persona';

type Accion = 'agregar' | 'quitar';
type Resultado = { personas: { id: number; apellido: string | null; nombre: string; documento: string | null; anterior: string; nuevo: string; cambia: boolean }[]; faltantes: number[]; aplicado: boolean };

export function PadronGestion({ onActualizado }: { onActualizado: () => void }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [accion, setAccion] = useState<Accion>('agregar');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  /** Busca personas para seleccionarlas individualmente. */
  async function buscar(params: PersonaBusquedaParams) {
    setOcupado(true); setError('');
    try { setPersonas(await buscarPersonas(params)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo buscar.'); }
    finally { setOcupado(false); }
  }

  /** Lee la columna IdPersona de la primera hoja del archivo Excel. */
  async function cargarExcel(file?: File) {
    if (!file) return;
    setError(''); setResultado(null); setMensaje('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MB.');
      const { default: ExcelJS } = await import('exceljs');
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(await file.arrayBuffer());
      const hoja = libro.worksheets[0];
      if (!hoja) throw new Error('El archivo no contiene hojas.');
      const cabecera = hoja.getRow(1);
      let columna = 0;
      cabecera.eachCell((celda, n) => { if (String(celda.value ?? '').trim().toLowerCase().replace(/[\s_]/g, '') === 'idpersona') columna = n; });
      if (!columna) throw new Error('La primera fila debe contener una columna IdPersona.');
      const lista: number[] = [];
      for (let n = 2; n <= hoja.rowCount; n++) {
        const valor = hoja.getRow(n).getCell(columna).value;
        if (valor == null || valor === '') continue;
        if (!/^\d+$/.test(String(valor).trim()) || !Number.isSafeInteger(Number(valor)) || Number(valor) <= 0) throw new Error(`ID inválido en la fila ${n}.`);
        lista.push(Number(valor));
      }
      if (!lista.length || lista.length > 5000) throw new Error('El archivo debe contener entre 1 y 5000 ID.');
      setIds([...new Set(lista)]); setMensaje(`${lista.length} filas leídas; ${new Set(lista).size} personas únicas.`);
    } catch (e) { setIds([]); setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.'); }
  }

  /** Consulta la vista previa o aplica el cambio para la selección actual. */
  async function procesar(aplicar: boolean) {
    setOcupado(true); setError(''); setMensaje('');
    try {
      const observaciones_previas = aplicar ? Object.fromEntries((resultado?.personas ?? []).map(p => [p.id, p.anterior])) : undefined;
      const res = await apiClient<Resultado>('/api/v1/personas/padron-cooperativa/cambios', { method: 'POST', body: JSON.stringify({ ids, accion, aplicar, observaciones_previas }) });
      setResultado(res);
      if (aplicar) { setMensaje(`Operación completada: ${res.personas.filter(p => p.cambia).length} personas actualizadas.`); setIds([]); onActualizado(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo procesar.'); }
    finally { setOcupado(false); }
  }

  return <div className="my-6 rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="mb-2 text-lg font-bold text-slate-900">Administrar padrón de socios</h3>
    <p className="mb-4 text-sm text-slate-600">Buscá una persona o cargá un Excel (.xlsx) con una columna IdPersona en la primera fila.</p>
    <PersonasBuscador onBuscar={buscar} buscando={ocupado} />
    {personas.length > 0 && <div className="mb-4 overflow-x-auto"><PersonasTabla personas={personas} personaSeleccionada={null} buscando={ocupado} textoAccion="Seleccionar" onSeleccionar={p => { setIds([p.idPersona]); setResultado(null); setMensaje(`Persona seleccionada: ${p.apellido} ${p.nombre} (#${p.idPersona}).`); }} /></div>}
    <div className="flex flex-wrap items-end gap-4">
      <label className="text-sm font-medium text-slate-700">Archivo Excel<input type="file" accept=".xlsx" disabled={ocupado} className="mt-1 block text-sm" onChange={e => { void cargarExcel(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>
      <label className="text-sm font-medium text-slate-700">Acción<select value={accion} onChange={e => { setAccion(e.target.value as Accion); setResultado(null); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="agregar">Agregar al padrón</option><option value="quitar">Quitar del padrón</option></select></label>
      <button type="button" disabled={ocupado || !ids.length} onClick={() => void procesar(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Revisar {ids.length} personas</button>
    </div>
    {mensaje && <p role="status" className="mt-3 text-sm text-green-700">{mensaje}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {resultado && !resultado.aplicado && <div className="mt-4">
      <p className="text-sm text-slate-700">{resultado.personas.length} personas encontradas; {resultado.personas.filter(p => p.cambia).length} se actualizarán.</p>
      {resultado.faltantes.length > 0 && <p role="alert" className="mt-2 text-sm text-red-700">ID inexistentes: {resultado.faltantes.join(', ')}. Corregí el archivo antes de aplicar.</p>}
      <div className="mt-2 max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>ID</th><th>Persona</th><th>Observación actual</th><th>Observación resultante</th></tr></thead><tbody>{resultado.personas.map(p => <tr key={p.id} className="border-t border-slate-200"><td className="p-2">{p.id}</td><td className="p-2">{p.apellido} {p.nombre} ({p.documento})</td><td className="p-2">{p.anterior || '—'}</td><td className="p-2">{p.nuevo || '—'}</td></tr>)}</tbody></table></div>
      <button type="button" disabled={ocupado || !!resultado.faltantes.length || !resultado.personas.some(p => p.cambia)} onClick={() => void procesar(true)} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar {accion === 'agregar' ? 'alta' : 'baja'} en padrón</button>
    </div>}
  </div>;
}
