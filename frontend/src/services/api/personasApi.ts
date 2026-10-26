import { apiClient } from './client';
import {
  Persona,
  CuentaCorrienteResumen,
  PersonaBusquedaParams,
  Banco,
  PersonaCreatePayload,
  PersonaCreateResponse
} from '../../types/persona';

export async function buscarPersonas(params: PersonaBusquedaParams): Promise<Persona[]> {
  return apiClient<Persona[]>('/api/v1/personas/buscar', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getCuentaCorriente(idPersona: number): Promise<CuentaCorrienteResumen> {
  return apiClient<CuentaCorrienteResumen>(`/api/v1/personas/${idPersona}/cuenta-corriente`);
}

export async function getBancos(): Promise<Banco[]> {
  return apiClient<Banco[]>('/api/v1/personas/bancos');
}

export async function crearPersona(payload: PersonaCreatePayload): Promise<PersonaCreateResponse> {
  return apiClient<PersonaCreateResponse>('/api/v1/personas', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
