import type { CuotaSocialReporteItem } from '../../types/cuotaSocial';
import type { CuotaPrestamo, Prestamo } from '../../types/prestamo';

export type TipoReporte = 'caida' | 'ultimo-pago' | 'otorgados' | 'cobranzas' | 'condiciones' | 'padron' | 'personas-inactivas' | 'revisar-cobrados';
export type FiltroCuotaCaida = 'todas' | 'primera' | 'ultima' | 'especifica';
export type ConceptoCaida = 'PRESTAMO' | 'CUOTA_SOCIAL' | 'PRESTAMO_Y_CUOTA_SOCIAL';
export const CONCEPTOS_CAIDA: { value: ConceptoCaida; label: string }[] = [
  { value: 'PRESTAMO', label: 'Préstamo' },
  { value: 'CUOTA_SOCIAL', label: 'Cuota Social' },
  { value: 'PRESTAMO_Y_CUOTA_SOCIAL', label: 'Préstamo y Cuota Social' },
];
export type Valor = string | number | null;
export interface Columna { key: string; titulo: string; tipo?: 'dinero' | 'pesos' | 'fecha' | 'fecha-hora' | 'porcentaje' | 'numero' }
export interface FiltrosReporte {
  tipo: TipoReporte;
  desde: string;
  hasta: string;
  buscar: string;
  numeroPrestamo: string;
  estadoPrestamo: string;
  estadoCuota: string;
  conceptoCaida?: ConceptoCaida;
  filtroCuota?: FiltroCuotaCaida;
  numeroCuota?: string;
  plazo?: string;
  todoPeriodo?: boolean;
}
export interface TablaReporte { titulo: string; columnas: Columna[]; filas: Record<string, Valor>[] }
export interface Reporte {
  titulo: string;
  columnas: Columna[];
  filas: Record<string, Valor>[];
  resumen: { titulo: string; valor: number; dinero?: boolean }[];
  notas: string[];
  advertencias: string[];
  anexos?: TablaReporte[];
}

export const TIPOS_REPORTE: { id: TipoReporte; titulo: string; descripcion: string }[] = [
  { id: 'padron', titulo: 'Padrón socios cooperativa', descripcion: 'Personas registradas en el padrón de May.' },
  { id: 'caida', titulo: 'Caída de cuotas', descripcion: 'Vencimientos y cuotas a cobrar en el período.' },
  { id: 'ultimo-pago', titulo: 'Fecha del último pago', descripcion: 'Última cobranza de cada préstamo y pendientes actuales.' },
  { id: 'otorgados', titulo: 'Préstamos otorgados', descripcion: 'Historial, saldos, legajos y gestión de cuotas.' },
  { id: 'cobranzas', titulo: 'Cobranzas aplicadas', descripcion: 'Pagos registrados y su imputación a las cuotas.' },
  { id: 'condiciones', titulo: 'Condiciones del préstamo', descripcion: 'Capital, tasas, cuotas, intereses, IVA y costo financiero.' },
  { id: 'personas-inactivas', titulo: 'Personas no activas', descripcion: 'Personas inactivas en SQL, con las altas más recientes primero.' },
  { id: 'revisar-cobrados', titulo: 'Revisar cobrados', descripcion: 'Cobros confirmados de la base vieja Oracle, por lista bancaria.' },
];

const identificacion: Columna[] = [
  { key: 'asociado', titulo: 'Asociado' }, { key: 'documento', titulo: 'Documento' },
  { key: 'personaId', titulo: 'ID asociado', tipo: 'numero' }, { key: 'numeroPrestamo', titulo: 'N° préstamo', tipo: 'numero' },
];
const dinero = (key: string, titulo: string): Columna => ({ key, titulo, tipo: 'dinero' });
const fecha = (key: string, titulo: string): Columna => ({ key, titulo, tipo: 'fecha' });
const numero = (key: string, titulo: string): Columna => ({ key, titulo, tipo: 'numero' });

/** SQL Server serializa los datetime UTC sin sufijo. Los días contractuales no se desplazan. */
export function fechaArgentina(valor: string | null | undefined): string {
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const utc = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor) ? valor : `${valor}Z`;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (key: string) => parts.find(p => p.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function hoyArgentina(): string { return fechaArgentina(new Date().toISOString()); }
const completo = (c: CuotaPrestamo) => c.estado === 'PAGADA' && c.monto_pagado_centavos === c.cuota_total_centavos;
const instante = (valor: string) => Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor) ? valor : `${valor}Z`);
export function estadoCuota(c: CuotaPrestamo, hoy: string): string {
  if (c.estado === 'PAGADA') return 'PAGADA';
  if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) return 'VENCIDA';
  return c.estado === 'VENCIDA' ? 'VENCIDA' : 'PENDIENTE';
}

export function estadoCuotaSocial(c: CuotaSocialReporteItem, hoy: string): string {
  if (c.estado === 'ANULADA') return 'ANULADA';
  if (c.estado === 'PAGADA') return 'PAGADA';
  if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) return 'VENCIDA';
  return 'PENDIENTE';
}

function identidad(p: Prestamo): Record<string, Valor> {
  return { asociado: p.persona_nombre || `Asociado #${p.persona_id}`, documento: p.persona_doc || null, personaId: p.persona_id, numeroPrestamo: p.numero_prestamo, prestamo: p.id };
}

export function construirReporte(
  prestamos: Prestamo[],
  f: FiltrosReporte,
  hoy = hoyArgentina(),
  cuotasSociales: CuotaSocialReporteItem[] = []
): Reporte {
  const todoPeriodo = f.tipo === 'otorgados' && f.todoPeriodo === true;
  if (!todoPeriodo && (!f.desde || !f.hasta || f.desde > f.hasta)) throw new Error('Seleccioná un período válido: Desde no puede ser posterior a Hasta.');
  const enPeriodo = (fechaValor: string | null | undefined) => {
    const dia = fechaArgentina(fechaValor);
    return Boolean(dia && dia >= f.desde && dia <= f.hasta);
  };
  const buscar = f.buscar.trim().toLocaleLowerCase('es');
  const numeroPrestamo = f.numeroPrestamo.trim();
  const cartera = prestamos.filter(p => (!f.estadoPrestamo || p.estado === f.estadoPrestamo)
    && (!numeroPrestamo || String(p.numero_prestamo) === numeroPrestamo)
    && (!buscar || [p.persona_nombre, p.persona_doc, p.id, String(p.persona_id)].some(v => v?.toLocaleLowerCase('es').includes(buscar))));
  const filas: Reporte['filas'] = [];
  const advertencias: string[] = [];
  let columnas: Columna[];
  let resumen: Reporte['resumen'];
  let anexos: TablaReporte[] | undefined;
  const notas: string[] = ['Importes en pesos argentinos (ARS). Estados y saldos pendientes corresponden a la fecha de consulta; no son un cierre histórico.'];
  const suma = (key: string) => filas.reduce((total, r) => total + (typeof r[key] === 'number' ? r[key] as number : 0), 0);

  if (f.tipo === 'caida') {
    const concepto: ConceptoCaida = f.conceptoCaida ?? 'PRESTAMO';
    const incluyePrestamo = concepto !== 'CUOTA_SOCIAL';
    const incluyeCuotaSocial = concepto !== 'PRESTAMO';
    const filtroCuota = f.filtroCuota ?? 'todas';
    const numeroCuotaObjetivo =
      incluyePrestamo && filtroCuota === 'especifica' ? Number(f.numeroCuota) : null;
    if (
      incluyePrestamo &&
      filtroCuota === 'especifica' &&
      (!Number.isInteger(numeroCuotaObjetivo) || (numeroCuotaObjetivo ?? 0) < 1)
    ) {
      throw new Error('Ingresá un número de cuota válido (1 o mayor).');
    }

    if (incluyePrestamo) {
      const sinFecha = cartera.reduce((sum, p) => sum + (p.cuotas ?? []).filter(c => !c.fecha_vencimiento).length, 0);
      if (sinFecha) advertencias.push(`Hay ${sinFecha} cuotas sin fecha de vencimiento en la cartera consultada. No se pueden asignar a un período y no están incluidas en estos totales.`);
    }
    if (incluyeCuotaSocial && f.hasta.slice(0, 7) > hoy.slice(0, 7)) {
      advertencias.push('El período consultado incluye fechas futuras. Las cuotas sociales no se proyectan a futuro por ser de duración indeterminada; solo se muestran períodos reales ya generados.');
    }

    const filtrarCuotasSociales = () => {
      const excluyePorFiltroPrestamo = concepto === 'PRESTAMO_Y_CUOTA_SOCIAL' && (Boolean(f.estadoPrestamo) || filtroCuota !== 'todas');
      if (excluyePorFiltroPrestamo) return [];
      const salida: CuotaSocialReporteItem[] = [];
      for (const cs of cuotasSociales) {
        if (cs.estado === 'ANULADA') continue;
        if (numeroPrestamo && String(cs.numero_prestamo ?? '') !== numeroPrestamo) continue;
        if (buscar && ![cs.persona_nombre, cs.persona_doc, cs.prestamo_id, String(cs.socio_id), cs.periodo].some(v => v?.toLocaleLowerCase('es').includes(buscar))) continue;
        const estado = estadoCuotaSocial(cs, hoy);
        if (!enPeriodo(cs.fecha_vencimiento) || (f.estadoCuota && estado !== f.estadoCuota)) continue;
        salida.push(cs);
      }
      return salida;
    };

    if (concepto === 'PRESTAMO') {
      columnas = [...identificacion, numero('cuota', 'Cuota'), fecha('vencimiento', 'Vencimiento'), dinero('importe', 'Importe cuota'), dinero('capital', 'Capital'), dinero('interes', 'Intereses'), dinero('iva', 'IVA'), dinero('pendiente', 'A cobrar pendiente'), { key: 'estado', titulo: 'Estado cuota' }, { key: 'estadoPrestamo', titulo: 'Estado préstamo' }];
      for (const p of cartera) {
        const cuotasPrestamo = p.cuotas ?? [];
        const maxCuota = cuotasPrestamo.reduce((max, item) => Math.max(max, item.numero_cuota), 0);
        const ultimaCuota = Math.max(p.plazo_meses || 0, maxCuota);
        for (const c of cuotasPrestamo) {
          if (filtroCuota === 'primera' && c.numero_cuota !== 1) continue;
          if (filtroCuota === 'ultima' && c.numero_cuota !== ultimaCuota) continue;
          if (filtroCuota === 'especifica' && c.numero_cuota !== numeroCuotaObjetivo) continue;
          const estado = estadoCuota(c, hoy);
          if (!enPeriodo(c.fecha_vencimiento) || (f.estadoCuota && estado !== f.estadoCuota)) continue;
          filas.push({ ...identidad(p), cuota: c.numero_cuota, vencimiento: c.fecha_vencimiento, importe: c.cuota_total_centavos, capital: c.capital_centavos, interes: c.interes_centavos, iva: c.iva_interes_centavos,
            pendiente: p.estado === 'CANCELADO' || estado === 'PAGADA' ? 0 : Math.max(0, c.cuota_total_centavos - c.monto_pagado_centavos), estado, estadoPrestamo: p.estado });
        }
      }
      filas.sort((a, b) => String(a.vencimiento).localeCompare(String(b.vencimiento)) || String(a.prestamo).localeCompare(String(b.prestamo)) || Number(a.cuota) - Number(b.cuota));
      resumen = [{ titulo: 'Cuotas con vencimiento', valor: filas.length }, { titulo: 'Importe total de cuotas', valor: suma('importe'), dinero: true }, { titulo: 'Pendiente a cobrar', valor: suma('pendiente'), dinero: true }];
    } else if (concepto === 'CUOTA_SOCIAL') {
      columnas = [
        { key: 'asociado', titulo: 'Asociado' },
        { key: 'documento', titulo: 'Documento' },
        numero('personaId', 'ID asociado'),
        { key: 'concepto', titulo: 'Concepto' },
        { key: 'periodo', titulo: 'Período' },
        fecha('vencimiento', 'Vencimiento'),
        dinero('importe', 'Importe cuota'),
        dinero('cobrado', 'Cobrado'),
        dinero('pendiente', 'A cobrar pendiente'),
        { key: 'estado', titulo: 'Estado cuota' },
        { key: 'estadoSuscripcion', titulo: 'Suscripción' },
      ];
      const socialesFiltradas = filtrarCuotasSociales();
      for (const cs of socialesFiltradas) {
        const estado = estadoCuotaSocial(cs, hoy);
        const pendiente = estado === 'PAGADA' ? 0 : Math.max(0, cs.valor_centavos - cs.monto_pagado_centavos);
        filas.push({
          cuotaSocialId: cs.id,
          asociado: cs.persona_nombre || `Asociado #${cs.socio_id}`,
          documento: cs.persona_doc || null,
          personaId: cs.socio_id,
          concepto: 'Cuota Social',
          periodo: cs.periodo,
          vencimiento: cs.fecha_vencimiento,
          importe: cs.valor_centavos,
          cobrado: cs.monto_pagado_centavos,
          pendiente,
          estado,
          estadoSuscripcion: cs.cuota_social_activa ? 'Activa' : 'De baja',
        });
      }
      filas.sort((a, b) => String(a.vencimiento).localeCompare(String(b.vencimiento)) || String(a.asociado).localeCompare(String(b.asociado)));
      const sociosUnicos = new Set(filas.map(r => r.personaId)).size;
      resumen = [
        { titulo: 'Cuotas sociales en período', valor: filas.length },
        { titulo: 'Importe total de cuotas', valor: suma('importe'), dinero: true },
        { titulo: 'Pendiente a cobrar', valor: suma('pendiente'), dinero: true },
        { titulo: 'Socios distintos', valor: sociosUnicos },
      ];
    } else {
      columnas = [
        { key: 'concepto', titulo: 'Concepto' },
        { key: 'asociado', titulo: 'Asociado' },
        { key: 'documento', titulo: 'Documento' },
        numero('personaId', 'ID asociado'),
        numero('numeroPrestamo', 'N° préstamo'),
        { key: 'referenciaCuota', titulo: 'Cuota / Período' },
        fecha('vencimiento', 'Vencimiento'),
        dinero('importe', 'Importe cuota'),
        dinero('capital', 'Capital'),
        dinero('interes', 'Intereses'),
        dinero('iva', 'IVA'),
        dinero('pendiente', 'A cobrar pendiente'),
        { key: 'estado', titulo: 'Estado cuota' },
        { key: 'estadoPrestamo', titulo: 'Estado préstamo / Suscripción' },
      ];
      for (const p of cartera) {
        const cuotasPrestamo = p.cuotas ?? [];
        const maxCuota = cuotasPrestamo.reduce((max, item) => Math.max(max, item.numero_cuota), 0);
        const ultimaCuota = Math.max(p.plazo_meses || 0, maxCuota);
        for (const c of cuotasPrestamo) {
          if (filtroCuota === 'primera' && c.numero_cuota !== 1) continue;
          if (filtroCuota === 'ultima' && c.numero_cuota !== ultimaCuota) continue;
          if (filtroCuota === 'especifica' && c.numero_cuota !== numeroCuotaObjetivo) continue;
          const estado = estadoCuota(c, hoy);
          if (!enPeriodo(c.fecha_vencimiento) || (f.estadoCuota && estado !== f.estadoCuota)) continue;
          filas.push({
            ...identidad(p),
            concepto: 'Préstamo',
            cuota: c.numero_cuota,
            referenciaCuota: `Cuota ${c.numero_cuota}/${p.plazo_meses || maxCuota || c.numero_cuota}`,
            vencimiento: c.fecha_vencimiento,
            importe: c.cuota_total_centavos,
            capital: c.capital_centavos,
            interes: c.interes_centavos,
            iva: c.iva_interes_centavos,
            pendiente: p.estado === 'CANCELADO' || estado === 'PAGADA' ? 0 : Math.max(0, c.cuota_total_centavos - c.monto_pagado_centavos),
            estado,
            estadoPrestamo: p.estado,
          });
        }
      }
      const socialesFiltradas = filtrarCuotasSociales();
      for (const cs of socialesFiltradas) {
        const estado = estadoCuotaSocial(cs, hoy);
        const pendiente = estado === 'PAGADA' ? 0 : Math.max(0, cs.valor_centavos - cs.monto_pagado_centavos);
        filas.push({
          cuotaSocialId: cs.id,
          concepto: 'Cuota Social',
          asociado: cs.persona_nombre || `Asociado #${cs.socio_id}`,
          documento: cs.persona_doc || null,
          personaId: cs.socio_id,
          numeroPrestamo: cs.numero_prestamo ?? null,
          referenciaCuota: cs.periodo,
          vencimiento: cs.fecha_vencimiento,
          importe: cs.valor_centavos,
          capital: null,
          interes: null,
          iva: null,
          pendiente,
          estado,
          estadoPrestamo: cs.cuota_social_activa ? 'Suscripción activa' : 'Suscripción de baja',
        });
      }
      filas.sort((a, b) =>
        String(a.vencimiento).localeCompare(String(b.vencimiento))
        || String(a.asociado).localeCompare(String(b.asociado))
        || String(a.concepto).localeCompare(String(b.concepto))
        || String(a.referenciaCuota ?? '').localeCompare(String(b.referenciaCuota ?? ''))
      );
      const totalCuotaSocial = filas
        .filter(r => r.concepto === 'Cuota Social')
        .reduce((total, r) => total + (typeof r.importe === 'number' ? (r.importe as number) : 0), 0);
      resumen = [
        { titulo: 'Cuotas con vencimiento', valor: filas.length },
        { titulo: 'Importe total de cuotas', valor: suma('importe'), dinero: true },
        { titulo: 'Pendiente a cobrar', valor: suma('pendiente'), dinero: true },
        { titulo: 'Total Cuota Social', valor: totalCuotaSocial, dinero: true },
      ];
      if (f.estadoPrestamo || filtroCuota !== 'todas') {
        notas.push('Los filtros de Estado del préstamo y N° de cuota aplican únicamente a cuotas de préstamos.');
      }
    }

    if (incluyePrestamo) {
      if (filtroCuota === 'primera') notas.push('Filtro de cuota aplicado: únicamente la primera cuota (cuota N° 1) de cada préstamo.');
      else if (filtroCuota === 'ultima') notas.push('Filtro de cuota aplicado: únicamente la última cuota del plan de cada préstamo.');
      else if (filtroCuota === 'especifica') notas.push(`Filtro de cuota aplicado: únicamente la cuota N° ${numeroCuotaObjetivo} de cada préstamo.`);
      notas.push('Préstamos: el total nominal incluye cuotas pagadas. Pendiente a cobrar descuenta pagos registrados y excluye préstamos cancelados. Las cuotas sin vencimiento no pueden asignarse a un período.');
    }
    if (incluyeCuotaSocial) {
      notas.push('Cuota Social: incluye únicamente períodos reales registrados hasta la fecha; no proyecta meses futuros al tratarse de una suscripción indeterminada sujeta a bajas.');
    }
  } else if (f.tipo === 'ultimo-pago') {
    columnas = [...identificacion, fecha('ultimoPago', 'Último pago registrado'), dinero('importe', 'Importe último pago'), dinero('saldo', 'Capital pendiente actual'), numero('pendientes', 'Cuotas pendientes actuales'), numero('vencidas', 'Cuotas vencidas actuales'), { key: 'estado', titulo: 'Estado préstamo' }];
    for (const p of cartera) {
      const cuotas = p.cuotas ?? [];
      const pagos = cuotas.filter(c => c.fecha_pago && c.monto_pagado_centavos > 0).sort((a, b) => instante(a.fecha_pago!) - instante(b.fecha_pago!));
      const ultimo = pagos.at(-1);
      // Sin pagos se muestra siempre, para que la cartera sin cobranzas no desaparezca.
      if (ultimo && !enPeriodo(ultimo.fecha_pago)) continue;
      const registro = ultimo ? pagos.filter(c => instante(c.fecha_pago!) === instante(ultimo.fecha_pago!)) : [];
      filas.push({ ...identidad(p), ultimoPago: ultimo ? fechaArgentina(ultimo.fecha_pago) : null,
        importe: ultimo && registro.every(completo) ? registro.reduce((sum, c) => sum + c.monto_pagado_centavos, 0) : null,
        saldo: p.saldo_deudor_actual_centavos,
        pendientes: cuotas.filter(c => c.estado !== 'PAGADA').length,
        vencidas: cuotas.some(c => c.estado !== 'PAGADA' && c.estado !== 'VENCIDA' && !c.fecha_vencimiento) ? null : cuotas.filter(c => estadoCuota(c, hoy) === 'VENCIDA').length, estado: p.estado });
    }
    resumen = [{ titulo: 'Préstamos consultados', valor: filas.length }, { titulo: 'Sin pagos registrados', valor: filas.filter(r => !r.ultimoPago).length }, { titulo: 'Capital pendiente actual', valor: suma('saldo'), dinero: true }];
    notas.push('El período filtra la fecha del último pago de cada préstamo. También se incluyen los préstamos sin pagos. Importe: cuotas pagadas con la misma fecha y hora del último registro; un acumulado parcial no permite conocer el importe del último movimiento.');
    notas.push('Las cuotas pendientes incluyen las vencidas. Un préstamo con estado Cancelado no acredita por sí solo una cobranza ni una cancelación financiera del saldo.');
    if (filas.some(r => r.vencidas === null)) advertencias.push('Hay cuotas pendientes sin vencimiento: no se puede determinar la cantidad total de vencidas de esos préstamos. Se informa No disponible.');
  } else if (f.tipo === 'otorgados') {
    columnas = [fecha('otorgamiento', 'Otorgamiento'), ...identificacion, dinero('capital', 'Capital otorgado'), { key: 'tasa', titulo: 'Tasa anual aplicada', tipo: 'porcentaje' }, numero('plazo', 'Plazo (meses)'), dinero('primeraCuota', 'Primera cuota mensual'), dinero('ultimaCuota', 'Última cuota mensual'), dinero('gastos', 'Gastos administrativos'), dinero('total', 'Total a devolver'), dinero('saldo', 'Capital pendiente actual'), { key: 'estado', titulo: 'Estado préstamo' }];
    columnas.push({ key: 'linea', titulo: 'Línea de préstamo' }, { key: 'motor', titulo: 'Motor de cálculo' }, numero('pagadas', 'Cuotas pagadas'), numero('pendientes', 'Cuotas pendientes'));
    for (const p of cartera.filter(p => todoPeriodo || enPeriodo(p.fecha_alta))) {
      const cuotas = [...p.cuotas ?? []].sort((a, b) => a.numero_cuota - b.numero_cuota);
      filas.push({ ...identidad(p), otorgamiento: fechaArgentina(p.fecha_alta), capital: p.monto_solicitado_centavos, tasa: Number(p.tna_pactada), plazo: p.plazo_meses, primeraCuota: cuotas[0]?.cuota_total_centavos ?? null,
        ultimaCuota: cuotas.at(-1)?.cuota_total_centavos ?? null, gastos: p.total_costo_operativo_centavos ?? null, total: p.total_a_pagar_centavos, saldo: p.saldo_deudor_actual_centavos, estado: p.estado,
        linea: p.linea_snapshot?.linea_nombre ?? 'Sin línea', motor: p.linea_snapshot?.motor_nombre ?? null,
        pagadas: cuotas.filter(c => c.estado === 'PAGADA').length, pendientes: cuotas.filter(c => c.estado !== 'PAGADA').length });
    }
    resumen = [{ titulo: 'Préstamos otorgados', valor: filas.length }, { titulo: 'Capital otorgado', valor: suma('capital'), dinero: true }, { titulo: 'Total a devolver', valor: suma('total'), dinero: true }];
    resumen.push({ titulo: 'Capital pendiente actual', valor: suma('saldo'), dinero: true });
    notas.push(todoPeriodo ? 'Se incluye todo el historial de otorgamientos, según los filtros de búsqueda y estado.' : 'El período corresponde a la fecha de otorgamiento del préstamo.');
    notas.push('Se muestran primera y última cuota porque el IVA puede variar mes a mes. Los gastos administrativos efectivamente cobrados no se exponen en la API: se informan como No disponible, no como cero.');
  } else if (f.tipo === 'condiciones') {
    columnas = [fecha('otorgamiento', 'Otorgamiento'), ...identificacion,
      dinero('capital', 'Capital solicitado'), { key: 'tasa', titulo: 'Tasa anual registrada', tipo: 'porcentaje' },
      { key: 'tna', titulo: 'TNA', tipo: 'porcentaje' }, { key: 'tem', titulo: 'Tasa mensual', tipo: 'porcentaje' },
      numero('plazo', 'Plazo (meses)'), dinero('primeraCuota', 'Primera cuota mensual'), dinero('ultimaCuota', 'Última cuota mensual'),
      dinero('intereses', 'Total intereses'), { key: 'alicuota', titulo: 'Alícuota IVA', tipo: 'porcentaje' }, dinero('iva', 'Total IVA sobre intereses'),
      dinero('gastos', 'Gastos administrativos'), dinero('total', 'Total a devolver registrado'),
      { key: 'cft', titulo: 'CFT', tipo: 'porcentaje' }, { key: 'estado', titulo: 'Estado préstamo' }];
    const cronograma: TablaReporte = { titulo: 'Desglose de cuotas', columnas: [...identificacion, numero('cuota', 'Cuota'), fecha('vencimiento', 'Vencimiento'),
      dinero('saldoInicial', 'Saldo inicial'), dinero('capital', 'Capital'), dinero('interes', 'Intereses'), dinero('iva', 'IVA sobre intereses'),
      dinero('cuotaPura', 'Cuota sin IVA'), dinero('importe', 'Cuota total'), dinero('saldoFinal', 'Saldo final')], filas: [] };
    for (const p of cartera.filter(p => enPeriodo(p.fecha_alta) && (!f.plazo || p.plazo_meses === Number(f.plazo)))) {
      const cuotas = [...p.cuotas ?? []].sort((a, b) => a.numero_cuota - b.numero_cuota);
      const convencion = p.linea_snapshot?.reglas_motor_json?.convencion_tasa;
      const tem = Number(p.tem_pactada);
      // La tasa anual de un motor TEA no es una TNA; su equivalente usa la tasa mensual pactada.
      const tna = convencion === 'TEA_COMPUESTA' ? (Number.isFinite(tem) ? tem * 12 : null) : Number(p.tna_pactada);
      filas.push({ ...identidad(p), otorgamiento: fechaArgentina(p.fecha_alta), capital: p.monto_solicitado_centavos,
        tasa: Number(p.tna_pactada), tna, tem: Number.isFinite(tem) ? tem : null, plazo: p.plazo_meses,
        primeraCuota: cuotas[0]?.cuota_total_centavos ?? null, ultimaCuota: cuotas.at(-1)?.cuota_total_centavos ?? null,
        intereses: p.total_interes_centavos, alicuota: Number(p.alicuota_iva), iva: p.total_iva_centavos,
        gastos: p.total_costo_operativo_centavos ?? null, total: p.total_a_pagar_centavos, cft: p.cft_tea != null ? Number(p.cft_tea) : null, estado: p.estado });
      for (const c of cuotas) cronograma.filas.push({ ...identidad(p), cuota: c.numero_cuota, vencimiento: c.fecha_vencimiento,
        saldoInicial: c.saldo_inicial_centavos, capital: c.capital_centavos, interes: c.interes_centavos, iva: c.iva_interes_centavos,
        cuotaPura: c.cuota_pura_centavos, importe: c.cuota_total_centavos, saldoFinal: c.saldo_final_centavos });
    }
    anexos = [cronograma];
    resumen = [{ titulo: 'Préstamos consultados', valor: filas.length }, { titulo: 'Capital solicitado', valor: suma('capital'), dinero: true },
      { titulo: 'Total intereses', valor: suma('intereses'), dinero: true }, { titulo: 'Total IVA', valor: suma('iva'), dinero: true },
      { titulo: 'Total a devolver registrado', valor: suma('total'), dinero: true }];
    if (filas.some(r => r.gastos === null || r.cft === null)) advertencias.push('Gastos administrativos y CFT: no disponibles en préstamos históricos anteriores sin cálculo de CFT registrado.');
    notas.push('El período selecciona la fecha de otorgamiento. El desglose incluye todas las cuotas de los préstamos seleccionados, aun cuando venzan fuera del período.');
    notas.push('Se muestran las condiciones guardadas al otorgar el préstamo. Primera y última cuota incluyen IVA; el detalle permite ver el importe de cada mes y el ajuste de la última cuota.');
    notas.push('La tasa anual registrada es la aplicada por el motor. Para motores TEA identificados en el préstamo, la TNA equivalente es la tasa mensual pactada multiplicada por 12; en los demás casos se informa el campo TNA registrado por el sistema.');
    notas.push('Total a devolver registrado: importe contractual guardado en el sistema. No acredita la inclusión de gastos administrativos. CFT no disponible no equivale a cero y no se reemplaza por la tasa de interés.');
  } else {
    columnas = [fecha('cobranza', 'Fecha cobranza'), ...identificacion, numero('cuota', 'Cuota imputada'), dinero('importe', 'Importe cobrado'), dinero('capital', 'Aplicado a capital'), dinero('interes', 'Aplicado a intereses'), dinero('iva', 'Aplicado a IVA'), dinero('otros', 'Otros conceptos'), { key: 'medio', titulo: 'Medio de pago' }, dinero('saldo', 'Capital pendiente tras pago'), { key: 'estado', titulo: 'Estado cuota actual' }, { key: 'tipoPago', titulo: 'Tipo de pago' }];
    for (const p of cartera) {
      const cuotas = p.cuotas ?? [];
      const pagos = cuotas.filter(c => c.fecha_pago && c.monto_pagado_centavos > 0).sort((a, b) => instante(a.fecha_pago!) - instante(b.fecha_pago!));
      const conciliado = pagos.every(completo)
        && cuotas.every(c => c.monto_pagado_centavos === 0 || Boolean(c.fecha_pago))
        && p.total_capital_centavos - pagos.reduce((sum, c) => sum + c.capital_centavos, 0) === p.saldo_deudor_actual_centavos;
      for (const c of pagos) {
        const estado = estadoCuota(c, hoy);
        if (!enPeriodo(c.fecha_pago) || (f.estadoCuota && estado !== f.estadoCuota)) continue;
        const aplicado = completo(c);
        const costoOp = c.costo_operativo_centavos ?? 0;
        const desglosable = aplicado && c.capital_centavos + c.interes_centavos + c.iva_interes_centavos + costoOp === c.monto_pagado_centavos;
        const anticipo = c.fecha_vencimiento && fechaArgentina(c.fecha_pago) < c.fecha_vencimiento;
        const saldo = conciliado ? p.total_capital_centavos - pagos.filter(x => instante(x.fecha_pago!) <= instante(c.fecha_pago!)).reduce((sum, x) => sum + x.capital_centavos, 0) : null;
        filas.push({ ...identidad(p), cobranza: fechaArgentina(c.fecha_pago), cuota: c.numero_cuota,
          importe: aplicado ? c.monto_pagado_centavos : null, capital: desglosable ? c.capital_centavos : null, interes: desglosable ? c.interes_centavos : null,
          iva: desglosable ? c.iva_interes_centavos : null, otros: desglosable ? costoOp : null, medio: null, saldo, estado,
          tipoPago: !aplicado ? 'Acumulado parcial / sin movimientos' : saldo === 0 ? (anticipo ? 'Última cuota anticipada' : 'Última cuota pagada') : anticipo ? 'Cuota anticipada' : 'Cuota completa' });
      }
    }
    filas.sort((a, b) => String(a.cobranza).localeCompare(String(b.cobranza)) || String(a.prestamo).localeCompare(String(b.prestamo)) || Number(a.cuota) - Number(b.cuota));
    resumen = [{ titulo: 'Registros de cuotas cobradas', valor: filas.length }, { titulo: 'Cobrado con importe verificable', valor: suma('importe'), dinero: true }, { titulo: 'Capital aplicado verificable', valor: suma('capital'), dinero: true }];
    notas.push('Fuente: último pago guardado en cada cuota, no un libro de movimientos. La API actual solo registra cuotas completas; no informa medio de pago, historial de abonos parciales ni cancelaciones totales cobradas. No disponible no equivale a cero.');
    notas.push('El saldo tras pago se reconstruye con las cuotas pagadas solo si concilia con el capital pendiente actual. Las cuotas con igual fecha y hora comparten el saldo al finalizar ese registro. Cuota anticipada indica pago anterior al vencimiento, no una precancelación contractual.');
    if (filas.some(r => r.importe === null)) notas.push('Hay acumulados parciales: no se suman como cobranzas individuales. Los totales verificables no incluyen esos registros.');
  }
  return { titulo: TIPOS_REPORTE.find(t => t.id === f.tipo)!.titulo, columnas, filas, resumen, notas: [...advertencias, ...notas], advertencias, anexos };
}
