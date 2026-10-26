from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Set, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.features.presentaciones_bapro.model import (
    PresentacionBaproArchivo,
    PresentacionBaproAuditoria,
    DniExcluidoBapro,
    PresentacionFiltroMasivoBapro,
)


class PresentacionBaproRepository:
    """Repositorio para archivos y auditorías de presentaciones Banco Provincia."""

    def __init__(self, db: Session):
        self.db = db

    def crear_archivo(self, archivo: PresentacionBaproArchivo) -> PresentacionBaproArchivo:
        self.db.add(archivo)
        self.db.commit()
        self.db.refresh(archivo)
        return archivo

    def insertar_detalles(
        self, detalles: List[PresentacionBaproAuditoria]
    ) -> List[PresentacionBaproAuditoria]:
        self.db.add_all(detalles)
        self.db.commit()
        return detalles

    def obtener_archivo_por_id(self, archivo_id: int) -> Optional[PresentacionBaproArchivo]:
        return self.db.query(PresentacionBaproArchivo).filter_by(id=archivo_id).first()

    def obtener_archivo_por_nro(self, nro_archivo: int) -> Optional[PresentacionBaproArchivo]:
        return self.db.query(PresentacionBaproArchivo).filter_by(nro_archivo=nro_archivo).first()

    def obtener_proximo_nro_archivo_local(self) -> int:
        max_nro = self.db.query(func.max(PresentacionBaproArchivo.nro_archivo)).scalar()
        return (max_nro or 0) + 1

    def listar_archivos(
        self,
        nro_archivo: Optional[int] = None,
        estado: Optional[str] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[PresentacionBaproArchivo], int]:
        q = self.db.query(PresentacionBaproArchivo)
        if nro_archivo is not None:
            q = q.filter(PresentacionBaproArchivo.nro_archivo == nro_archivo)
        if estado:
            q = q.filter(PresentacionBaproArchivo.estado == estado)
        if fecha_desde:
            q = q.filter(PresentacionBaproArchivo.fecha_generacion >= fecha_desde)
        if fecha_hasta:
            q = q.filter(PresentacionBaproArchivo.fecha_generacion <= fecha_hasta)

        total = q.count()
        archivos = (
            q.order_by(PresentacionBaproArchivo.nro_archivo.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return archivos, total

    def actualizar_estado(self, archivo_id: int, estado: str) -> Optional[PresentacionBaproArchivo]:
        archivo = self.obtener_archivo_por_id(archivo_id)
        if archivo:
            archivo.estado = estado
            self.db.commit()
            self.db.refresh(archivo)
        return archivo


class DniExcluidoBaproRepository:
    """Repositorio para exclusión administrativa de DNIs en BAPRO."""

    def __init__(self, db: Session):
        self.db = db

    def agregar(self, dni: str, motivo: Optional[str] = None) -> DniExcluidoBapro:
        dni_limpio = dni.strip()
        existente = self.db.query(DniExcluidoBapro).filter_by(dni=dni_limpio).first()
        if existente:
            existente.motivo = motivo
            existente.fecha = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existente)
            return existente

        nuevo = DniExcluidoBapro(dni=dni_limpio, motivo=motivo, fecha=datetime.utcnow())
        self.db.add(nuevo)
        self.db.commit()
        self.db.refresh(nuevo)
        return nuevo

    def eliminar(self, dni: str) -> bool:
        dni_limpio = dni.strip()
        eliminados = (
            self.db.query(DniExcluidoBapro)
            .filter_by(dni=dni_limpio)
            .delete()
        )
        self.db.commit()
        return eliminados > 0

    def es_excluido(self, dni: str) -> bool:
        return (
            self.db.query(DniExcluidoBapro)
            .filter_by(dni=dni.strip())
            .first()
            is not None
        )

    def obtener_todos_dnis(self) -> Set[str]:
        rows = self.db.query(DniExcluidoBapro.dni).all()
        return {r[0] for r in rows}

    def listar(self, skip: int = 0, limit: int = 100) -> List[DniExcluidoBapro]:
        return (
            self.db.query(DniExcluidoBapro)
            .order_by(DniExcluidoBapro.fecha.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


class PresentacionFiltroMasivoBaproRepository:
    """Repositorio para listas masivas/temporales de selección de socios."""

    def __init__(self, db: Session):
        self.db = db

    def guardar_seleccion(self, usuario_id: int, id_personas: List[int]) -> int:
        self.limpiar_usuario(usuario_id)
        ahora = datetime.utcnow()
        registros = [
            PresentacionFiltroMasivoBapro(
                usuario_id=usuario_id,
                id_persona=pid,
                fecha=ahora,
            )
            for pid in set(id_personas)
        ]
        self.db.add_all(registros)
        self.db.commit()
        return len(registros)

    def limpiar_usuario(self, usuario_id: int) -> int:
        eliminados = (
            self.db.query(PresentacionFiltroMasivoBapro)
            .filter_by(usuario_id=usuario_id)
            .delete()
        )
        self.db.commit()
        return eliminados

    def obtener_ids_personas(self, usuario_id: int) -> List[int]:
        rows = (
            self.db.query(PresentacionFiltroMasivoBapro.id_persona)
            .filter_by(usuario_id=usuario_id)
            .all()
        )
        return [r[0] for r in rows]
