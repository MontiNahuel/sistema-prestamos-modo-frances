import { apiClient } from './client';
import { Persona, CuentaCorrienteResumen, PersonaBusquedaParams } from '../../types/persona';

export async function buscarPersonas(params: PersonaBusquedaParams): Promise<Persona[]> {
  return apiClient<Persona[]>('/api/v1/personas/buscar', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getCuentaCorriente(idPersona: number): Promise<CuentaCorrienteResumen> {
  return apiClient<CuentaCorrienteResumen>(`/api/v1/personas/${idPersona}/cuenta-corriente`);
}
