import { Prestamo, PrestamoCreate } from '../../types/prestamo';

const API_BASE = `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/prestamos`;

export async function getPrestamos(params?: {
  persona_id?: number;
  estado?: string;
  buscar?: string;
}): Promise<Prestamo[]> {
  const query = new URLSearchParams();
  if (params?.persona_id) query.append('persona_id', params.persona_id.toString());
  if (params?.estado) query.append('estado', params.estado);
  if (params?.buscar) query.append('buscar', params.buscar);

  const qs = query.toString();
  const url = qs ? `${API_BASE}?${qs}` : API_BASE;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al obtener préstamos');
  }
  return res.json();
}

export async function getPrestamoById(id: string): Promise<Prestamo> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al obtener detalle del préstamo');
  }
  return res.json();
}

export async function otorgarPrestamo(payload: PrestamoCreate): Promise<Prestamo> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al otorgar préstamo');
  }
  return res.json();
}

export async function cancelarPrestamo(id: string): Promise<Prestamo> {
  const res = await fetch(`${API_BASE}/${id}/cancelar`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al cancelar préstamo');
  }
  return res.json();
}

export async function pagarCuota(prestamoId: string, numeroCuota: number): Promise<Prestamo> {
  const res = await fetch(`${API_BASE}/${prestamoId}/cuotas/${numeroCuota}/pagar`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al registrar pago de cuota');
  }
  return res.json();
}
