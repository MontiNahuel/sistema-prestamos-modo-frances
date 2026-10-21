import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, JSON
from app.core.database import Base


class HistorialCambio(Base):
    __tablename__ = "historial_cambios"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entidad_nombre = Column(String(50), nullable=False, index=True)
    entidad_id = Column(String(50), nullable=False, index=True)
    accion = Column(String(20), nullable=False)  # CREATE, UPDATE, SOFT_DELETE, CANCEL, PAGAR_CUOTA
    usuario_operador = Column(String(100), nullable=True)
    datos_anteriores = Column(JSON, nullable=True)
    datos_nuevos = Column(JSON, nullable=False)
    motivo = Column(String(255), nullable=True)
    fecha_registro = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
