from datetime import datetime, timezone
from typing import Optional
from app.features.socios.model import Socio
from app.features.socios.repository import SocioRepository


class SocioService:
    """Orquesta el registro y actualización local de la ficha sombra de socios."""

    def __init__(self, repository: SocioRepository):
        self.repository = repository

    def obtener_por_id(self, persona_id: int) -> Optional[Socio]:
        return self.repository.get_by_id(persona_id)

    def sincronizar_socio_titular(
        self,
        persona_id: int,
        nombre_completo: str,
        documento: Optional[str] = None
    ) -> Socio:
        """
        Registra o actualiza la ficha sombra del socio al momento de otorgarle un préstamo.
        Garantiza integridad referencial y evita registros huérfanos.
        """
        socio = self.repository.get_by_id(persona_id)
        ahora = datetime.now(timezone.utc)
        nombre_limpio = nombre_completo.strip()
        doc_limpio = documento.strip() if documento else None

        if not socio:
            socio = Socio(
                id=persona_id,
                nombre_completo=nombre_limpio,
                documento=doc_limpio,
                fecha_alta=ahora,
                fecha_ultima_actualizacion=ahora
            )
            return self.repository.create(socio)
        else:
            socio.nombre_completo = nombre_limpio
            if doc_limpio:
                socio.documento = doc_limpio
            socio.fecha_ultima_actualizacion = ahora
            return self.repository.update(socio)
