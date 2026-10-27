import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Date, ForeignKey, JSON, UniqueConstraint, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base


class RespuestaBancaria(Base):
    __tablename__ = 'respuestas_bancarias'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    banco = Column(String(10), nullable=False)
    lote = Column(Integer, nullable=False)
    nombre_archivo = Column(String(200), nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    fecha_cobro = Column(Date, nullable=False)
    fecha_carga = Column(DateTime, nullable=False, default=datetime.utcnow)
    operador = Column(String(100), nullable=False)
    resumen = Column(JSON, nullable=False)
    # Misma transacción que la imputación. NULL solamente para cargas históricas.
    archivo_original = Column(LargeBinary, nullable=True)
    detalles = relationship('RespuestaBancariaDetalle', back_populates='carga', order_by='RespuestaBancariaDetalle.linea')


class RespuestaBancariaDetalle(Base):
    __tablename__ = 'respuestas_bancarias_detalle'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    carga_id = Column(String(36), ForeignKey('respuestas_bancarias.id'), nullable=False, index=True)
    banco = Column(String(10), nullable=False)
    clave_operacion = Column(String(64), nullable=False)
    huella_respuesta = Column(String(64), nullable=False)
    linea = Column(Integer, nullable=False)
    cuota_id = Column(String(36), ForeignKey('cuotas.id'), nullable=False, index=True)
    referencia = Column(String(100), nullable=False)
    codigo = Column(String(10), nullable=False)
    descripcion = Column(String(250), nullable=False)
    importe_centavos = Column(BigInteger, nullable=False)
    cobrado_centavos = Column(BigInteger, nullable=False)
    capital_centavos = Column(BigInteger, nullable=False)
    interes_centavos = Column(BigInteger, nullable=False)
    iva_centavos = Column(BigInteger, nullable=False)
    saldo_cuota_centavos = Column(BigInteger, nullable=False)
    estado_cuota = Column(String(20), nullable=False)
    carga = relationship('RespuestaBancaria', back_populates='detalles')
    cuota = relationship('Cuota', back_populates='respuestas_bancarias')
    __table_args__ = (UniqueConstraint('banco', 'clave_operacion', name='uq_respuesta_operacion'),)
