import { apiClient } from './client';
import { LoginCredentials, AuthResponse, UserProfile } from '../../types/auth';

export async function login(creds: LoginCredentials): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(creds)
  });
}

export async function getPerfilActual(): Promise<UserProfile> {
  return apiClient<UserProfile>('/api/v1/auth/me');
}
