from datetime import datetime
from decimal import Decimal
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict


class AuditoriaPrestamoResponse(BaseModel):
    id: int
    prestamo_id: str
    accion: str
    cuota_numero: Optional[int] = None
    monto_centavos: Optional[int] = None
    saldo_deudor_remanente_centavos: Optional[int] = None
    usuario_operador: Optional[str] = None
    motivo: Optional[str] = None
    ip_origen: Optional[str] = None
    detalles_json: Optional[Dict[str, Any]] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAuditoriaPrestamo(BaseModel):
    items: List[AuditoriaPrestamoResponse]
    total: int
    limit: int
    offset: int


class AuditoriaPresentacionBaproResponse(BaseModel):
    id: int
    nro_archivo: Optional[int] = None
    presentacion_archivo_id: Optional[int] = None
    accion: str
    total_registros: Optional[int] = None
    total_monto: Optional[Decimal] = None
    registros_aprobados: Optional[int] = None
    registros_rechazados: Optional[int] = None
    dni_afectado: Optional[str] = None
    usuario_operador: Optional[str] = None
    motivo: Optional[str] = None
    ip_origen: Optional[str] = None
    detalles_json: Optional[Dict[str, Any]] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAuditoriaPresentacionBapro(BaseModel):
    items: List[AuditoriaPresentacionBaproResponse]
    total: int
    limit: int
    offset: int


class AuditoriaConfiguracionCreditoResponse(BaseModel):
    id: int
    tipo_entidad: str
    entidad_id: int
    accion: str
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    tasa_anterior: Optional[Decimal] = None
    tasa_nueva: Optional[Decimal] = None
    usuario_operador: Optional[str] = None
    motivo: Optional[str] = None
    ip_origen: Optional[str] = None
    cambios_json: Optional[Dict[str, Any]] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAuditoriaConfiguracionCredito(BaseModel):
    items: List[AuditoriaConfiguracionCreditoResponse]
    total: int
    limit: int
    offset: int


class AuditoriaSincronizacionPersonaResponse(BaseModel):
    id: int
    documento: str
    id_persona_oracle: Optional[int] = None
    id_persona_coopya: Optional[int] = None
    estado: str
    accion: str
    detalle_error: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None
    usuario_operador: Optional[str] = None
    ip_origen: Optional[str] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedAuditoriaSincronizacionPersona(BaseModel):
    items: List[AuditoriaSincronizacionPersonaResponse]
    total: int
    limit: int
    offset: int
