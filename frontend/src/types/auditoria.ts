export interface PaginatedResponse<T> {
  items: T[];
  total: int_or_number;
  limit: number;
  offset: number;
}

type int_or_number = number;

export interface AuditoriaPrestamoItem {
  id: number;
  prestamo_id: string;
  accion: string;
  cuota_numero?: number;
  monto_centavos?: number;
  saldo_deudor_remanente_centavos?: number;
  usuario_operador?: string;
  motivo?: string;
  ip_origen?: string;
  detalles_json?: Record<string, any>;
  fecha_registro: string;
}

export interface AuditoriaPresentacionBaproItem {
  id: number;
  nro_archivo?: number;
  presentacion_archivo_id?: number;
  accion: string;
  total_registros?: number;
  total_monto?: number;
  registros_aprobados?: number;
  registros_rechazados?: number;
  dni_afectado?: string;
  usuario_operador?: string;
  motivo?: string;
  ip_origen?: string;
  detalles_json?: Record<string, any>;
  fecha_registro: string;
}

export interface AuditoriaConfiguracionCreditoItem {
  id: number;
  tipo_entidad: string;
  entidad_id: number;
  accion: string;
  codigo?: string;
  nombre?: string;
  tasa_anterior?: number;
  tasa_nueva?: number;
  usuario_operador?: string;
  motivo?: string;
  ip_origen?: string;
  cambios_json?: Record<string, any>;
  fecha_registro: string;
}

export interface AuditoriaSincronizacionPersonaItem {
  id: number;
  documento: string;
  id_persona_oracle?: number;
  id_persona_coopya?: number;
  estado: string;
  accion: string;
  detalle_error?: string;
  payload_json?: Record<string, any>;
  usuario_operador?: string;
  ip_origen?: string;
  fecha_registro: string;
}
