import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class CuotaSocialConfig(Base):
    """Configuración global del valor por defecto de la Cuota Social."""

    __tablename__ = "cuotas_sociales_config"

    id = Column(Integer, primary_key=True, default=1)
    valor_default_centavos = Column(BigInteger, default=550000, nullable=False)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    actualizado_por = Column(String(100), nullable=True)


class CuotaSocial(Base):
    """Registro mensual de Cuota Social cobrada aparte de los préstamos hasta la baja del socio."""

    __tablename__ = "cuotas_sociales"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False, index=True)
    prestamo_id = Column(String(36), ForeignKey("prestamos.id"), nullable=True, index=True)
    periodo = Column(String(7), nullable=False, index=True)  # Formato YYYY-MM
    fecha_vencimiento = Column(Date, nullable=False, index=True)
    valor_centavos = Column(BigInteger, nullable=False)
    monto_pagado_centavos = Column(BigInteger, default=0, nullable=False)
    estado = Column(String(20), default="PENDIENTE", nullable=False)  # PENDIENTE, PRESENTADA, PAGADA, ANULADA
    fecha_pago = Column(DateTime, nullable=True)
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)

    socio = relationship("Socio", back_populates="cuotas_sociales")
    prestamo = relationship("Prestamo", back_populates="cuotas_sociales")
    respuestas_bancarias = relationship("RespuestaBancariaDetalle", back_populates="cuota_social")

    __table_args__ = (
        UniqueConstraint("socio_id", "periodo", name="uq_cuotas_sociales_socio_periodo"),
    )
