import type { Columna, Reporte, Valor } from './reportes';

export type PersonaInactivaSQL = Record<string, Valor>;

const columnas: Columna[] = [
  { key: 'Id', titulo: 'ID persona', tipo: 'numero' },
  { key: 'NroSocio', titulo: 'N° socio', tipo: 'numero' },
  { key: 'Apellido', titulo: 'Apellido' },
  { key: 'Nombre', titulo: 'Nombre' },
  { key: 'NumeroDoc', titulo: 'Documento' },
  { key: 'Cuil', titulo: 'CUIL' },
  { key: 'EstadoNombre', titulo: 'Estado persona' },
  { key: 'FechaAlta', titulo: 'Fecha de alta', tipo: 'fecha-hora' },
  { key: 'FechaBaja', titulo: 'Fecha de baja', tipo: 'fecha-hora' },
  { key: 'Mail', titulo: 'Email' },
  { key: 'Calle', titulo: 'Calle' },
  { key: 'NumeroCalle', titulo: 'Número de calle' },
  { key: 'Piso', titulo: 'Piso' },
  { key: 'Dpto', titulo: 'Departamento' },
  { key: 'CP', titulo: 'Código postal' },
  { key: 'ProvinciaId', titulo: 'ID provincia', tipo: 'numero' },
  { key: 'LocalidadId', titulo: 'ID localidad', tipo: 'numero' },
  { key: 'Observaciones', titulo: 'Observaciones' },
  { key: 'FechaNac', titulo: 'Fecha de nacimiento', tipo: 'fecha-hora' },
  { key: 'FechaAsociado', titulo: 'Fecha de asociación', tipo: 'fecha-hora' },
  { key: 'FechaServicio', titulo: 'Fecha de servicio', tipo: 'fecha-hora' },
  { key: 'FechaServicioAsistodo', titulo: 'Fecha de servicio Asistodo', tipo: 'fecha-hora' },
  { key: 'Estado', titulo: 'Código de estado', tipo: 'numero' },
  { key: 'TipoDoc', titulo: 'Tipo de documento', tipo: 'numero' },
  { key: 'NroEnte', titulo: 'N° ente' },
  { key: 'Tipo', titulo: 'Código de tipo', tipo: 'numero' },
  { key: 'Razon', titulo: 'Código de razón', tipo: 'numero' },
  { key: 'Sexo', titulo: 'Código de sexo', tipo: 'numero' },
  { key: 'Remuneracion', titulo: 'Remuneración (ARS)', tipo: 'pesos' },
  { key: 'CapitalSocial', titulo: 'Capital social (ARS)', tipo: 'pesos' },
  { key: 'PlanId_CuotaSocial', titulo: 'ID plan Cuota Social', tipo: 'numero' },
  { key: 'PlanId_ServEsp', titulo: 'ID plan Servicios', tipo: 'numero' },
  { key: 'PlanId_Asistodo', titulo: 'ID plan Asistodo', tipo: 'numero' },
  { key: 'UsuarioAlta', titulo: 'ID usuario de alta', tipo: 'numero' },
  { key: 'UsuarioModif', titulo: 'ID usuario de modificación', tipo: 'numero' },
  { key: 'TipoCuit', titulo: 'Tipo de CUIT', tipo: 'numero' },
  { key: 'Organismo', titulo: 'ID organismo', tipo: 'numero' },
  { key: 'TipoJub', titulo: 'Tipo de jubilación', tipo: 'numero' },
];

/** Construye el reporte completo conservando el orden devuelto por SQL. */
export function construirReportePersonasInactivas(personas: PersonaInactivaSQL[], busqueda: string): Reporte {
  const buscar = busqueda.trim().toLocaleLowerCase('es');
  const filas = personas.filter(p => !buscar || [p.Id, p.NroSocio, p.Apellido, p.Nombre, p.NumeroDoc, p.Cuil, p.Mail]
    .some(valor => String(valor ?? '').toLocaleLowerCase('es').includes(buscar)));
  // Conserva también cualquier campo agregado a Personas después del esquema documentado.
  const conocidas = new Set(columnas.map(c => c.key));
  const adicionales = [...new Set(personas.flatMap(p => Object.keys(p)))].filter(key => !conocidas.has(key));
  return {
    titulo: 'Personas no activas',
    columnas: [...columnas, ...adicionales.map(key => ({ key, titulo: key }))],
    filas,
    resumen: [{ titulo: 'Personas no activas', valor: filas.length }],
    notas: [
      'Fuente: dbo.Personas y dbo.TipoEstados de la base SQL CoopYa configurada. Consulta actual, sin límite de cantidad ni filtro de período.',
      'Incluye los estados Inactivo y No Activo del catálogo. Las personas sin estado no se consideran inactivas.',
      'Orden: fecha de alta descendente y, en caso de empate, ID descendente. Las altas sin fecha quedan al final; no representa la fecha de cambio a inactivo.',
      'Las fechas y horas conservan el valor registrado en SQL, sin conversión de zona horaria. Los códigos de catálogo se muestran con sus ID originales.',
      'Excel incluye todas las personas del resultado y todos los campos de Personas, sin limitarse a la página visible. Remuneración y capital social están expresados en pesos.',
    ],
    advertencias: [],
  };
}
