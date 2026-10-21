from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, autoincrement=False)  # Mismo id_persona proveniente de CoopYa
    nombre_completo = Column(String(200), nullable=False)
    documento = Column(String(20), nullable=True, index=True)
    fecha_alta = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_ultima_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relación 1 a N con los préstamos otorgados a este socio
    prestamos = relationship("Prestamo", back_populates="socio")
