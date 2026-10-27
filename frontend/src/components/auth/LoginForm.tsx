import React, { useState } from 'react';
import { login } from '../../services/api/authApi';

interface LoginFormProps {
  onSuccess: (token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await login({ usuario: usuario.trim(), contrasena });
      if (res.success && res.token) {
        onSuccess(res.token);
      } else {
        setError(res.message || 'Usuario o contraseña inválidos');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] [font-family:system-ui,_sans-serif]">
      <div className="bg-[#ffffff] p-10 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h2 className="m-0 text-[#111827] text-[1.5rem] font-bold">
            Sistema de Préstamos
          </h2>
          <p className="m-[0.5rem_0_0] text-[#6b7280] text-[0.875rem]">
            Autenticación centralizada con CoopYa
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block font-semibold text-[0.875rem] mb-[0.375rem] text-[#374151]">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingresá tu usuario"
              className="w-full p-[0.625rem] rounded-md [border:1px_solid_#d1d5db] text-[1rem] box-border"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block font-semibold text-[0.875rem] mb-[0.375rem] text-[#374151]">
              Contraseña
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Ingresá tu contraseña"
              className="w-full p-[0.625rem] rounded-md [border:1px_solid_#d1d5db] text-[1rem] box-border"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={[
              'w-full p-3 bg-[#2563eb] text-[#ffffff] [border:none] rounded-md font-semibold text-[1rem]',
              loading ? 'cursor-not-allowed' : 'cursor-pointer'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          {error && (
            <div className="mt-5 p-3 bg-[#fee2e2] text-[#991b1b] rounded-md text-[0.875rem] text-center">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
