import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.features.prestamos.model import Cuota


class PresentacionBnaArchivo(Base):
    """Lote de presentación de débitos automáticos Banco de la Nación Argentina."""

    __tablename__ = "presentaciones_bna_archivos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nro_archivo = Column(Integer, nullable=False, unique=True, index=True)
    ruta = Column(String(500), nullable=False)
    tipo = Column(String(20), nullable=False, default="BNA")  # 'BNA' o 'RESPUESTA'
    fecha_generacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    total_registros = Column(Integer, nullable=False, default=0)
    total_monto = Column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    usuario_id = Column(Integer, nullable=True)
    estado = Column(String(30), nullable=False, default="GENERADO")  # GENERADO, ENVIADO, RENDIDO
    nombre_archivo = Column(String(200), nullable=False)

    detalles = relationship(
        "PresentacionBnaAuditoria",
        back_populates="archivo",
        cascade="all, delete-orphan",
        order_by="PresentacionBnaAuditoria.numero_operacion",
    )


class PresentacionBnaAuditoria(Base):
    """Detalle de auditoría de cada renglón presentado a Banco Nación (Layout 128 chars)."""

    __tablename__ = "presentaciones_bna_auditoria"

    id = Column(Integer, primary_key=True, autoincrement=True)
    presentacion_archivo_id = Column(
        Integer,
        ForeignKey("presentaciones_bna_archivos.id"),
        nullable=False,
        index=True,
    )
    cuota_id = Column(String(36), ForeignKey("cuotas.id"), nullable=True, index=True)
    id_persona = Column(Integer, nullable=False, index=True)
    nro_archivo = Column(Integer, nullable=False, index=True)
    numero_operacion = Column(Integer, nullable=False)
    sucursal_cuenta_cliente = Column(String(4), nullable=False)
    sistema_cuenta = Column(String(2), nullable=False, default="CA")
    nro_cuenta_cliente = Column(String(11), nullable=False)
    importe = Column(String(15), nullable=False)  # 15 caracteres centavos
    monto_pesos = Column(Numeric(18, 2), nullable=False)
    concepto_debito = Column(String(10), nullable=False)  # '{NroArchivo}-{NumOp}'
    codigo_respuesta = Column(String(5), nullable=True)  # '0', '9', '7'
    descripcion_rechazo = Column(String(100), nullable=True)  # Texto literal BNA
    nombre_archivo = Column(String(200), nullable=False)
    fecha_generacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = Column(Integer, nullable=True)
    fecha_respuesta = Column(DateTime, nullable=True)

    archivo = relationship("PresentacionBnaArchivo", back_populates="detalles")
    cuota = relationship("Cuota")
