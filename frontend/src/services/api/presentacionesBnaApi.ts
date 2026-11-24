import {
  BuscarCuotasBnaParams,
  BuscarCuotasBnaResponse,
  GenerarPresentacionBnaRequest,
  GenerarPresentacionBnaResponse,
  PresentacionBnaArchivoItem,
  PresentacionBnaAuditoriaItem,
  ProcesarRespuestaBnaResponse,
} from '../../types/presentacionesBna';
import { apiClient, apiFetchRaw } from './client';

const BNA_BASE = '/api/v1/presentaciones-bna';

export async function getProximoNroListaBna(): Promise<{ proximo_nro_lista: number }> {
  return apiClient<{ proximo_nro_lista: number }>(`${BNA_BASE}/proximo-nro-lista`);
}

export async function validarNroListaBna(nro: number): Promise<{ disponible: boolean }> {
  return apiClient<{ disponible: boolean }>(`${BNA_BASE}/validar-nro-lista/${nro}`);
}

export async function buscarCuotasBna(params: BuscarCuotasBnaParams): Promise<BuscarCuotasBnaResponse> {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
  if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
  if (params.fecha_corte) query.append('fecha_corte', params.fecha_corte);
  if (params.incluir_presentadas !== undefined) query.append('incluir_presentadas', String(params.incluir_presentadas));
  if (params.tipo_cuota) query.append('tipo_cuota', params.tipo_cuota);
  if (params.cuota_social_centavos !== undefined) {
    query.append('cuota_social_centavos', String(params.cuota_social_centavos));
  }

  return apiClient<BuscarCuotasBnaResponse>(`${BNA_BASE}/cuotas-pendientes?${query.toString()}`);
}

export async function generarPresentacionBna(
  payload: GenerarPresentacionBnaRequest
): Promise<GenerarPresentacionBnaResponse> {
  return apiClient<GenerarPresentacionBnaResponse>(`${BNA_BASE}/generar-archivo`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function descargarArchivoBna(archivoId: number, nombreArchivo: string): Promise<void> {
  const res = await apiFetchRaw(`${BNA_BASE}/archivos/${archivoId}/descargar`);
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

  return apiClient<ProcesarRespuestaBnaResponse>(`${BNA_BASE}/archivos/${archivoId}/subir-respuesta`, {
    method: 'POST',
    body: formData,
  });
}

export async function getArchivosBna(): Promise<{ total: number; archivos: PresentacionBnaArchivoItem[] }> {
  return apiClient<{ total: number; archivos: PresentacionBnaArchivoItem[] }>(`${BNA_BASE}/archivos`);
}

export async function getDetallesArchivoBna(archivoId: number): Promise<PresentacionBnaAuditoriaItem[]> {
  return apiClient<PresentacionBnaAuditoriaItem[]>(`${BNA_BASE}/archivos/${archivoId}/detalles`);
}
