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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '1.5rem', fontWeight: 700 }}>
            Sistema de Préstamos
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Autenticación centralizada con CoopYa
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingresá tu usuario"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem', color: '#374151' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Ingresá tu contraseña"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          {error && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
