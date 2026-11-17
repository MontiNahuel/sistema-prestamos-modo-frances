import type { TipoCuotaPresentacion } from '../types/presentacionesBapro';

export interface ItemPresentableBase {
  cuota_id: string | null;
  cuota_social_id?: string | null;
  tipo_item?: 'CUOTA_PRESTAMO' | 'CUOTA_SOCIAL';
  periodo?: string | null;
  numero_cuota: number | null;
}

export const OPCIONES_TIPO_CUOTA: { value: TipoCuotaPresentacion; label: string }[] = [
  { value: 'CUOTA_PRESTAMO', label: 'Cuota de Préstamo' },
  { value: 'CUOTA_SOCIAL', label: 'Cuota Social' },
  { value: 'PRESTAMO_Y_CUOTA_SOCIAL', label: 'Cuota de Préstamo + Cuota Social' },
];

export function claveItemPresentable(item: ItemPresentableBase): string {
  if (item.tipo_item === 'CUOTA_SOCIAL' || (!item.cuota_id && item.cuota_social_id)) {
    return `CS:${item.cuota_social_id ?? ''}`;
  }
  return `CP:${item.cuota_id ?? ''}`;
}

export function esItemCuotaSocial(item: ItemPresentableBase): boolean {
  return item.tipo_item === 'CUOTA_SOCIAL' || (!item.cuota_id && Boolean(item.cuota_social_id));
}

export function partirIdsSeleccionados<T extends ItemPresentableBase>(
  items: T[],
  seleccionadas: Set<string>
): { cuota_ids: string[]; cuota_social_ids: string[] } {
  const cuota_ids: string[] = [];
  const cuota_social_ids: string[] = [];
  for (const item of items) {
    if (!seleccionadas.has(claveItemPresentable(item))) continue;
    if (esItemCuotaSocial(item)) {
      if (item.cuota_social_id) cuota_social_ids.push(item.cuota_social_id);
    } else if (item.cuota_id) {
      cuota_ids.push(item.cuota_id);
    }
  }
  return { cuota_ids, cuota_social_ids };
}
