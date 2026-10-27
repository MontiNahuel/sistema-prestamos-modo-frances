from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.features.presentaciones_bna.model import (
    PresentacionBnaArchivo,
    PresentacionBnaAuditoria,
)


class PresentacionBnaRepository:
    """Repositorio de persistencia para archivos y auditorías de Banco Nación."""

    def __init__(self, db: Session):
        self.db = db

    def crear_archivo(self, archivo: PresentacionBnaArchivo) -> PresentacionBnaArchivo:
        self.db.add(archivo)
        self.db.commit()
        self.db.refresh(archivo)
        return archivo

    def insertar_detalles(
        self, detalles: List[PresentacionBnaAuditoria]
    ) -> List[PresentacionBnaAuditoria]:
        self.db.add_all(detalles)
        self.db.commit()
        return detalles

    def obtener_archivo_por_id(self, archivo_id: int) -> Optional[PresentacionBnaArchivo]:
        return self.db.query(PresentacionBnaArchivo).filter_by(id=archivo_id).first()

    def obtener_archivo_por_nro(self, nro_archivo: int) -> Optional[PresentacionBnaArchivo]:
        return self.db.query(PresentacionBnaArchivo).filter_by(nro_archivo=nro_archivo).first()

    def obtener_proximo_nro_archivo_local(self) -> int:
        max_nro = self.db.query(func.max(PresentacionBnaArchivo.nro_archivo)).scalar()
        if not max_nro or max_nro < 1930:
            return 1935
        return max_nro + 1

    def validar_nro_archivo_disponible(self, nro_archivo: int) -> bool:
        return self.db.query(PresentacionBnaArchivo.id).filter_by(nro_archivo=nro_archivo).first() is None

    def listar_archivos(
        self,
        nro_archivo: Optional[int] = None,
        estado: Optional[str] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[PresentacionBnaArchivo], int]:
        q = self.db.query(PresentacionBnaArchivo)
        if nro_archivo is not None:
            q = q.filter(PresentacionBnaArchivo.nro_archivo == nro_archivo)
        if estado:
            q = q.filter(PresentacionBnaArchivo.estado == estado)
        if fecha_desde:
            q = q.filter(PresentacionBnaArchivo.fecha_generacion >= fecha_desde)
        if fecha_hasta:
            q = q.filter(PresentacionBnaArchivo.fecha_generacion <= fecha_hasta)

        total = q.count()
        archivos = (
            q.order_by(PresentacionBnaArchivo.nro_archivo.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return archivos, total

    def obtener_detalles_por_archivo(
        self, archivo_id: int
    ) -> List[PresentacionBnaAuditoria]:
        return (
            self.db.query(PresentacionBnaAuditoria)
            .filter_by(presentacion_archivo_id=archivo_id)
            .order_by(PresentacionBnaAuditoria.numero_operacion.asc())
            .all()
        )

    def buscar_detalle_por_concepto(
        self, archivo_id: int, concepto_debito: str
    ) -> Optional[PresentacionBnaAuditoria]:
        return (
            self.db.query(PresentacionBnaAuditoria)
            .filter_by(presentacion_archivo_id=archivo_id, concepto_debito=concepto_debito)
            .first()
        )

    def buscar_detalle_por_num_op(
        self, archivo_id: int, num_op: int
    ) -> Optional[PresentacionBnaAuditoria]:
        return (
            self.db.query(PresentacionBnaAuditoria)
            .filter_by(presentacion_archivo_id=archivo_id, numero_operacion=num_op)
            .first()
        )
