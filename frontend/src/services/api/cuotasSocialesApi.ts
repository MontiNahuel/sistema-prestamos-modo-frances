import { apiClient } from './client';
import { ActivarCuotaSocialPayload, SocioCuotaSocialEstado } from '../../types/cuotaSocial';

const BASE = '/api/v1/cuotas-sociales';

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
