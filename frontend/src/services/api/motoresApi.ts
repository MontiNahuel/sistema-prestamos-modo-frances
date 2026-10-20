import { apiClient } from './client';
import { MotorCalculo, MotorCalculoCreate, MotorCalculoUpdate } from '../../types/motor';

export async function getMotores(soloActivos: boolean = false): Promise<MotorCalculo[]> {
  const url = soloActivos ? '/api/v1/motores?solo_activos=true' : '/api/v1/motores';
  return apiClient<MotorCalculo[]>(url);
}

export async function createMotor(data: MotorCalculoCreate): Promise<MotorCalculo> {
  return apiClient<MotorCalculo>('/api/v1/motores', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateMotor(id: number, data: MotorCalculoUpdate): Promise<MotorCalculo> {
  return apiClient<MotorCalculo>(`/api/v1/motores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteMotor(id: number): Promise<void> {
  return apiClient<void>(`/api/v1/motores/${id}`, {
    method: 'DELETE'
  });
}
