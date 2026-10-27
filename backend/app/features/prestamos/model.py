import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Integer, BigInteger, Numeric, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Prestamo(Base):
    __tablename__ = "prestamos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    persona_id = Column(Integer, ForeignKey("socios.id"), nullable=False, index=True)
    persona_nombre = Column(String(200), nullable=True)  # Snapshot contractual del socio
    persona_doc = Column(String(20), nullable=True)     # Snapshot contractual del socio

    # Importes monetarios en CENTAVOS (BigInteger)
    monto_solicitado_centavos = Column(BigInteger, nullable=False)
    plazo_meses = Column(Integer, nullable=False)
    tna_pactada = Column(Numeric(10, 4), nullable=False)
    tem_pactada = Column(Numeric(10, 6), nullable=False)
    alicuota_iva = Column(Numeric(6, 4), default=Decimal("0.2100"), nullable=False)

    total_capital_centavos = Column(BigInteger, nullable=False)
    total_interes_centavos = Column(BigInteger, nullable=False)
    total_iva_centavos = Column(BigInteger, nullable=False)
    total_a_pagar_centavos = Column(BigInteger, nullable=False)
    saldo_deudor_actual_centavos = Column(BigInteger, nullable=False)

    estado = Column(String(20), default="ACTIVO", nullable=False)  # ACTIVO, FINALIZADO, CANCELADO, MORA
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(String(500), nullable=True)

    # Relaciones
    socio = relationship("Socio", back_populates="prestamos")
    cuotas = relationship("Cuota", back_populates="prestamo", cascade="all, delete-orphan", order_by="Cuota.numero_cuota")
    linea_snapshot = relationship("PrestamoLineaSnapshot", uselist=False, back_populates="prestamo", cascade="all, delete-orphan")


class PrestamoLineaSnapshot(Base):
    """Evidencia legal y contractual inmutable de la línea y motor al momento de otorgar."""
    __tablename__ = "prestamo_linea_snapshot"

    prestamo_id = Column(String(36), ForeignKey("prestamos.id", ondelete="CASCADE"), primary_key=True)
    linea_id = Column(Integer, ForeignKey("lineas_prestamo.id"), nullable=False, index=True)
    linea_codigo = Column(String(50), nullable=False)
    linea_nombre = Column(String(100), nullable=False)
    motor_id = Column(Integer, ForeignKey("motores_calculo.id"), nullable=False)
    motor_nombre = Column(String(100), nullable=False)
    tasa_catalogo_vigente = Column(Numeric(10, 4), nullable=False)
    alicuota_iva = Column(Numeric(6, 4), nullable=False)
    monto_minimo_centavos = Column(BigInteger, nullable=False)
    monto_maximo_centavos = Column(BigInteger, nullable=False)
    plazo_minimo_meses = Column(Integer, nullable=False)
    plazo_maximo_meses = Column(Integer, nullable=False)
    reglas_motor_json = Column(JSON, nullable=False)
    fecha_snapshot = Column(DateTime, default=datetime.utcnow, nullable=False)

    prestamo = relationship("Prestamo", back_populates="linea_snapshot")
    linea = relationship("LineaPrestamo")
    motor = relationship("MotorCalculo")


class Cuota(Base):
    __tablename__ = "cuotas"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prestamo_id = Column(String(36), ForeignKey("prestamos.id"), nullable=False, index=True)
    numero_cuota = Column(Integer, nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)

    saldo_inicial_centavos = Column(BigInteger, nullable=False)
    capital_centavos = Column(BigInteger, nullable=False)
    interes_centavos = Column(BigInteger, nullable=False)
    iva_interes_centavos = Column(BigInteger, nullable=False)
    cuota_pura_centavos = Column(BigInteger, nullable=False)
    cuota_total_centavos = Column(BigInteger, nullable=False)
    saldo_final_centavos = Column(BigInteger, nullable=False)

    estado = Column(String(20), default="PENDIENTE", nullable=False)  # PENDIENTE, PAGADA, VENCIDA
    fecha_pago = Column(DateTime, nullable=True)
    monto_pagado_centavos = Column(BigInteger, default=0, nullable=False)

    # Identificadores de sincronización con el Monolito (CoopYa)
    movimiento_coopya_id = Column(Integer, nullable=True)
    desglose_coopya_id = Column(Integer, nullable=True)

    prestamo = relationship("Prestamo", back_populates="cuotas")
    respuestas_bancarias = relationship("RespuestaBancariaDetalle", back_populates="cuota")
