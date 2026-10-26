from typing import Optional, List
from sqlalchemy.orm import Session
from app.features.socios.model import Socio, TipoBanco, MedioDePago


class SocioRepository:
    """Encapsula operaciones de acceso a datos para socios, bancos y medios de pago."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, persona_id: int) -> Optional[Socio]:
        return self.db.query(Socio).filter(Socio.id == persona_id).first()

    def create(self, socio: Socio) -> Socio:
        self.db.add(socio)
        self.db.flush()
        return socio

    def update(self, socio: Socio) -> Socio:
        self.db.flush()
        return socio

    def get_banco_by_id(self, banco_id: int) -> Optional[TipoBanco]:
        return self.db.query(TipoBanco).filter(TipoBanco.id == banco_id).first()

    def get_banco_by_codigo(self, codigo: str) -> Optional[TipoBanco]:
        return self.db.query(TipoBanco).filter(TipoBanco.codigo.endswith(codigo)).first()

    def get_banco_by_nombre(self, nombre: str) -> Optional[TipoBanco]:
        return self.db.query(TipoBanco).filter(TipoBanco.nombre.ilike(f"%{nombre}%")).first()

    def list_bancos(self) -> List[TipoBanco]:
        return self.db.query(TipoBanco).filter(TipoBanco.activo == True).order_by(TipoBanco.nombre).all()

    def add_medio_de_pago(
        self,
        socio_id: int,
        valor: str,
        banco_id: Optional[int] = None,
        tipo: int = 2,
        predeterminado: bool = True,
        titular_verificado: bool = False
    ) -> MedioDePago:
        # Desmarcar anteriores predeterminados si este lo es
        if predeterminado:
            self.db.query(MedioDePago).filter(
                MedioDePago.socio_id == socio_id
            ).update({"predeterminado": False})

        medio = MedioDePago(
            socio_id=socio_id,
            tipo=tipo,
            valor=valor,
            banco_id=banco_id,
            predeterminado=predeterminado,
            titular_verificado=titular_verificado
        )
        self.db.add(medio)
        self.db.flush()
        return medio
