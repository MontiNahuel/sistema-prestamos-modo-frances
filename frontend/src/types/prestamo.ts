export type EstadoPrestamo = 'ACTIVO' | 'FINALIZADO' | 'CANCELADO' | 'MORA';
export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';

export interface CuotaPrestamo {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string | null;
  saldo_inicial_centavos: number;
  capital_centavos: number;
  interes_centavos: number;
  iva_interes_centavos: number;
  cuota_pura_centavos: number;
  cuota_total_centavos: number;
  saldo_final_centavos: number;
  estado: EstadoCuota;
  fecha_pago: string | null;
  monto_pagado_centavos: number;
}

export interface PrestamoLineaSnapshot {
  prestamo_id: string;
  linea_id: number;
  linea_codigo: string;
  linea_nombre: string;
  motor_id: number;
  motor_nombre: string;
  tasa_catalogo_vigente: number;
  alicuota_iva: number;
  monto_minimo_centavos: number;
  monto_maximo_centavos: number;
  plazo_minimo_meses: number;
  plazo_maximo_meses: number;
  reglas_motor_json: any;
  fecha_snapshot: string;
}

export interface Prestamo {
  id: string;
  persona_id: number;
  persona_nombre: string;
  persona_doc: string;
  linea_id?: number | null;
  linea_nombre?: string | null;
  motor_nombre?: string | null;
  monto_solicitado_centavos: number;
  plazo_meses: number;
  tna_pactada: number;
  tem_pactada: number;
  alicuota_iva: number;
  total_capital_centavos: number;
  total_interes_centavos: number;
  total_iva_centavos: number;
  total_a_pagar_centavos: number;
  saldo_deudor_actual_centavos: number;
  estado: EstadoPrestamo;
  fecha_alta: string;
  observaciones: string | null;
  cuotas?: CuotaPrestamo[];
  linea_snapshot?: PrestamoLineaSnapshot;
}

export interface PrestamoCreate {
  persona_id: number;
  persona_nombre: string;
  persona_doc?: string;
  monto_solicitado_centavos: number;
  plazo_meses: number;
  tna_pactada: number;
  alicuota_iva: number;
  linea_id?: number;
  motor_id?: number;
  fecha_primer_vencimiento?: string;
  observaciones?: string;
}
