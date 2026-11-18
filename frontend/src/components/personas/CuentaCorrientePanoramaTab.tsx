import React from 'react';
import { CuentaCorrienteResumen, DesgloseCuentaCorriente } from '../../types/persona';
import { formatPesos } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { estadoBadgeVariant } from './cuentaCorrienteHelpers';

interface CuentaCorrientePanoramaTabProps {
  cc: CuentaCorrienteResumen;
  cuotasPrestamos: DesgloseCuentaCorriente[];
  cuotasSociales: DesgloseCuentaCorriente[];
  cuotasCentral: DesgloseCuentaCorriente[];
  onIrATab: (tab: 'prestamos' | 'cuota_social' | 'central' | 'movimientos') => void;
}

export const CuentaCorrientePanoramaTab: React.FC<CuentaCorrientePanoramaTabProps> = ({
  cc,
  cuotasPrestamos,
  cuotasSociales,
  cuotasCentral,
  onIrATab
}) => {
  const conceptosPrestamo = (cc.conceptos || []).filter(
    (c) => (c.concepto || '').toUpperCase() !== 'CUOTA_SOCIAL'
  );
  const ultimoMovimiento = (cc.movimientos || [])[0];
  const cuotaSocialValor = cc.cuotaSocial?.valorCentavos
    ? cc.cuotaSocial.valorCentavos / 100
    : 5500;
  const saldoTotal = cc.totales.saldo || 0;

  return (
    <div className="flex-1 min-h-0 overflow-auto px-6 py-4 bg-[#ffffff]">
      <div className="grid grid-cols-[repeat(auto-fit,_minmax(420px,_1fr))] gap-4">
        {/* Bloque 1: Préstamos y obligaciones */}
        <div className="[border:1px_solid_#e2e8f0] rounded-[10px] p-4 bg-[#ffffff]">
          <div className="flex justify-between items-center mb-3">
            <strong className="text-[0.9rem] text-[#0f172a]">
              Planes y Obligaciones ({conceptosPrestamo.length})
            </strong>
            <button
              type="button"
              onClick={() => onIrATab('prestamos')}
              className="text-[0.78rem] font-semibold text-[#2563eb] [background:none] [border:none] cursor-pointer hover:underline"
            >
              Ver {cuotasPrestamos.length} cuotas →
            </button>
          </div>

          {conceptosPrestamo.length > 0 ? (
            <table className="w-full border-collapse text-[0.8rem] [font-variant-numeric:tabular-nums]">
              <thead className="text-[#64748b] text-[0.7rem] uppercase [border-bottom:1px_solid_#e2e8f0]">
                <tr>
                  <th className="py-1.5 px-1 text-left">Plan / Concepto</th>
                  <th className="py-1.5 px-1 text-center">Cubiertas</th>
                  <th className="py-1.5 px-1 text-right">Cuota mensual</th>
                  <th className="py-1.5 px-1 text-right">Saldo deuda</th>
                </tr>
              </thead>
              <tbody>
                {conceptosPrestamo.map((con, idx) => (
                  <tr
                    key={`${con.concepto}-${con.planNombre}-${idx}`}
                    className="[border-bottom:1px_solid_#f1f5f9] last:[border-bottom:none]"
                  >
                    <td className="py-2 px-1 font-semibold text-[#0f172a]">
                      {con.planNombre || con.etiqueta || con.concepto}
                    </td>
                    <td className="py-2 px-1 text-center text-[#475569]">
                      {con.cuotasCubiertas ?? 0} / {con.cuotasDelPlan ?? '—'}
                      {(con.cuotasVencidas ?? 0) > 0 && (
                        <span className="ml-1.5 text-[0.7rem] font-bold text-[#b91c1c]">
                          ({con.cuotasVencidas} venc.)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-1 text-right text-[#334155]">
                      {formatPesos(con.valorMensual || 0)}
                    </td>
                    <td
                      className={`py-2 px-1 text-right font-bold ${
                        (con.deudaDelConcepto ?? 0) > 0 ? 'text-[#b91c1c]' : 'text-[#16a34a]'
                      }`}
                    >
                      {formatPesos(con.deudaDelConcepto ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center text-[0.82rem] text-[#94a3b8]">
              Sin planes de préstamo registrados para este socio.
            </div>
          )}
        </div>

        {/* Bloque 2: Cuota Social, Sistema Central y Último Pago */}
        <div className="[border:1px_solid_#e2e8f0] rounded-[10px] p-4 bg-[#ffffff] flex flex-col gap-2.5">
          <div className="flex justify-between items-center mb-1">
            <strong className="text-[0.9rem] text-[#0f172a]">
              Cuota Social, Sistema Central y Cobranzas
            </strong>
            <span className="text-[0.78rem] font-bold text-[#0f172a] [font-variant-numeric:tabular-nums]">
              Saldo total: {formatPesos(saldoTotal)}
            </span>
          </div>

          <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#f8fafc] [border:1px_solid_#e2e8f0] text-[0.82rem]">
            <div>
              <span className="text-[#475569] font-medium">Cuota Social Mensual </span>
              <Badge variant={cc.cuotaSocial?.activa ? 'success' : 'neutral'}>
                {cc.cuotaSocial?.activa ? 'ACTIVA' : 'INACTIVA'}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <strong className="text-[#0f172a] [font-variant-numeric:tabular-nums]">
                {formatPesos(cuotaSocialValor)} / mes
              </strong>
              {(cuotasSociales.length > 0 || cc.cuotaSocial?.activa) && (
                <button
                  type="button"
                  onClick={() => onIrATab('cuota_social')}
                  className="text-[0.75rem] font-semibold text-[#2563eb] [background:none] [border:none] cursor-pointer hover:underline"
                >
                  Ver ({cuotasSociales.length}) →
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#f8fafc] [border:1px_solid_#e2e8f0] text-[0.82rem]">
            <span className="text-[#475569] font-medium">
              Conceptos en Sistema Central (CoopYa)
            </span>
            <div className="flex items-center gap-3">
              <strong className="text-[#0f172a]">
                {cuotasCentral.length} registro(s)
              </strong>
              {cuotasCentral.length > 0 && (
                <button
                  type="button"
                  onClick={() => onIrATab('central')}
                  className="text-[0.75rem] font-semibold text-[#2563eb] [background:none] [border:none] cursor-pointer hover:underline"
                >
                  Ver →
                </button>
              )}
            </div>
          </div>

          {ultimoMovimiento ? (
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#f0fdf4] [border:1px_solid_#bbf7d0] text-[0.82rem]">
              <div className="text-[#166534]">
                <span className="font-semibold">Último movimiento:</span>{' '}
                {ultimoMovimiento.concepto} ({ultimoMovimiento.fechaImpacto?.substring(0, 10) || '—'})
              </div>
              <div className="flex items-center gap-2.5">
                <strong className="text-[#15803d] [font-variant-numeric:tabular-nums]">
                  {formatPesos(ultimoMovimiento.montoPesos)}
                </strong>
                <Badge variant={estadoBadgeVariant(ultimoMovimiento.estado)}>
                  {ultimoMovimiento.estado}
                </Badge>
                <button
                  type="button"
                  onClick={() => onIrATab('movimientos')}
                  className="text-[0.75rem] font-semibold text-[#15803d] [background:none] [border:none] cursor-pointer hover:underline"
                >
                  Historial →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[#f8fafc] [border:1px_solid_#e2e8f0] text-[0.8rem] text-[#94a3b8]">
              Sin movimientos de cobro registrados aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
