export interface LoginCredentials {
  usuario: string;
  contrasena: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
  detail?: string;
}
