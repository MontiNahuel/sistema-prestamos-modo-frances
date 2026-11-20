import { apiClient } from '../../services/api/client';
import type {
  ReporteExtraCatalinasRequestPayload,
  ReporteExtraCatalinasResponse,
} from './reportesExtra';

/** Ejecuta la consulta parametrizada de cobros Canal 12 / Prestador 68 contra Oracle. */
export async function consultarCatalinasCobros(
  payload: ReporteExtraCatalinasRequestPayload
): Promise<ReporteExtraCatalinasResponse> {
  return apiClient<ReporteExtraCatalinasResponse>('/api/v1/reportes-extra/catalinas-cobros', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
