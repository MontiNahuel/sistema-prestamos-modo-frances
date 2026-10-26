from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, autoincrement=False)  # id_persona proveniente de CoopYa / Oracle
    nombre_completo = Column(String(200), nullable=False)
    documento = Column(String(20), nullable=True, index=True)
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_ultima_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    prestamos = relationship("Prestamo", back_populates="socio")
    medios_de_pago = relationship("MedioDePago", back_populates="socio", cascade="all, delete-orphan")


class TipoBanco(Base):
    """Catálogo oficial de bancos espejado del monolito CoopYa."""
    __tablename__ = "tipo_bancos"

    id = Column(Integer, primary_key=True, autoincrement=False)
    nombre = Column(String(150), nullable=False)
    codigo = Column(String(20), nullable=False)  # 5 dígitos (ej: 00014, 00017)
    activo = Column(Boolean, default=True, nullable=False)

    medios_de_pago = relationship("MedioDePago", back_populates="banco")


class MedioDePago(Base):
    """Medios de pago y CBUs asociados a cada socio, espejado del monolito CoopYa."""
    __tablename__ = "medios_de_pago"

    id = Column(Integer, primary_key=True, autoincrement=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False, index=True)
    tipo = Column(Integer, default=2, nullable=False)  # 1: Descuento, 2: CBU, 3: Tarjeta, 4: Otro
    valor = Column(String(100), nullable=False, index=True)  # CBU de 22 dígitos o Alias
    banco_id = Column(Integer, ForeignKey("tipo_bancos.id"), nullable=True)
    predeterminado = Column(Boolean, default=True, nullable=False)
    titular_verificado = Column(Boolean, default=False, nullable=False)
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)

    socio = relationship("Socio", back_populates="medios_de_pago")
    banco = relationship("TipoBanco", back_populates="medios_de_pago")
