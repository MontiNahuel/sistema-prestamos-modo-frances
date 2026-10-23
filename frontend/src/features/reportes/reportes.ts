import type { CuotaPrestamo, Prestamo } from '../../types/prestamo';

export type TipoReporte = 'caida' | 'ultimo-pago' | 'otorgados' | 'cobranzas';
export type Valor = string | number | null;
export interface Columna { key: string; titulo: string; tipo?: 'dinero' | 'fecha' | 'porcentaje' | 'numero' }
export interface FiltrosReporte {
  tipo: TipoReporte;
  desde: string;
  hasta: string;
  buscar: string;
  estadoPrestamo: string;
  estadoCuota: string;
}
export interface Reporte {
  titulo: string;
  columnas: Columna[];
  filas: Record<string, Valor>[];
  resumen: { titulo: string; valor: number; dinero?: boolean }[];
  notas: string[];
  advertencias: string[];
}

export const TIPOS_REPORTE: { id: TipoReporte; titulo: string; descripcion: string }[] = [
  { id: 'caida', titulo: 'Caída de cuotas', descripcion: 'Vencimientos y cuotas a cobrar en el período.' },
  { id: 'ultimo-pago', titulo: 'Fecha del último pago', descripcion: 'Última cobranza de cada préstamo y pendientes actuales.' },
  { id: 'otorgados', titulo: 'Préstamos otorgados', descripcion: 'Créditos concedidos durante el período.' },
  { id: 'cobranzas', titulo: 'Cobranzas aplicadas', descripcion: 'Pagos registrados y su imputación a las cuotas.' },
];

const identificacion: Columna[] = [
  { key: 'asociado', titulo: 'Asociado' }, { key: 'documento', titulo: 'Documento' },
  { key: 'personaId', titulo: 'ID asociado', tipo: 'numero' }, { key: 'prestamo', titulo: 'Préstamo' },
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

function identidad(p: Prestamo): Record<string, Valor> {
  return { asociado: p.persona_nombre || `Asociado #${p.persona_id}`, documento: p.persona_doc || null, personaId: p.persona_id, prestamo: p.id };
}

export function construirReporte(prestamos: Prestamo[], f: FiltrosReporte, hoy = hoyArgentina()): Reporte {
  if (!f.desde || !f.hasta || f.desde > f.hasta) throw new Error('Seleccioná un período válido: Desde no puede ser posterior a Hasta.');
  const enPeriodo = (fechaValor: string | null | undefined) => {
    const dia = fechaArgentina(fechaValor);
    return Boolean(dia && dia >= f.desde && dia <= f.hasta);
  };
  const buscar = f.buscar.trim().toLocaleLowerCase('es');
  const cartera = prestamos.filter(p => (!f.estadoPrestamo || p.estado === f.estadoPrestamo)
    && (!buscar || [p.persona_nombre, p.persona_doc, p.id, String(p.persona_id)].some(v => v?.toLocaleLowerCase('es').includes(buscar))));
  const filas: Reporte['filas'] = [];
  const advertencias: string[] = [];
  let columnas: Columna[];
  let resumen: Reporte['resumen'];
  const notas: string[] = ['Importes en pesos argentinos (ARS). Estados y saldos pendientes corresponden a la fecha de consulta; no son un cierre histórico.'];
  const suma = (key: string) => filas.reduce((total, r) => total + (typeof r[key] === 'number' ? r[key] as number : 0), 0);

  if (f.tipo === 'caida') {
    const sinFecha = cartera.reduce((sum, p) => sum + (p.cuotas ?? []).filter(c => !c.fecha_vencimiento).length, 0);
    if (sinFecha) advertencias.push(`Hay ${sinFecha} cuotas sin fecha de vencimiento en la cartera consultada. No se pueden asignar a un período y no están incluidas en estos totales.`);
    columnas = [...identificacion, numero('cuota', 'Cuota'), fecha('vencimiento', 'Vencimiento'), dinero('importe', 'Importe cuota'), dinero('capital', 'Capital'), dinero('interes', 'Intereses'), dinero('iva', 'IVA'), dinero('pendiente', 'A cobrar pendiente'), { key: 'estado', titulo: 'Estado cuota' }, { key: 'estadoPrestamo', titulo: 'Estado préstamo' }];
    for (const p of cartera) {
      for (const c of p.cuotas ?? []) {
        const estado = estadoCuota(c, hoy);
        if (!enPeriodo(c.fecha_vencimiento) || (f.estadoCuota && estado !== f.estadoCuota)) continue;
        filas.push({ ...identidad(p), cuota: c.numero_cuota, vencimiento: c.fecha_vencimiento, importe: c.cuota_total_centavos, capital: c.capital_centavos, interes: c.interes_centavos, iva: c.iva_interes_centavos,
          pendiente: p.estado === 'CANCELADO' || estado === 'PAGADA' ? 0 : Math.max(0, c.cuota_total_centavos - c.monto_pagado_centavos), estado, estadoPrestamo: p.estado });
      }
    }
    filas.sort((a, b) => String(a.vencimiento).localeCompare(String(b.vencimiento)) || String(a.prestamo).localeCompare(String(b.prestamo)) || Number(a.cuota) - Number(b.cuota));
    resumen = [{ titulo: 'Cuotas con vencimiento', valor: filas.length }, { titulo: 'Importe total de cuotas', valor: suma('importe'), dinero: true }, { titulo: 'Pendiente a cobrar', valor: suma('pendiente'), dinero: true }];
    notas.push('El total nominal incluye cuotas pagadas. Pendiente a cobrar descuenta pagos registrados y excluye préstamos cancelados. Las cuotas sin vencimiento no pueden asignarse a un período.');
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
    for (const p of cartera.filter(p => enPeriodo(p.fecha_alta))) {
      const cuotas = [...p.cuotas ?? []].sort((a, b) => a.numero_cuota - b.numero_cuota);
      filas.push({ ...identidad(p), otorgamiento: fechaArgentina(p.fecha_alta), capital: p.monto_solicitado_centavos, tasa: Number(p.tna_pactada), plazo: p.plazo_meses, primeraCuota: cuotas[0]?.cuota_total_centavos ?? null,
        ultimaCuota: cuotas.at(-1)?.cuota_total_centavos ?? null, gastos: null, total: p.total_a_pagar_centavos, saldo: p.saldo_deudor_actual_centavos, estado: p.estado });
    }
    resumen = [{ titulo: 'Préstamos otorgados', valor: filas.length }, { titulo: 'Capital otorgado', valor: suma('capital'), dinero: true }, { titulo: 'Total a devolver', valor: suma('total'), dinero: true }];
    notas.push('Se muestran primera y última cuota porque el IVA puede variar mes a mes. Los gastos administrativos efectivamente cobrados no se exponen en la API: se informan como No disponible, no como cero.');
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
        const desglosable = aplicado && c.capital_centavos + c.interes_centavos + c.iva_interes_centavos === c.monto_pagado_centavos;
        const anticipo = c.fecha_vencimiento && fechaArgentina(c.fecha_pago) < c.fecha_vencimiento;
        const saldo = conciliado ? p.total_capital_centavos - pagos.filter(x => instante(x.fecha_pago!) <= instante(c.fecha_pago!)).reduce((sum, x) => sum + x.capital_centavos, 0) : null;
        filas.push({ ...identidad(p), cobranza: fechaArgentina(c.fecha_pago), cuota: c.numero_cuota,
          importe: aplicado ? c.monto_pagado_centavos : null, capital: desglosable ? c.capital_centavos : null, interes: desglosable ? c.interes_centavos : null,
          iva: desglosable ? c.iva_interes_centavos : null, otros: desglosable ? 0 : null, medio: null, saldo, estado,
          tipoPago: !aplicado ? 'Acumulado parcial / sin movimientos' : saldo === 0 ? (anticipo ? 'Última cuota anticipada' : 'Última cuota pagada') : anticipo ? 'Cuota anticipada' : 'Cuota completa' });
      }
    }
    filas.sort((a, b) => String(a.cobranza).localeCompare(String(b.cobranza)) || String(a.prestamo).localeCompare(String(b.prestamo)) || Number(a.cuota) - Number(b.cuota));
    resumen = [{ titulo: 'Registros de cuotas cobradas', valor: filas.length }, { titulo: 'Cobrado con importe verificable', valor: suma('importe'), dinero: true }, { titulo: 'Capital aplicado verificable', valor: suma('capital'), dinero: true }];
    notas.push('Fuente: último pago guardado en cada cuota, no un libro de movimientos. La API actual solo registra cuotas completas; no informa medio de pago, historial de abonos parciales ni cancelaciones totales cobradas. No disponible no equivale a cero.');
    notas.push('El saldo tras pago se reconstruye con las cuotas pagadas solo si concilia con el capital pendiente actual. Las cuotas con igual fecha y hora comparten el saldo al finalizar ese registro. Cuota anticipada indica pago anterior al vencimiento, no una precancelación contractual.');
    if (filas.some(r => r.importe === null)) notas.push('Hay acumulados parciales: no se suman como cobranzas individuales. Los totales verificables no incluyen esos registros.');
  }
  return { titulo: TIPOS_REPORTE.find(t => t.id === f.tipo)!.titulo, columnas, filas, resumen, notas: [...advertencias, ...notas], advertencias };
}
