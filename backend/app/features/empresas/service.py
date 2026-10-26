from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.features.empresas.model import EmpresaOriginante
from app.features.empresas.repository import EmpresaOriginanteRepository
from app.features.empresas.schemas import EmpresaOriginanteCreate, EmpresaOriginanteUpdate


class EmpresaOriginanteService:
    def __init__(self, db: Session):
        self.repo = EmpresaOriginanteRepository(db)

    def listar(self, solo_activas: bool = False) -> List[EmpresaOriginante]:
        return self.repo.listar(solo_activas=solo_activas)

    def obtener_por_id(self, empresa_id: int) -> EmpresaOriginante:
        empresa = self.repo.obtener_por_id(empresa_id)
        if not empresa:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa originante no encontrada")
        return empresa

    def crear(self, dto: EmpresaOriginanteCreate) -> EmpresaOriginante:
        cuit_limpio = dto.cuit.strip()
        if not cuit_limpio.isdigit() or len(cuit_limpio) != 11:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El CUIT debe contener exactamente 11 dígitos numéricos")
        if self.repo.obtener_por_cuit(cuit_limpio):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe una empresa registrada con el CUIT {cuit_limpio}")

        nueva = EmpresaOriginante(
            cuit=cuit_limpio,
            razon_social=dto.razon_social.strip().upper(),
            nombre_fantasia=dto.nombre_fantasia.strip() if dto.nombre_fantasia else None,
            prefijo_archivo=dto.prefijo_archivo.strip().upper(),
            descripcion_transaccion=dto.descripcion_transaccion.strip().upper()[:10],
            activo=dto.activo,
            predeterminado=dto.predeterminado,
        )
        return self.repo.crear(nueva)

    def actualizar(self, empresa_id: int, dto: EmpresaOriginanteUpdate) -> EmpresaOriginante:
        empresa = self.obtener_por_id(empresa_id)
        datos = dto.model_dump(exclude_unset=True)
        if "cuit" in datos and datos["cuit"]:
            cuit_limpio = datos["cuit"].strip()
            if not cuit_limpio.isdigit() or len(cuit_limpio) != 11:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El CUIT debe contener 11 dígitos")
            existente = self.repo.obtener_por_cuit(cuit_limpio)
            if existente and existente.id != empresa_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe otra empresa con ese CUIT")
            datos["cuit"] = cuit_limpio

        if "razon_social" in datos and datos["razon_social"]:
            datos["razon_social"] = datos["razon_social"].strip().upper()
        if "prefijo_archivo" in datos and datos["prefijo_archivo"]:
            datos["prefijo_archivo"] = datos["prefijo_archivo"].strip().upper()

        return self.repo.actualizar(empresa, datos)

    def eliminar(self, empresa_id: int) -> bool:
        empresa = self.obtener_por_id(empresa_id)
        # Soft-delete: desactiva
        self.repo.actualizar(empresa, {"activo": False, "predeterminado": False})
        return True
