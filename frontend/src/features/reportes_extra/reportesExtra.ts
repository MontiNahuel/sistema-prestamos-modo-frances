import type { TablaReporte } from '../reportes/reportes';

export type TipoReporteExtra = 'catalinas-cobros';

export interface DefinicionReporteExtra {
  id: TipoReporteExtra;
  titulo: string;
  descripcion: string;
  origen: string;
}

export const TIPOS_REPORTE_EXTRA: DefinicionReporteExtra[] = [
  {
    id: 'catalinas-cobros',
    titulo: 'Control Cobros Catalinas (Prestador 68)',
    descripcion:
      'Cruza cobros de Canal 12 (prestaprod) contra préstamos y cuotas de Prestador 68, incluyendo meses sin lote cargado.',
    origen: 'Oracle DB (prestaprod)',
  },
];

export type VerSinLote = 'S' | 'N';
export type UsarTolerancia = 'S' | 'N';

export interface FiltrosCatalinasForm {
  periodoDesde: string;
  periodoHasta: string;
  dnis: string;
  usarTolerancia: UsarTolerancia;
  toleranciaPctPorcentaje: string;
  verSinLote: VerSinLote;
}

export interface ReporteExtraCatalinasRequestPayload {
  periodo_desde: string;
  periodo_hasta: string | null;
  dnis: string | null;
  tolerancia_pct: number;
  ver_sin_lote: VerSinLote;
}

export interface CatalinasCobroItem {
  periodo_haber: string;
  dni: string;
  nombre_persona: string | null;
  estado: string;
  importe_cobro: number;
  idcobro: number | null;
  fecha_cobro: string | null;
  idprestamo: number | null;
}

export interface ReporteExtraCatalinasResumen {
  total_filas: number;
  cobrados: number;
  no_cobrados: number;
  sin_lote: number;
  importe_total: number;
  importe_cobrados: number;
  importe_no_cobrados: number;
  importe_sin_lote: number;
}

export interface ReporteExtraCatalinasResponse {
  parametros: ReporteExtraCatalinasRequestPayload;
  resumen: ReporteExtraCatalinasResumen;
  filas: CatalinasCobroItem[];
}

const PERIODO_AAAAMM_RE = /^(19|20)\d{2}(0[1-9]|1[0-2])$/;
const DNI_TOKEN_RE = /^\d{6,10}$/;

export const FILTROS_CATALINAS_INICIALES: FiltrosCatalinasForm = {
  periodoDesde: '2026-05',
  periodoHasta: '',
  dnis: '',
  usarTolerancia: 'N',
  toleranciaPctPorcentaje: '5',
  verSinLote: 'S',
};

/** Convierte entradas "YYYY-MM" o "YYYYMM" al formato Oracle "AAAAMM". */
export function normalizarPeriodoAAAAMM(valor: string): string | null {
  const compacto = valor.trim().replace(/-/g, '');
  if (!compacto) return null;
  if (!PERIODO_AAAAMM_RE.test(compacto)) return null;
  return compacto;
}

/** Valida y normaliza una lista de DNIs separados por coma, espacio o salto de linea. */
export function normalizarListaDnis(valor: string): { dnis: string | null; error?: string } {
  const limpio = valor.trim();
  if (!limpio) return { dnis: null };
  const tokens = limpio
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { dnis: null };
  for (const token of tokens) {
    if (!DNI_TOKEN_RE.test(token)) {
      return {
        dnis: null,
        error: `DNI inválido "${token}". Ingrese DNIs numéricos de 6 a 10 dígitos separados por coma.`,
      };
    }
  }
  const normalizado = tokens.join(',');
  if (normalizado.length > 4000) {
    return {
      dnis: null,
      error: 'La lista de DNIs excede el máximo de 4000 caracteres soportado por la consulta.',
    };
  }
  return { dnis: normalizado };
}

/** Valida el formulario de filtros y construye el payload exacto para el backend Oracle. */
export function construirPayloadCatalinas(
  filtros: FiltrosCatalinasForm
): { payload?: ReporteExtraCatalinasRequestPayload; error?: string } {
  const periodoDesde = normalizarPeriodoAAAAMM(filtros.periodoDesde);
  if (!periodoDesde) {
    return { error: 'Debe indicar un Período desde válido (formato AAAAMM o AAAA-MM).' };
  }

  let periodoHasta: string | null = null;
  if (filtros.periodoHasta.trim()) {
    periodoHasta = normalizarPeriodoAAAAMM(filtros.periodoHasta);
    if (!periodoHasta) {
      return { error: 'El Período hasta debe tener formato válido (AAAAMM o AAAA-MM).' };
    }
    if (periodoHasta < periodoDesde) {
      return { error: 'El Período hasta no puede ser anterior al Período desde.' };
    }
  }

  const resultadoDnis = normalizarListaDnis(filtros.dnis);
  if (resultadoDnis.error) {
    return { error: resultadoDnis.error };
  }

  let toleranciaPct = 0;
  if (filtros.usarTolerancia === 'S') {
    const toleranciaNum = Number(filtros.toleranciaPctPorcentaje.replace(',', '.'));
    if (!Number.isFinite(toleranciaNum) || toleranciaNum < 0 || toleranciaNum > 100) {
      return { error: 'La tolerancia debe ser un porcentaje entre 0 y 100 (por defecto 5%).' };
    }
    toleranciaPct = Number((toleranciaNum / 100).toFixed(4));
  }

  return {
    payload: {
      periodo_desde: periodoDesde,
      periodo_hasta: periodoHasta,
      dnis: resultadoDnis.dnis,
      tolerancia_pct: toleranciaPct,
      ver_sin_lote: filtros.verSinLote,
    },
  };
}

export interface EstadoCatalinasDescompuesto {
  estadoBase: string;
  detalleError: string | null;
  suposicion: string | null;
}

/** Clasifica el texto de estado devuelto por Oracle para mostrar estilos semanticos. */
export function clasificarEstadoCatalinas(estado: string): 'ok' | 'pendiente' | 'vencida' {
  if (estado.startsWith('YA SE COBRO')) return 'ok';
  if (estado.startsWith('SIN LOTE CARGADO')) return 'pendiente';
  return 'vencida';
}

/** Devuelve la clase CSS de badge pastel definida en reportes.css segun el estado. */
export function claseBadgeEstadoCatalinas(estado: string): string {
  const clase = clasificarEstadoCatalinas(estado);
  if (clase === 'ok') return 'reportes-estado reportes-estado-pagada';
  if (clase === 'pendiente') return 'reportes-estado reportes-estado-pendiente';
  return 'reportes-estado reportes-estado-vencida';
}

/** Separa el estado principal, el error/detalle y la suposicion de posible prestamo Catalinas. */
export function descomponerEstadoCatalinas(estado: string): EstadoCatalinasDescompuesto {
  const texto = estado.trim();
  const matchParentesis = /^([^(]+?)\s*\((.*)\)$/.exec(texto);
  if (!matchParentesis) {
    return {
      estadoBase: texto || '-',
      detalleError: null,
      suposicion: null,
    };
  }

  const estadoBase = matchParentesis[1].trim();
  const contenido = matchParentesis[2].trim();
  const matchErrorMenosUno = /^(Error\s*-1)\s*:\s*(.+)$/i.exec(contenido);
  if (matchErrorMenosUno) {
    const rawSuposicion = matchErrorMenosUno[2].trim().replace(/\s*->\s*/g, ' → ');
    const suposicion =
      rawSuposicion.length > 0
        ? rawSuposicion.charAt(0).toUpperCase() + rawSuposicion.slice(1)
        : null;
    return {
      estadoBase,
      detalleError: matchErrorMenosUno[1].trim(),
      suposicion,
    };
  }

  return {
    estadoBase,
    detalleError: contenido || null,
    suposicion: null,
  };
}

/** Arma una TablaReporte compatible con agregarTablaExcel para exportar en ExcelJS. */
export function construirTablaExcelCatalinas(
  respuesta: ReporteExtraCatalinasResponse
): TablaReporte {
  return {
    titulo: 'Control Catalinas Oracle',
    columnas: [
      { key: 'periodo_haber', titulo: 'Período haber' },
      { key: 'dni', titulo: 'DNI' },
      { key: 'nombre_persona', titulo: 'Persona' },
      { key: 'estado', titulo: 'Estado' },
      { key: 'detalle_error', titulo: 'Error / Detalle' },
      { key: 'suposicion', titulo: 'Suposición' },
      { key: 'importe_cobro', titulo: 'Importe cobro', tipo: 'dinero' },
      { key: 'idcobro', titulo: 'ID cobro', tipo: 'numero' },
      { key: 'fecha_cobro', titulo: 'Fecha cobro', tipo: 'fecha' },
      { key: 'idprestamo', titulo: 'ID préstamo', tipo: 'numero' },
    ],
    filas: respuesta.filas.map((fila) => {
      const partes = descomponerEstadoCatalinas(fila.estado);
      return {
        periodo_haber: fila.periodo_haber,
        dni: fila.dni,
        nombre_persona: fila.nombre_persona,
        estado: partes.estadoBase,
        detalle_error: partes.detalleError,
        suposicion: partes.suposicion,
        importe_cobro: Math.round(fila.importe_cobro * 100),
        idcobro: fila.idcobro,
        fecha_cobro: fila.fecha_cobro,
        idprestamo: fila.idprestamo,
      };
    }),
  };
}
