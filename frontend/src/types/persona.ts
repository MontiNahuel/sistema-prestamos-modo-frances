export interface MedioPago {
  id: number;
  tipo: number;
  valor: string;
  predeterminado: boolean;
  banco: string | null;
}

export interface Persona {
  idPersona: number;
  numeroDoc: string;
  cuil: string;
  apellido: string;
  nombre: string;
  estadoNombre: string;
  nroSocio: number;
  calle: string;
  localidadId: number;
  mediosDePago: MedioPago[];
}

export interface ConceptoCuentaCorriente {
  concepto: string;
  etiqueta: string;
  planNombre: string;
  valorMensual: number;
  cuotasDelPlan?: number;
  cuotasCubiertas?: number;
  cuotasVencidas?: number;
  deudaDelConcepto?: number;
  coberturaDelConcepto?: number;
}

export interface PeriodoCuentaCorriente {
  mes: string;
  esperado: number;
  cubierto: number;
  cobrados: number;
  pendientes: number;
  esParcial: boolean;
}

export interface MovimientoCuentaCorriente {
  id: string | number;
  fechaImpacto: string;
  origen?: string;
  concepto: string;
  montoPesos: number;
  estado: string;
  explicacion?: string;
}

export interface DesgloseCuentaCorriente {
  numeroCuota?: number;
  cantidadCuotas?: number;
  periodoObligacion?: string;
  concepto: string;
  planNombre?: string;
  importePresentado: number;
  importeCobrado: number;
  importePendiente: number;
  estado: string;
  origen?: string;
}

export interface CuentaCorrienteResumen {
  persona: {
    id: number;
    apellido: string;
    nombre: string;
    numeroDoc: string;
    cuil?: string;
    nroSocio?: number;
  };
  totales: {
    saldo: number;
    algunaConMora: boolean;
    obligacionMensual: number;
    totalObligaciones?: number;
    importeCobrado?: number;
    importePendiente?: number;
    cobrados?: number;
    pendientes?: number;
    movimientos?: number;
  };
  conceptos?: ConceptoCuentaCorriente[];
  periodos?: PeriodoCuentaCorriente[];
  movimientos?: MovimientoCuentaCorriente[];
  desglose?: DesgloseCuentaCorriente[];
  advertencias?: string[];
}

export interface PersonaBusquedaParams {
  nombreApellido?: string;
  documento?: string;
  idPersona?: number | null;
}


export interface Banco {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface PersonaCreatePayload {
  documento: string;
  nombre: string;
  apellido: string;
  cuil?: string;
  email?: string;
  telefono?: string;
  domicilio?: string;
  cbu?: string;
  alias_cbu?: string;
  banco_id?: number | null;
  banco_nombre?: string;
}

export interface PersonaCreateResponse {
  success: boolean;
  documento: string;
  nombre_completo: string;
  oracle_id?: string | number | null;
  coopya_id?: string | number | null;
  cbu?: string | null;
  alias_cbu?: string | null;
  banco_id?: number | null;
  banco_nombre?: string | null;
  medio_de_pago_id?: number | null;
  oracle_ok: boolean;
  coopya_ok: boolean;
  mensaje: string;
}
