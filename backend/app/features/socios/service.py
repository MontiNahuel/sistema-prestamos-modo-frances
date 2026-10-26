from datetime import datetime, timezone
from typing import Optional
from app.features.socios.model import Socio, MedioDePago, TipoBanco
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
        documento: Optional[str] = None,
        cbu: Optional[str] = None,
        banco_id: Optional[int] = None
    ) -> Socio:
        """
        Registra o actualiza la ficha sombra del socio al momento de otorgarle un préstamo.
        Garantiza integridad referencial y persiste su medio de pago (CBU).
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
            socio = self.repository.create(socio)
        else:
            socio.nombre_completo = nombre_limpio
            if doc_limpio:
                socio.documento = doc_limpio
            socio.fecha_ultima_actualizacion = ahora
            socio = self.repository.update(socio)

        # Sincronizar CBU en medios_de_pago si fue provisto
        if cbu and cbu.strip():
            cbu_limpio = cbu.strip()
            b_id = banco_id
            if not b_id and cbu_limpio.startswith("014"):
                banco = self.repository.db.query(TipoBanco).filter_by(codigo="00014").first()
                b_id = banco.id if banco else 5

            existente = (
                self.repository.db.query(MedioDePago)
                .filter(MedioDePago.socio_id == persona_id, MedioDePago.valor == cbu_limpio)
                .first()
            )
            if not existente:
                self.repository.add_medio_de_pago(
                    socio_id=persona_id,
                    valor=cbu_limpio,
                    banco_id=b_id,
                    tipo=2,
                    predeterminado=True,
                    titular_verificado=True
                )
            elif not existente.predeterminado:
                self.repository.db.query(MedioDePago).filter(
                    MedioDePago.socio_id == persona_id
                ).update({"predeterminado": False})
                existente.predeterminado = True
                if b_id and not existente.banco_id:
                    existente.banco_id = b_id
                self.repository.db.flush()

        return socio
