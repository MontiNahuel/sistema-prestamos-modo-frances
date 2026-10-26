from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class EmpresaOriginante(Base):
    """Empresas habilitadas para originar lotes de cobro bancario (BAPRO, etc.)."""

    __tablename__ = "empresas_originantes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cuit = Column(String(11), unique=True, nullable=False, index=True)
    razon_social = Column(String(100), nullable=False)
    nombre_fantasia = Column(String(50), nullable=True)
    prefijo_archivo = Column(String(50), nullable=False, default="EBT_COOPCREDITOYALTDA")
    descripcion_transaccion = Column(String(10), nullable=False, default="SERVICI014")
    activo = Column(Boolean, default=True, nullable=False)
    predeterminado = Column(Boolean, default=False, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
