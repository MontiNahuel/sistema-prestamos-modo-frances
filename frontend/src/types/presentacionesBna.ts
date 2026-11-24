import type { TipoCuotaPresentacion } from './presentacionesBapro';

export interface CuotaPresentableBnaItem {
  cuota_id: string | null;
  cuota_social_id?: string | null;
  tipo_item?: 'CUOTA_PRESTAMO' | 'CUOTA_SOCIAL';
  periodo?: string | null;
  prestamo_id: string | null;
  numero_cuota: number | null;
  socio_id: number;
  socio_nombre: string;
  socio_documento?: string | null;
  cbu?: string | null;
  sucursal_bna?: string | null;
  nro_cuenta_bna?: string | null;
  monto_pesos: number;
  monto_centavos: number;
  fecha_vencimiento?: string | null;
  estado: string;
  presentable: boolean;
  motivo_exclusion?: string | null;
}

export interface BuscarCuotasBnaParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  fecha_corte?: string;
  incluir_presentadas?: boolean;
  tipo_cuota?: TipoCuotaPresentacion;
  cuota_social_centavos?: number;
}

export interface BuscarCuotasBnaResponse {
  presentables: CuotaPresentableBnaItem[];
  excluidas: CuotaPresentableBnaItem[];
  total_presentables: number;
  total_monto_pesos: number;
}

export interface GenerarPresentacionBnaRequest {
  cuota_ids: string[];
  cuota_social_ids?: string[];
  nro_lista?: number;
  nombre_archivo?: string | null;
  fecha_impacto?: string;
  numero_operacion_inicial?: number;
  casa?: string;
  producto?: string;
  cuenta?: string;
  indicador_lote?: string;
  cuota_social_centavos?: number;
}

export interface GenerarPresentacionBnaResponse {
  archivo_id: number;
  nro_archivo: number;
  nombre_archivo: string;
  total_registros: number;
  total_monto_pesos: number;
  ruta_descarga: string;
}

export interface PresentacionBnaArchivoItem {
  id: number;
  nro_archivo: number;
  tipo: string;
  fecha_generacion: string;
  total_registros: number;
  total_monto: number;
  estado: string;
  nombre_archivo: string;
}

export interface PresentacionBnaAuditoriaItem {
  id: number;
  numero_operacion: number;
  id_persona: number;
  socio_nombre?: string | null;
  sucursal_cuenta_cliente: string;
  nro_cuenta_cliente: string;
  monto_pesos: number;
  concepto_debito: string;
  codigo_respuesta?: string | null;
  descripcion_rechazo?: string | null;
  fecha_respuesta?: string | null;
}

export interface ProcesarRespuestaBnaResponse {
  archivo_id: number;
  total_lineas: number;
  actualizados: number;
  exitosos: number;
  rechazados: number;
  no_encontrados: number;
  mensaje: string;
}
