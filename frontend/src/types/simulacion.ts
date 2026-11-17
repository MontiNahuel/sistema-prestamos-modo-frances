export type TipoCostoOperativo = 'FIJO' | 'PORCENTAJE';

export interface CuotaItem {
  numero_cuota: number;
  fecha_vencimiento?: string | null;
  dias_periodo: number;
  saldo_inicial_centavos: number;
  capital_centavos: number;
  interes_centavos: number;
  iva_interes_centavos: number;
  costo_operativo_centavos?: number;
  cuota_pura_centavos: number;
  cuota_total_centavos: number;
  saldo_final_centavos: number;
}

export interface PlanAmortizacion {
  monto_solicitado_centavos: number;
  plazo_meses: number;
  tasa_anual: string | number;
  convencion_tasa: string;
  base_dias: string;
  modalidad_iva: string;
  alicuota_iva: string | number;
  costo_operativo_tipo?: TipoCostoOperativo;
  costo_operativo_centavos?: number;
  costo_operativo_porcentaje?: string | number;
  cuota_pura_teorica_centavos: number;
  total_capital_centavos: number;
  total_interes_centavos: number;
  total_iva_centavos: number;
  total_costo_operativo_centavos?: number;
  total_a_pagar_centavos: number;
  tna?: string | number;
  tem?: string | number;
  tea?: string | number;
  cft_tna?: string | number;
  cft_tea?: string | number;
  cronograma: CuotaItem[];
}

export interface SimulacionPayload {
  monto_centavos: number;
  plazo_meses: number;
  tna: number; // Tasa enviada como decimal (ej: 0.60)
  alicuota_iva: number; // Ej: 0.21
  fecha_primer_vencimiento?: string | null;
  motor_id?: number | null;
  linea_id?: number | null;
  costo_operativo_tipo?: TipoCostoOperativo;
  costo_operativo_centavos?: number;
  costo_operativo_porcentaje?: number;
}
