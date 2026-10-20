import { MotorCalculo } from './motor';

export interface LineaPrestamo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  motor_id: number;
  motor?: MotorCalculo;
  tipo_tasa: string; // TNA o TEA
  tasa_default: string | number; // Ej: 0.60 para 60%
  alicuota_iva: string | number; // Ej: 0.21 para 21%
  permite_override_tasa: boolean;
  monto_minimo_centavos: number;
  monto_maximo_centavos: number;
  monto_paso_centavos: number;
  plazo_minimo_meses: number;
  plazo_maximo_meses: number;
  requiere_socio_al_dia: boolean;
  gasto_otorgamiento_pct: string | number;
  seguro_vida_mensual_pct: string | number;
  activo: boolean;
  fecha_creacion: string;
}

export interface LineaPrestamoCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  motor_id: number;
  tipo_tasa: string;
  tasa_default: number;
  alicuota_iva: number;
  permite_override_tasa: boolean;
  monto_minimo_centavos: number;
  monto_maximo_centavos: number;
  monto_paso_centavos: number;
  plazo_minimo_meses: number;
  plazo_maximo_meses: number;
  requiere_socio_al_dia: boolean;
  gasto_otorgamiento_pct?: number;
  seguro_vida_mensual_pct?: number;
  activo?: boolean;
}

export type LineaPrestamoUpdate = Partial<LineaPrestamoCreate>;
