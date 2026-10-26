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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.features.prestamos.model import Cuota


class PresentacionBaproArchivo(Base):
    """Espejo de dbo.PresentacionBaproArchivos + métricas de lote."""

    __tablename__ = "presentaciones_bapro_archivos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nro_archivo = Column(Integer, nullable=False, unique=True, index=True)
    ruta = Column(String(500), nullable=False)
    tipo = Column(String(20), nullable=False, default="BAPRO")  # 'BAPRO' o 'RESPUESTA'
    fecha_generacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    total_registros = Column(Integer, nullable=False, default=0)
    total_monto = Column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    usuario_id = Column(Integer, nullable=True)
    estado = Column(String(30), nullable=False, default="GENERADO")  # GENERADO, ENVIADO, RENDIDO
    nombre_archivo = Column(String(200), nullable=False)

    # Relación con el detalle de auditoría
    detalles = relationship(
        "PresentacionBaproAuditoria",
        back_populates="archivo",
        cascade="all, delete-orphan",
        order_by="PresentacionBaproAuditoria.numero_operacion",
    )


class PresentacionBaproAuditoria(Base):
    """Espejo estricto de dbo.PresentacionBaproAuditoria (layout posicional BAPRO)."""

    __tablename__ = "presentaciones_bapro_auditoria"

    id = Column(Integer, primary_key=True, autoincrement=True)
    presentacion_archivo_id = Column(
        Integer,
        ForeignKey("presentaciones_bapro_archivos.id"),
        nullable=False,
        index=True,
    )
    cuota_id = Column(String(36), ForeignKey("cuotas.id"), nullable=True, index=True)
    id_persona = Column(Integer, nullable=False, index=True)
    nro_archivo = Column(Integer, nullable=False, index=True)
    numero_operacion = Column(Integer, nullable=False)
    codigo_interno = Column(String(2), nullable=False, default="71")
    fecha_vencimiento = Column(String(8), nullable=False)  # DDMMAAAA
    identificador_cliente = Column(String(22), nullable=False)
    tipo_dato = Column(String(1), nullable=False, default="P")
    bloque1_cbu = Column(String(8), nullable=False)
    bloque2_cbu = Column(String(14), nullable=False)
    importe = Column(String(10), nullable=False)  # En centavos con ceros a la izquierda
    monto_pesos = Column(Numeric(18, 2), nullable=False)
    cuit_empresa = Column(String(11), nullable=False, default="30690754386")
    descripcion_transaccion = Column(String(10), nullable=False, default="SERVICI014")
    referencia_debito = Column(String(15), nullable=False)
    nuevo_identificador_cliente = Column(String(22), nullable=True)
    codigo_respuesta = Column(String(3), nullable=True)
    nombre_empresa = Column(String(16), nullable=False, default="COOPCREDITOYALTD")
    comunicacion_entes = Column(String(3), nullable=True)
    tipo_exportacion = Column(String(50), nullable=True, default="Seleccionados")
    tipo_importe = Column(String(50), nullable=True, default="Prestamo")
    nombre_archivo = Column(String(200), nullable=False)
    fecha_generacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = Column(Integer, nullable=True)
    fecha_respuesta = Column(DateTime, nullable=True)
    id_corrida = Column(String(36), nullable=True)  # UUID
    sumar_mora = Column(Boolean, nullable=False, default=False)
    coopya_auditoria_id = Column(Integer, nullable=True)

    # Relaciones
    archivo = relationship("PresentacionBaproArchivo", back_populates="detalles")
    cuota = relationship("Cuota")


class DniExcluidoBapro(Base):
    """Espejo de dbo.DniExcluidosEnPresentacionesBapro (lista negra de débitos)."""

    __tablename__ = "dni_excluidos_bapro"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dni = Column(String(20), nullable=False, unique=True, index=True)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow)
    motivo = Column(String(250), nullable=True)


class PresentacionFiltroMasivoBapro(Base):
    """Espejo de dbo.PresentacionFiltroMasivoBapro (selección manual/masiva)."""

    __tablename__ = "presentacion_filtro_masivo_bapro"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_persona = Column(Integer, nullable=False, index=True)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = Column(Integer, nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "id_persona",
            "fecha",
            name="uq_presentacion_filtro_masivo_bapro",
        ),
    )
