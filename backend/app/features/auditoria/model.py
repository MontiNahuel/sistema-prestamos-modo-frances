from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    DateTime,
    Numeric,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditoriaPrestamo(Base):
    """Auditoría especializada para ciclo de vida de préstamos."""

    __tablename__ = "auditoria_prestamos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    prestamo_id = Column(String(36), ForeignKey("prestamos.id"), nullable=False, index=True)
    accion = Column(String(30), nullable=False)  # OTORGAMIENTO, PAGO_CUOTA, CANCELACION
    cuota_numero = Column(Integer, nullable=True)
    monto_centavos = Column(BigInteger, nullable=True)
    saldo_deudor_remanente_centavos = Column(BigInteger, nullable=True)
    usuario_operador = Column(String(100), nullable=True)
    motivo = Column(String(255), nullable=True)
    ip_origen = Column(String(50), nullable=True)
    detalles_json = Column(JSON, nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    prestamo = relationship("Prestamo")


class AuditoriaPresentacionBapro(Base):
    """Auditoría de eventos y lotes de presentación Banco Provincia."""

    __tablename__ = "auditoria_presentaciones_bapro"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nro_archivo = Column(Integer, nullable=True, index=True)
    presentacion_archivo_id = Column(
        Integer,
        ForeignKey("presentaciones_bapro_archivos.id"),
        nullable=True,
        index=True,
    )
    accion = Column(String(30), nullable=False)  # GENERACION_LOTE, CARGA_RENDICION, EXCLUSION_DNI
    total_registros = Column(Integer, nullable=True)
    total_monto = Column(Numeric(18, 2), nullable=True)
    registros_aprobados = Column(Integer, nullable=True)
    registros_rechazados = Column(Integer, nullable=True)
    dni_afectado = Column(String(20), nullable=True)
    usuario_operador = Column(String(100), nullable=True)
    motivo = Column(String(255), nullable=True)
    ip_origen = Column(String(50), nullable=True)
    detalles_json = Column(JSON, nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # archivo = relationship("PresentacionBaproArchivo")


class AuditoriaConfiguracionCredito(Base):
    """Auditoría de cambios en líneas crediticias y motores de cálculo."""

    __tablename__ = "auditoria_configuracion_creditos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tipo_entidad = Column(String(30), nullable=False)  # LINEA o MOTOR
    entidad_id = Column(Integer, nullable=False, index=True)
    accion = Column(String(30), nullable=False)  # CREATE, UPDATE, SOFT_DELETE
    codigo = Column(String(50), nullable=True)
    nombre = Column(String(200), nullable=True)
    tasa_anterior = Column(Numeric(10, 4), nullable=True)
    tasa_nueva = Column(Numeric(10, 4), nullable=True)
    usuario_operador = Column(String(100), nullable=True)
    motivo = Column(String(255), nullable=True)
    ip_origen = Column(String(50), nullable=True)
    cambios_json = Column(JSON, nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AuditoriaSincronizacionPersona(Base):
    """Auditoría de sincronización distribuida de personas (Oracle / CoopYa)."""

    __tablename__ = "auditoria_sincronizacion_personas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    documento = Column(String(20), nullable=False, index=True)
    id_persona_oracle = Column(Integer, nullable=True)
    id_persona_coopya = Column(Integer, nullable=True)
    estado = Column(String(30), nullable=False)  # EXITO, ERROR_ORACLE, DESINC_COOPYA
    accion = Column(String(30), nullable=False, default="ALTA")  # ALTA, ACTUALIZACION
    detalle_error = Column(String(500), nullable=True)
    payload_json = Column(JSON, nullable=True)
    usuario_operador = Column(String(100), nullable=True)
    ip_origen = Column(String(50), nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# Alias para compatibilidad hacia atrás
HistorialCambio = AuditoriaSincronizacionPersona
