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

const BACKEND = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_BACKEND_URL || '';
const BAPRO_BASE = `${BACKEND}/api/v1/presentaciones-bapro`;
const EMPRESAS_BASE = `${BACKEND}/api/v1/empresas-originantes`;

export async function getEmpresasOriginantes(soloActivas = false): Promise<EmpresaOriginante[]> {
  const url = soloActivas ? `${EMPRESAS_BASE}?solo_activas=true` : EMPRESAS_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar empresas originantes');
  return res.json();
}

export async function crearEmpresaOriginante(data: EmpresaOriginanteCreate): Promise<EmpresaOriginante> {
  const res = await fetch(EMPRESAS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al crear empresa originante');
  }
  return res.json();
}

export async function actualizarEmpresaOriginante(id: number, data: Partial<EmpresaOriginanteCreate>): Promise<EmpresaOriginante> {
  const res = await fetch(`${EMPRESAS_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al actualizar empresa originante');
  }
  return res.json();
}

export async function eliminarEmpresaOriginante(id: number): Promise<void> {
  const res = await fetch(`${EMPRESAS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar empresa originante');
}

export async function getProximoNroLista(): Promise<ProximoNumeroListaResponse> {
  const res = await fetch(`${BAPRO_BASE}/proximo-nro-lista`);
  if (!res.ok) throw new Error('Error al obtener próximo número de lista');
  return res.json();
}

export async function validarNroLista(nro: number): Promise<ValidarNumeroListaResponse> {
  const res = await fetch(`${BAPRO_BASE}/validar-nro-lista/${nro}`);
  if (!res.ok) throw new Error('Error al validar número de lista');
  return res.json();
}

export async function buscarCuotasBapro(params: BuscarCuotasBaproParams): Promise<BuscarCuotasBaproResponse> {
  const res = await fetch(`${BAPRO_BASE}/buscar-cuotas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al buscar cuotas presentables');
  }
  return res.json();
}

export async function generarPresentacionBapro(
  payload: GenerarPresentacionBaproRequest
): Promise<GenerarPresentacionBaproResponse> {
  const res = await fetch(`${BAPRO_BASE}/generar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al generar la presentación BAPRO');
  }
  return res.json();
}

export async function descargarArchivoBapro(nroArchivo: number, nombreArchivo: string): Promise<void> {
  const res = await fetch(`${BAPRO_BASE}/descargar/${nroArchivo}`);
  if (!res.ok) throw new Error('Error al descargar el archivo físico');
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

  const res = await fetch(`${BAPRO_BASE}/cargar-respuesta`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al procesar el archivo de respuesta');
  }
  return res.json();
}

export async function getArchivosBapro(): Promise<PresentacionBaproArchivo[]> {
  const res = await fetch(`${BAPRO_BASE}/archivos`);
  if (!res.ok) throw new Error('Error al listar archivos de presentaciones BAPRO');
  return res.json();
}
