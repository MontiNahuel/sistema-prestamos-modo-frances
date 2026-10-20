import { apiClient } from './client';
import { SimulacionPayload, PlanAmortizacion } from '../../types/simulacion';

export async function simularPrestamo(payload: SimulacionPayload): Promise<PlanAmortizacion> {
  return apiClient<PlanAmortizacion>('/api/v1/simulaciones', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
