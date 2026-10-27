import {
  BuscarCuotasBnaParams,
  BuscarCuotasBnaResponse,
  GenerarPresentacionBnaRequest,
  GenerarPresentacionBnaResponse,
  PresentacionBnaArchivoItem,
  PresentacionBnaAuditoriaItem,
  ProcesarRespuestaBnaResponse,
} from '../../types/presentacionesBna';

const BACKEND = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL || '';
const BNA_BASE = `${BACKEND}/api/v1/presentaciones-bna`;

export async function getProximoNroListaBna(): Promise<{ proximo_nro_lista: number }> {
  const res = await fetch(`${BNA_BASE}/proximo-nro-lista`);
  if (!res.ok) throw new Error('Error al obtener próximo número de lista BNA');
  return res.json();
}

export async function validarNroListaBna(nro: number): Promise<{ disponible: boolean }> {
  const res = await fetch(`${BNA_BASE}/validar-nro-lista/${nro}`);
  if (!res.ok) throw new Error('Error al validar número de lista BNA');
  return res.json();
}

export async function buscarCuotasBna(params: BuscarCuotasBnaParams): Promise<BuscarCuotasBnaResponse> {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
  if (params.fecha_corte) query.append('fecha_corte', params.fecha_corte);
  if (params.incluir_presentadas !== undefined) query.append('incluir_presentadas', String(params.incluir_presentadas));

  const res = await fetch(`${BNA_BASE}/cuotas-pendientes?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al buscar cuotas presentables BNA');
  }
  return res.json();
}

export async function generarPresentacionBna(
  payload: GenerarPresentacionBnaRequest
): Promise<GenerarPresentacionBnaResponse> {
  const res = await fetch(`${BNA_BASE}/generar-archivo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al generar la presentación BNA');
  }
  return res.json();
}

export async function descargarArchivoBna(archivoId: number, nombreArchivo: string): Promise<void> {
  const res = await fetch(`${BNA_BASE}/archivos/${archivoId}/descargar`);
  if (!res.ok) throw new Error('Error al descargar el archivo físico BNA');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function cargarRespuestaBna(
  archivoId: number,
  file: File
): Promise<ProcesarRespuestaBnaResponse> {
  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`${BNA_BASE}/archivos/${archivoId}/subir-respuesta`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al procesar el archivo de rendición BNA');
  }
  return res.json();
}

export async function getArchivosBna(): Promise<{ total: number; archivos: PresentacionBnaArchivoItem[] }> {
  const res = await fetch(`${BNA_BASE}/archivos`);
  if (!res.ok) throw new Error('Error al listar archivos de presentaciones BNA');
  return res.json();
}

export async function getDetallesArchivoBna(archivoId: number): Promise<PresentacionBnaAuditoriaItem[]> {
  const res = await fetch(`${BNA_BASE}/archivos/${archivoId}/detalles`);
  if (!res.ok) throw new Error('Error al obtener detalles de la presentación BNA');
  return res.json();
}
