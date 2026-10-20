import { apiClient } from './client';
import { LineaPrestamo, LineaPrestamoCreate, LineaPrestamoUpdate } from '../../types/linea';

export async function getLineas(soloActivas: boolean = false): Promise<LineaPrestamo[]> {
  const url = soloActivas ? '/api/v1/lineas?solo_activas=true' : '/api/v1/lineas';
  return apiClient<LineaPrestamo[]>(url);
}

export async function createLinea(data: LineaPrestamoCreate): Promise<LineaPrestamo> {
  return apiClient<LineaPrestamo>('/api/v1/lineas', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateLinea(id: number, data: LineaPrestamoUpdate): Promise<LineaPrestamo> {
  return apiClient<LineaPrestamo>(`/api/v1/lineas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteLinea(id: number): Promise<void> {
  return apiClient<void>(`/api/v1/lineas/${id}`, {
    method: 'DELETE'
  });
}
