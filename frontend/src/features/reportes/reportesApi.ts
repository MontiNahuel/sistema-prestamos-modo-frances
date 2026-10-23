import type { Prestamo } from '../../types/prestamo';
import { apiClient } from '../../services/api/client.ts';

/** Lee todas las páginas; nunca entrega un total parcial si falla una página o un detalle. */
export async function cargarCartera(signal: AbortSignal, progreso: (cantidad: number) => void): Promise<Prestamo[]> {
  const prestamos: Prestamo[] = [];
  const vistos = new Set<string>();
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const pagina = await apiClient<Prestamo[]>(`/api/v1/prestamos?limit=${limit}&offset=${offset}`, { signal });
    if (!Array.isArray(pagina)) throw new Error('La API no devolvió un listado de préstamos válido.');
    for (const p of pagina) {
      if (vistos.has(p.id)) throw new Error('La cartera cambió mientras se consultaba. Volvé a consultar para obtener totales completos.');
      vistos.add(p.id);
      prestamos.push(p);
    }
    progreso(prestamos.length);
    if (pagina.length < limit) break;
  }
  // Algunas versiones del listado no incluyen cuotas. Se recuperan con concurrencia limitada.
  let siguiente = 0;
  await Promise.all(Array.from({ length: Math.min(6, prestamos.length) }, async () => {
    while (siguiente < prestamos.length) {
      const i = siguiente++;
      if (!Array.isArray(prestamos[i].cuotas)) prestamos[i] = await apiClient<Prestamo>(`/api/v1/prestamos/${encodeURIComponent(prestamos[i].id)}`, { signal });
      if (!Array.isArray(prestamos[i].cuotas) || prestamos[i].cuotas!.length !== prestamos[i].plazo_meses) {
        throw new Error('Hay un préstamo con cronograma incompleto. No se generó el reporte para evitar totales parciales.');
      }
    }
  }));
  return prestamos;
}
