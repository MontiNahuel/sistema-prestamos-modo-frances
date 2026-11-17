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

export interface UserProfile {
  id: number;
  usuario: string;
  mail?: string;
  roles: string[];
  es_acceso_completo: boolean;
  sistema_central_url?: string | null;
}
