from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, BigInteger, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class LineaPrestamo(Base):
    __tablename__ = "lineas_prestamo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300), nullable=True)

    # Motor de fórmula asignado
    motor_id = Column(Integer, ForeignKey("motores_calculo.id"), nullable=False)

    # Parámetros financieros por defecto
    tipo_tasa = Column(String(10), default="TNA", nullable=False) # TNA o TEA
    tasa_default = Column(Numeric(10, 4), nullable=False) # Ej: 0.6000 para 60%
    alicuota_iva = Column(Numeric(6, 4), default=Decimal("0.2100"), nullable=False)
    permite_override_tasa = Column(Boolean, default=True, nullable=False)

    # Límites de Montos (en centavos BIGINT)
    monto_minimo_centavos = Column(BigInteger, default=1000000, nullable=False)    # $10.000,00
    monto_maximo_centavos = Column(BigInteger, default=200000000, nullable=False)  # $2.000.000,00
    monto_paso_centavos = Column(BigInteger, default=100000, nullable=False)       # $1.000,00

    # Límites de Plazos (meses)
    plazo_minimo_meses = Column(Integer, default=1, nullable=False)
    plazo_maximo_meses = Column(Integer, default=60, nullable=False)

    # Reglas de validación contra CoopYa
    requiere_socio_al_dia = Column(Boolean, default=True, nullable=False)

    # Gastos y comisiones
    gasto_otorgamiento_pct = Column(Numeric(6, 4), default=Decimal("0.0000"), nullable=False)
    seguro_vida_mensual_pct = Column(Numeric(6, 4), default=Decimal("0.0000"), nullable=False)

    activo = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relación
    motor = relationship("MotorCalculo")
