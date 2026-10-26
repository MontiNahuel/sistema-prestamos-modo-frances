export interface EmpresaOriginante {
  id: number;
  cuit: string;
  razon_social: string;
  nombre_fantasia?: string | null;
  prefijo_archivo: string;
  descripcion_transaccion: string;
  activo: boolean;
  predeterminado: boolean;
  fecha_creacion: string;
}

export interface EmpresaOriginanteCreate {
  cuit: string;
  razon_social: string;
  nombre_fantasia?: string;
  prefijo_archivo?: string;
  descripcion_transaccion?: string;
  activo?: boolean;
  predeterminado?: boolean;
}

export interface CuotaPresentableItem {
  cuota_id: string;
  prestamo_id: string;
  numero_cuota: number;
  socio_id: number;
  socio_nombre: string;
  socio_documento?: string | null;
  cbu?: string | null;
  monto_pesos: number;
  monto_centavos: number;
  fecha_vencimiento?: string | null;
  estado: string;
  presentable: boolean;
  motivo_exclusion?: string | null;
}

export interface BuscarCuotasBaproParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  fecha_corte?: string;
  dni_desde?: number | null;
  dni_hasta?: number | null;
  incluir_presentadas?: boolean;
  base_filtrada?: boolean;
}

export interface BuscarCuotasBaproResponse {
  presentables: CuotaPresentableItem[];
  excluidas: CuotaPresentableItem[];
  total_presentables: number;
  total_monto_pesos: number;
}

export interface GenerarPresentacionBaproRequest {
  cuota_ids: string[];
  fecha_impacto?: string;
  nro_lista?: number;
  empresa_originante_id?: number | null;
  aplicar_desglose?: boolean;
  monto_minimo_desglose_pesos?: number;
  numero_operacion_inicial?: number;
  nombre_archivo?: string | null;
  id_corrida?: string | null;
}

export interface GenerarPresentacionBaproResponse {
  nro_archivo: number;
  nombre_archivo: string;
  total_registros: number;
  total_monto: number;
  ruta: string;
  fecha_generacion: string;
}

export interface ProcesarRespuestaBaproResponse {
  nro_archivo: number;
  total_procesados: number;
  aprobados: number;
  rechazados: number;
  no_encontrados: number;
}

export interface PresentacionBaproArchivo {
  id: number;
  nro_archivo: number;
  ruta: string;
  tipo: string;
  total_registros: number;
  total_monto: number;
  estado: string;
  nombre_archivo: string;
  fecha_generacion: string;
}

export interface ProximoNumeroListaResponse {
  nro_lista_propuesto: number;
  disponible: boolean;
}

export interface ValidarNumeroListaResponse {
  nro_lista: number;
  disponible: boolean;
  mensaje: string;
}
