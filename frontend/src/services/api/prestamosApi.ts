import { Prestamo, PrestamoCreate } from '../../types/prestamo';
import { apiClient } from './client';

const API_BASE = '/api/v1/prestamos';

export async function getPrestamos(params?: {
  persona_id?: number;
  estado?: string;
  buscar?: string;
}): Promise<Prestamo[]> {
  const query = new URLSearchParams();
  if (params?.persona_id) query.append('persona_id', params.persona_id.toString());
  if (params?.estado) query.append('estado', params.estado);
  if (params?.buscar) query.append('buscar', params.buscar);

  const qs = query.toString();
  const url = qs ? `${API_BASE}?${qs}` : API_BASE;

  return apiClient<Prestamo[]>(url);
}

export async function getPrestamoById(id: string): Promise<Prestamo> {
  return apiClient<Prestamo>(`${API_BASE}/${id}`);
}

export async function otorgarPrestamo(payload: PrestamoCreate): Promise<Prestamo> {
  return apiClient<Prestamo>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelarPrestamo(id: string): Promise<Prestamo> {
  return apiClient<Prestamo>(`${API_BASE}/${id}/cancelar`, {
    method: 'POST',
  });
}

export async function pagarCuota(prestamoId: string, numeroCuota: number): Promise<Prestamo> {
  return apiClient<Prestamo>(`${API_BASE}/${prestamoId}/cuotas/${numeroCuota}/pagar`, {
    method: 'POST',
  });
}
