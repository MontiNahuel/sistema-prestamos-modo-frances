export interface CuotaSocialItem {
  id: string;
  socio_id: number;
  prestamo_id?: string | null;
  periodo: string;
  fecha_vencimiento: string;
  valor_centavos: number;
  monto_pagado_centavos: number;
  estado: string;
  fecha_pago?: string | null;
  fecha_alta: string;
}

export interface SocioCuotaSocialEstado {
  socio_id: number;
  activa: boolean;
  valor_centavos: number;
  prestamo_id?: string | null;
  fecha_alta?: string | null;
  fecha_baja?: string | null;
  dia_vencimiento: number;
  cuotas: CuotaSocialItem[];
}

export interface ActivarCuotaSocialPayload {
  valor_centavos: number;
  prestamo_id?: string | null;
  fecha_primer_vencimiento?: string | null;
}
