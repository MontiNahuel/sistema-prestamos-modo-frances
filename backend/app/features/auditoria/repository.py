from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.features.auditoria.model import (
    AuditoriaPrestamo,
    AuditoriaPresentacionBapro,
    AuditoriaConfiguracionCredito,
    AuditoriaSincronizacionPersona,
)


class AuditoriaRepository:
    """Acceso a datos para los 4 repositorios de auditoría especializada."""

    def __init__(self, db: Session):
        self.db = db

    # 1. Auditoría Préstamos
    def registrar_prestamo(self, evento: AuditoriaPrestamo) -> AuditoriaPrestamo:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def listar_prestamos(
        self, prestamo_id: Optional[str] = None, limit: int = 50, offset: int = 0
    ) -> Tuple[List[AuditoriaPrestamo], int]:
        q = self.db.query(AuditoriaPrestamo)
        if prestamo_id:
            q = q.filter(AuditoriaPrestamo.prestamo_id == str(prestamo_id))
        total = q.count()
        items = q.order_by(AuditoriaPrestamo.fecha_registro.desc()).offset(offset).limit(limit).all()
        return items, total

    # 2. Auditoría Presentaciones BAPRO
    def registrar_presentacion_bapro(
        self, evento: AuditoriaPresentacionBapro
    ) -> AuditoriaPresentacionBapro:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def listar_presentaciones_bapro(
        self, nro_archivo: Optional[int] = None, limit: int = 50, offset: int = 0
    ) -> Tuple[List[AuditoriaPresentacionBapro], int]:
        q = self.db.query(AuditoriaPresentacionBapro)
        if nro_archivo:
            q = q.filter(AuditoriaPresentacionBapro.nro_archivo == nro_archivo)
        total = q.count()
        items = (
            q.order_by(AuditoriaPresentacionBapro.fecha_registro.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    # 3. Auditoría Configuración Créditos (Líneas y Motores)
    def registrar_configuracion_credito(
        self, evento: AuditoriaConfiguracionCredito
    ) -> AuditoriaConfiguracionCredito:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def listar_configuracion_creditos(
        self,
        tipo_entidad: Optional[str] = None,
        entidad_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditoriaConfiguracionCredito], int]:
        q = self.db.query(AuditoriaConfiguracionCredito)
        if tipo_entidad:
            q = q.filter(AuditoriaConfiguracionCredito.tipo_entidad == tipo_entidad.upper())
        if entidad_id:
            q = q.filter(AuditoriaConfiguracionCredito.entidad_id == entidad_id)
        total = q.count()
        items = (
            q.order_by(AuditoriaConfiguracionCredito.fecha_registro.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    # 4. Auditoría Sincronización Personas (Oracle / CoopYa)
    def registrar_sincronizacion_persona(
        self, evento: AuditoriaSincronizacionPersona
    ) -> AuditoriaSincronizacionPersona:
        self.db.add(evento)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def listar_sincronizaciones_persona(
        self,
        documento: Optional[str] = None,
        estado: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AuditoriaSincronizacionPersona], int]:
        q = self.db.query(AuditoriaSincronizacionPersona)
        if documento:
            q = q.filter(AuditoriaSincronizacionPersona.documento == documento)
        if estado:
            q = q.filter(AuditoriaSincronizacionPersona.estado == estado.upper())
        total = q.count()
        items = (
            q.order_by(AuditoriaSincronizacionPersona.fecha_registro.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total


# Alias para compatibilidad hacia atrás
HistorialCambiosRepository = AuditoriaRepository
