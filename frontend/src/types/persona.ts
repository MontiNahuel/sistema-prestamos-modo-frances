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

export interface CuentaCorrienteResumen {
  persona: {
    id: number;
    apellido: string;
    nombre: string;
    numeroDoc: string;
  };
  totales: {
    saldo: number;
    algunaConMora: boolean;
    obligacionMensual: number;
  };
}

export interface PersonaBusquedaParams {
  nombreApellido?: string;
  documento?: string;
  idPersona?: number | null;
}
