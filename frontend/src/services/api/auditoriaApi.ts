import { apiClient } from './client';
import {
  PaginatedResponse,
  AuditoriaPrestamoItem,
  AuditoriaPresentacionBaproItem,
  AuditoriaConfiguracionCreditoItem,
  AuditoriaSincronizacionPersonaItem,
} from '../../types/auditoria';

export async function getAuditoriaPrestamos(params: {
  prestamoId?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<AuditoriaPrestamoItem>> {
  const query = new URLSearchParams();
  if (params.prestamoId) query.set('prestamo_id', params.prestamoId);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());
  return apiClient<PaginatedResponse<AuditoriaPrestamoItem>>(`/api/v1/auditoria/prestamos?${query.toString()}`);
}

export async function getAuditoriaPresentacionesBapro(params: {
  nroArchivo?: number;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<AuditoriaPresentacionBaproItem>> {
  const query = new URLSearchParams();
  if (params.nroArchivo) query.set('nro_archivo', params.nroArchivo.toString());
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());
  return apiClient<PaginatedResponse<AuditoriaPresentacionBaproItem>>(`/api/v1/auditoria/presentaciones-bapro?${query.toString()}`);
}

export async function getAuditoriaConfiguracionCreditos(params: {
  tipoEntidad?: string;
  entidadId?: number;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<AuditoriaConfiguracionCreditoItem>> {
  const query = new URLSearchParams();
  if (params.tipoEntidad) query.set('tipo_entidad', params.tipoEntidad);
  if (params.entidadId) query.set('entidad_id', params.entidadId.toString());
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());
  return apiClient<PaginatedResponse<AuditoriaConfiguracionCreditoItem>>(`/api/v1/auditoria/configuracion-creditos?${query.toString()}`);
}

export async function getAuditoriaSincronizacionPersonas(params: {
  documento?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<AuditoriaSincronizacionPersonaItem>> {
  const query = new URLSearchParams();
  if (params.documento) query.set('documento', params.documento);
  if (params.estado) query.set('estado', params.estado);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());
  return apiClient<PaginatedResponse<AuditoriaSincronizacionPersonaItem>>(`/api/v1/auditoria/sincronizacion-personas?${query.toString()}`);
}
