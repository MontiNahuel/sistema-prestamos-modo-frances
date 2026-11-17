import {
  EmpresaOriginante,
  EmpresaOriginanteCreate,
  BuscarCuotasBaproParams,
  BuscarCuotasBaproResponse,
  GenerarPresentacionBaproRequest,
  GenerarPresentacionBaproResponse,
  ProcesarRespuestaBaproResponse,
  PresentacionBaproArchivo,
  ProximoNumeroListaResponse,
  ValidarNumeroListaResponse,
} from '../../types/presentacionesBapro';
import { apiClient, apiFetchRaw } from './client';

const BAPRO_BASE = '/api/v1/presentaciones-bapro';
const EMPRESAS_BASE = '/api/v1/empresas-originantes';

export async function getEmpresasOriginantes(soloActivas = false): Promise<EmpresaOriginante[]> {
  const url = soloActivas ? `${EMPRESAS_BASE}?solo_activas=true` : EMPRESAS_BASE;
  return apiClient<EmpresaOriginante[]>(url);
}

export async function crearEmpresaOriginante(data: EmpresaOriginanteCreate): Promise<EmpresaOriginante> {
  return apiClient<EmpresaOriginante>(EMPRESAS_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function actualizarEmpresaOriginante(id: number, data: Partial<EmpresaOriginanteCreate>): Promise<EmpresaOriginante> {
  return apiClient<EmpresaOriginante>(`${EMPRESAS_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function eliminarEmpresaOriginante(id: number): Promise<void> {
  await apiClient<void>(`${EMPRESAS_BASE}/${id}`, { method: 'DELETE' });
}

export async function getProximoNroLista(): Promise<ProximoNumeroListaResponse> {
  return apiClient<ProximoNumeroListaResponse>(`${BAPRO_BASE}/proximo-nro-lista`);
}

export async function validarNroLista(nro: number): Promise<ValidarNumeroListaResponse> {
  return apiClient<ValidarNumeroListaResponse>(`${BAPRO_BASE}/validar-nro-lista/${nro}`);
}

export async function buscarCuotasBapro(params: BuscarCuotasBaproParams): Promise<BuscarCuotasBaproResponse> {
  return apiClient<BuscarCuotasBaproResponse>(`${BAPRO_BASE}/buscar-cuotas`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function generarPresentacionBapro(
  payload: GenerarPresentacionBaproRequest
): Promise<GenerarPresentacionBaproResponse> {
  return apiClient<GenerarPresentacionBaproResponse>(`${BAPRO_BASE}/generar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function descargarArchivoBapro(nroArchivo: number, nombreArchivo: string): Promise<void> {
  const res = await apiFetchRaw(`${BAPRO_BASE}/descargar/${nroArchivo}`);
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

export async function cargarRespuestaBapro(
  nroArchivo: number,
  file: File
): Promise<ProcesarRespuestaBaproResponse> {
  const formData = new FormData();
  formData.append('nro_archivo', nroArchivo.toString());
  formData.append('file', file);

  return apiClient<ProcesarRespuestaBaproResponse>(`${BAPRO_BASE}/cargar-respuesta`, {
    method: 'POST',
    body: formData,
  });
}

export async function getArchivosBapro(): Promise<PresentacionBaproArchivo[]> {
  return apiClient<PresentacionBaproArchivo[]>(`${BAPRO_BASE}/archivos`);
}
