from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class MotorCalculo(Base):
    __tablename__ = "motores_calculo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300), nullable=True)

    # Variables de la estrategia matemática
    convencion_tasa = Column(String(50), default="TNA_PROPORCIONAL", nullable=False)
    base_dias = Column(String(50), default="COMERCIAL_30_360", nullable=False)
    modalidad_iva = Column(String(50), default="IVA_DECRECIENTE", nullable=False)
    ajuste_residual = Column(String(50), default="ULTIMA_CUOTA", nullable=False)

    activo = Column(Boolean, default=True, nullable=False)
    es_sistema = Column(Boolean, default=False, nullable=False) # Si es True, no se puede borrar
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
