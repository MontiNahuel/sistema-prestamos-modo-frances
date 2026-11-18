import { apiClient } from './client';
import {
  ActivarCuotaSocialPayload,
  ActualizarCuotaSocialConfigPayload,
  ActualizarCuotaSocialConfigResponse,
  CuotaSocialConfig,
  CuotaSocialSociosActivosResponse,
  SocioCuotaSocialEstado,
} from '../../types/cuotaSocial';

const BASE = '/api/v1/cuotas-sociales';

export function getConfiguracionCuotaSocial(): Promise<CuotaSocialConfig> {
  return apiClient<CuotaSocialConfig>(`${BASE}/configuracion`);
}

export function actualizarConfiguracionCuotaSocial(
  payload: ActualizarCuotaSocialConfigPayload
): Promise<ActualizarCuotaSocialConfigResponse> {
  return apiClient<ActualizarCuotaSocialConfigResponse>(`${BASE}/configuracion`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getSociosCuotaSocialActivos(buscar?: string): Promise<CuotaSocialSociosActivosResponse> {
  const query = new URLSearchParams();
  if (buscar && buscar.trim()) query.append('buscar', buscar.trim());
  const qs = query.toString();
  return apiClient<CuotaSocialSociosActivosResponse>(qs ? `${BASE}/activos?${qs}` : `${BASE}/activos`);
}

export function getEstadoCuotaSocialSocio(socioId: number): Promise<SocioCuotaSocialEstado> {
  return apiClient<SocioCuotaSocialEstado>(`${BASE}/socio/${socioId}`);
}

export function activarCuotaSocialSocio(
  socioId: number,
  payload: ActivarCuotaSocialPayload
): Promise<SocioCuotaSocialEstado> {
  return apiClient<SocioCuotaSocialEstado>(`${BASE}/socio/${socioId}/activar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function bajaCuotaSocialSocio(socioId: number): Promise<SocioCuotaSocialEstado> {
  return apiClient<SocioCuotaSocialEstado>(`${BASE}/socio/${socioId}/baja`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
