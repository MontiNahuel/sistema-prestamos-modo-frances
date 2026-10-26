from typing import List, Optional
from sqlalchemy.orm import Session
from app.features.empresas.model import EmpresaOriginante


class EmpresaOriginanteRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar(self, solo_activas: bool = False) -> List[EmpresaOriginante]:
        q = self.db.query(EmpresaOriginante)
        if solo_activas:
            q = q.filter(EmpresaOriginante.activo == True)
        return q.order_by(EmpresaOriginante.predeterminado.desc(), EmpresaOriginante.razon_social.asc()).all()

    def obtener_por_id(self, empresa_id: int) -> Optional[EmpresaOriginante]:
        return self.db.query(EmpresaOriginante).filter_by(id=empresa_id).first()

    def obtener_por_cuit(self, cuit: str) -> Optional[EmpresaOriginante]:
        return self.db.query(EmpresaOriginante).filter_by(cuit=cuit.strip()).first()

    def obtener_predeterminada(self) -> Optional[EmpresaOriginante]:
        return (
            self.db.query(EmpresaOriginante)
            .filter_by(activo=True, predeterminado=True)
            .first()
            or self.db.query(EmpresaOriginante).filter_by(activo=True).first()
        )

    def crear(self, empresa: EmpresaOriginante) -> EmpresaOriginante:
        if empresa.predeterminado:
            self._desmarcar_predeterminadas()
        self.db.add(empresa)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def actualizar(self, empresa: EmpresaOriginante, datos: dict) -> EmpresaOriginante:
        if datos.get("predeterminado") is True:
            self._desmarcar_predeterminadas(ignorar_id=empresa.id)
        for key, value in datos.items():
            if hasattr(empresa, key) and value is not None:
                setattr(empresa, key, value)
        self.db.commit()
        self.db.refresh(empresa)
        return empresa

    def _desmarcar_predeterminadas(self, ignorar_id: Optional[int] = None):
        q = self.db.query(EmpresaOriginante).filter(EmpresaOriginante.predeterminado == True)
        if ignorar_id:
            q = q.filter(EmpresaOriginante.id != ignorar_id)
        for e in q.all():
            e.predeterminado = False
