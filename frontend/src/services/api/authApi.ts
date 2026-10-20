import { apiClient } from './client';
import { LoginCredentials, AuthResponse } from '../../types/auth';

export async function login(creds: LoginCredentials): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(creds)
  });
}
