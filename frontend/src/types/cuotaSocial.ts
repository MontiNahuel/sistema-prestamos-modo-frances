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
  valor_centavos?: number;
  prestamo_id?: string | null;
  fecha_primer_vencimiento?: string | null;
}

export interface CuotaSocialConfig {
  valor_default_centavos: number;
  fecha_actualizacion?: string | null;
  actualizado_por?: string | null;
  socios_activos_count: number;
  cuotas_pendientes_modificables_count: number;
}

export interface ActualizarCuotaSocialConfigPayload {
  valor_default_centavos: number;
  aplicar_a_activos: boolean;
}

export interface ActualizarCuotaSocialConfigResponse extends CuotaSocialConfig {
  valor_anterior_centavos: number;
  socios_actualizados: number;
  cuotas_pendientes_actualizadas: number;
}

export interface CuotaSocialSocioActivoItem {
  socio_id: number;
  nombre_completo: string;
  documento?: string | null;
  valor_centavos: number;
  fecha_alta?: string | null;
  prestamo_id?: string | null;
  cuotas_pendientes: number;
}

export interface CuotaSocialSociosActivosResponse {
  total: number;
  items: CuotaSocialSocioActivoItem[];
}

export interface CuotaSocialReporteItem {
  id: string;
  socio_id: number;
  persona_nombre: string;
  persona_doc?: string | null;
  prestamo_id?: string | null;
  numero_prestamo?: number | null;
  periodo: string;
  fecha_vencimiento: string;
  valor_centavos: number;
  monto_pagado_centavos: number;
  estado: string;
  fecha_pago?: string | null;
  cuota_social_activa: boolean;
}
