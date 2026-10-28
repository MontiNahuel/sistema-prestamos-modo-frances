export type ConvencionTasa =
  | 'TNA_PROPORCIONAL'
  | 'TEA_COMPUESTA'
  | 'TNA_DIAS_REALES'
  | 'TASA_ESTILO_ROMI'
  | 'TASA_ROMI_COMERCIAL_365';
export type BaseDias = 'COMERCIAL_30_360' | 'ACTUAL_365' | 'ACTUAL_360';
export type ModalidadIva = 'IVA_DECRECIENTE' | 'CUOTA_TOTAL_PLANA' | 'EXENTO';
export type AjusteResidual = 'ULTIMA_CUOTA' | 'PRIMERA_CUOTA';
export type RedondeoCuota = 'CON_CENTAVOS' | 'PESOS_ENTEROS';

export interface MotorCalculo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  convencion_tasa: ConvencionTasa;
  base_dias: BaseDias;
  modalidad_iva: ModalidadIva;
  ajuste_residual: AjusteResidual;
  redondeo_cuota?: RedondeoCuota;
  activo: boolean;
  es_sistema: boolean;
  fecha_creacion: string;
}

export interface MotorCalculoCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  convencion_tasa: ConvencionTasa;
  base_dias: BaseDias;
  modalidad_iva: ModalidadIva;
  ajuste_residual: AjusteResidual;
  redondeo_cuota?: RedondeoCuota;
  activo?: boolean;
}

export type MotorCalculoUpdate = Partial<MotorCalculoCreate>;
