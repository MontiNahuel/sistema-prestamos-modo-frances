import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Integer, BigInteger, Numeric, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class TasaConfig(Base):
    __tablename__ = "tasas_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    tna_default = Column(Numeric(10, 4), nullable=False) # Las tasas siguen siendo porcentajes
    alicuota_iva_default = Column(Numeric(6, 4), default=Decimal("0.2100"), nullable=False)
    plazo_min_meses = Column(Integer, default=1, nullable=False)
    plazo_max_meses = Column(Integer, default=72, nullable=False)
    activa = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)


class Prestamo(Base):
    __tablename__ = "prestamos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    persona_id = Column(Integer, nullable=False, index=True)
    persona_nombre = Column(String(200), nullable=True)
    persona_doc = Column(String(20), nullable=True)
    
    # Línea y motor asociados (opcional para trazabilidad)
    linea_id = Column(Integer, nullable=True)
    linea_nombre = Column(String(100), nullable=True)
    motor_nombre = Column(String(100), nullable=True)

    # Todos los importes monetarios en CENTAVOS (BigInteger)
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
    
    estado = Column(String(20), default="ACTIVO", nullable=False) # ACTIVO, FINALIZADO, CANCELADO, MORA
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(String(500), nullable=True)

    cuotas = relationship("Cuota", back_populates="prestamo", cascade="all, delete-orphan", order_by="Cuota.numero_cuota")


class Cuota(Base):
    __tablename__ = "cuotas"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prestamo_id = Column(String(36), ForeignKey("prestamos.id"), nullable=False, index=True)
    numero_cuota = Column(Integer, nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)
    
    # Todos los importes monetarios en CENTAVOS (BigInteger)
    saldo_inicial_centavos = Column(BigInteger, nullable=False)
    capital_centavos = Column(BigInteger, nullable=False)
    interes_centavos = Column(BigInteger, nullable=False)
    iva_interes_centavos = Column(BigInteger, nullable=False)
    cuota_pura_centavos = Column(BigInteger, nullable=False)
    cuota_total_centavos = Column(BigInteger, nullable=False)
    saldo_final_centavos = Column(BigInteger, nullable=False)
    
    estado = Column(String(20), default="PENDIENTE", nullable=False) # PENDIENTE, PAGADA, VENCIDA
    fecha_pago = Column(DateTime, nullable=True)
    monto_pagado_centavos = Column(BigInteger, default=0, nullable=False)

    prestamo = relationship("Prestamo", back_populates="cuotas")
