from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from app.features.auditoria.model import (
    AuditoriaPrestamo,
    AuditoriaPresentacionBapro,
    AuditoriaConfiguracionCredito,
    AuditoriaSincronizacionPersona,
)
from app.features.auditoria.repository import AuditoriaRepository


class AuditoriaService:
    """Servicio de dominio para auditar y consultar eventos en tablas dedicadas."""

    def __init__(self, repository: AuditoriaRepository):
        self.repository = repository

    # 1. Préstamos
    def auditar_prestamo(
        self,
        prestamo_id: str,
        accion: str,
        cuota_numero: Optional[int] = None,
        monto_centavos: Optional[int] = None,
        saldo_deudor_remanente_centavos: Optional[int] = None,
        usuario_operador: Optional[str] = None,
        motivo: Optional[str] = None,
        ip_origen: Optional[str] = None,
        detalles_json: Optional[Dict[str, Any]] = None,
    ) -> AuditoriaPrestamo:
        evento = AuditoriaPrestamo(
            prestamo_id=str(prestamo_id),
            accion=accion.upper(),
            cuota_numero=cuota_numero,
            monto_centavos=monto_centavos,
            saldo_deudor_remanente_centavos=saldo_deudor_remanente_centavos,
            usuario_operador=usuario_operador,
            motivo=motivo,
            ip_origen=ip_origen,
            detalles_json=detalles_json,
            fecha_registro=datetime.utcnow(),
        )
        return self.repository.registrar_prestamo(evento)

    def listar_prestamos(
        self, prestamo_id: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> Tuple[List[AuditoriaPrestamo], int]:
        return self.repository.listar_prestamos(prestamo_id=prestamo_id, limit=limit, offset=offset)

    # 2. Presentaciones BAPRO
    def auditar_presentacion_bapro(
        self,
        accion: str,
        nro_archivo: Optional[int] = None,
        presentacion_archivo_id: Optional[int] = None,
        total_registros: Optional[int] = None,
        total_monto: Optional[Decimal] = None,
        registros_aprobados: Optional[int] = None,
        registros_rechazados: Optional[int] = None,
        dni_afectado: Optional[str] = None,
        usuario_operador: Optional[str] = None,
        motivo: Optional[str] = None,
        ip_origen: Optional[str] = None,
        detalles_json: Optional[Dict[str, Any]] = None,
    ) -> AuditoriaPresentacionBapro:
        evento = AuditoriaPresentacionBapro(
            accion=accion.upper(),
            nro_archivo=nro_archivo,
            presentacion_archivo_id=presentacion_archivo_id,
            total_registros=total_registros,
            total_monto=total_monto,
            registros_aprobados=registros_aprobados,
            registros_rechazados=registros_rechazados,
            dni_afectado=dni_afectado,
            usuario_operador=usuario_operador,
            motivo=motivo,
            ip_origen=ip_origen,
            detalles_json=detalles_json,
            fecha_registro=datetime.utcnow(),
        )
        return self.repository.registrar_presentacion_bapro(evento)

    def listar_presentaciones_bapro(
        self, nro_archivo: Optional[int] = None, limit: int = 50, offset: int = 0
    ) -> Tuple[List[AuditoriaPresentacionBapro], int]:
        return self.repository.listar_presentaciones_bapro(
            nro_archivo=nro_archivo, limit=limit, offset=offset
        )

    # 3. Configuración Créditos (Líneas / Motores)
    def auditar_configuracion_credito(
        self,
        tipo_entidad: str,
        entidad_id: int,
        accion: str,
        codigo: Optional[str] = None,
        nombre: Optional[str] = None,
        tasa_anterior: Optional[Decimal] = None,
        tasa_nueva: Optional[Decimal] = None,
        usuario_operador: Optional[str] = None,
        motivo: Optional[str] = None,
        ip_origen: Optional[str] = None,
        cambios_json: Optional[Dict[str, Any]] = None,
    ) -> AuditoriaConfiguracionCredito:
        evento = AuditoriaConfiguracionCredito(
            tipo_entidad=tipo_entidad.upper(),
            entidad_id=entidad_id,
            accion=accion.upper(),
            codigo=codigo,
            nombre=nombre,
            tasa_anterior=tasa_anterior,
            tasa_nueva=tasa_nueva,
            usuario_operador=usuario_operador,
            motivo=motivo,
            ip_origen=ip_origen,
            cambios_json=cambios_json,
            fecha_registro=datetime.utcnow(),
        )
        return self.repository.registrar_configuracion_credito(evento)

    def listar_configuracion_creditos(
        self,
        tipo_entidad: Optional[str] = None,
        entidad_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditoriaConfiguracionCredito], int]:
        return self.repository.listar_configuracion_creditos(
            tipo_entidad=tipo_entidad, entidad_id=entidad_id, limit=limit, offset=offset
        )

    # 4. Sincronización Personas
    def auditar_sincronizacion_persona(
        self,
        documento: str,
        estado: str,
        accion: str = "ALTA",
        id_persona_oracle: Optional[int] = None,
        id_persona_coopya: Optional[int] = None,
        detalle_error: Optional[str] = None,
        payload_json: Optional[Dict[str, Any]] = None,
        usuario_operador: Optional[str] = None,
        ip_origen: Optional[str] = None,
    ) -> AuditoriaSincronizacionPersona:
        evento = AuditoriaSincronizacionPersona(
            documento=documento,
            estado=estado.upper(),
            accion=accion.upper(),
            id_persona_oracle=id_persona_oracle,
            id_persona_coopya=id_persona_coopya,
            detalle_error=detalle_error,
            payload_json=payload_json,
            usuario_operador=usuario_operador,
            ip_origen=ip_origen,
            fecha_registro=datetime.utcnow(),
        )
        return self.repository.registrar_sincronizacion_persona(evento)

    def listar_sincronizaciones_persona(
        self,
        documento: Optional[str] = None,
        estado: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditoriaSincronizacionPersona], int]:
        return self.repository.listar_sincronizaciones_persona(
            documento=documento, estado=estado, limit=limit, offset=offset
        )


# Alias para compatibilidad hacia atrás
HistorialCambiosService = AuditoriaService
