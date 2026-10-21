import datetime
from typing import List, Optional, Any, Dict
from app.features.auditoria.model import HistorialCambio
from app.features.auditoria.repository import HistorialCambiosRepository


class HistorialCambiosService:
    """Servicio de dominio para registrar y consultar eventos de auditoría."""

    def __init__(self, repository: HistorialCambiosRepository):
        self.repository = repository

    def registrar_evento(
        self,
        entidad_nombre: str,
        entidad_id: str | int,
        accion: str,
        datos_nuevos: Dict[str, Any],
        datos_anteriores: Optional[Dict[str, Any]] = None,
        usuario_operador: Optional[str] = None,
        motivo: Optional[str] = None
    ) -> HistorialCambio:
        evento = HistorialCambio(
            entidad_nombre=entidad_nombre,
            entidad_id=str(entidad_id),
            accion=accion.upper(),
            usuario_operador=usuario_operador,
            datos_anteriores=datos_anteriores,
            datos_nuevos=datos_nuevos,
            motivo=motivo,
            fecha_registro=datetime.datetime.now(datetime.timezone.utc)
        )
        return self.repository.create(evento)

    def listar(
        self,
        entidad_nombre: Optional[str] = None,
        entidad_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[HistorialCambio]:
        return self.repository.list_filtered(
            entidad_nombre=entidad_nombre,
            entidad_id=entidad_id,
            limit=limit,
            offset=offset
        )
