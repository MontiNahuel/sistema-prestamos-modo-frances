from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class HistorialCambioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entidad_nombre: str
    entidad_id: str
    accion: str
    usuario_operador: Optional[str] = None
    datos_anteriores: Optional[Dict[str, Any]] = None
    datos_nuevos: Dict[str, Any]
    motivo: Optional[str] = None
    fecha_registro: datetime
