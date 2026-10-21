from typing import List, Optional
from fastapi import HTTPException, status
from app.features.lineas.model import LineaPrestamo
from app.features.lineas.schemas import LineaPrestamoCreate, LineaPrestamoUpdate
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.auditoria.service import HistorialCambiosService


class LineaPrestamoService:
    """Orquesta las reglas de negocio y validaciones para líneas de crédito."""

    def __init__(
        self,
        repository: LineaPrestamoRepository,
        motor_repository: MotorCalculoRepository,
        auditoria_service: Optional[HistorialCambiosService] = None
    ):
        self.repository = repository
        self.motor_repository = motor_repository
        self.auditoria_service = auditoria_service

    def listar(self, solo_activas: bool = False) -> List[LineaPrestamo]:
        return self.repository.list_all(solo_activas=solo_activas)

    def obtener_por_id(self, linea_id: int) -> LineaPrestamo:
        linea = self.repository.get_by_id(linea_id)
        if not linea:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Línea de crédito no encontrada"
            )
        return linea

    def crear(self, data: LineaPrestamoCreate, usuario_operador: Optional[str] = None) -> LineaPrestamo:
        existente = self.repository.get_by_codigo(data.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una línea con ese código"
            )

        motor = self.motor_repository.get_by_id(data.motor_id)
        if not motor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El motor de cálculo especificado no existe"
            )

        nueva = LineaPrestamo(**data.model_dump())
        creada = self.repository.create(nueva)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="lineas_prestamo",
                entidad_id=creada.id,
                accion="CREATE",
                datos_nuevos=data.model_dump(mode="json"),
                usuario_operador=usuario_operador,
                motivo="Creación de nueva línea de préstamo"
            )

        return creada

    def actualizar(
        self,
        linea_id: int,
        data: LineaPrestamoUpdate,
        usuario_operador: Optional[str] = None
    ) -> LineaPrestamo:
        linea = self.obtener_por_id(linea_id)

        if data.motor_id is not None:
            motor = self.motor_repository.get_by_id(data.motor_id)
            if not motor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El motor de cálculo especificado no existe"
                )

        datos_anteriores = {
            "nombre": linea.nombre,
            "tasa_default": float(linea.tasa_default),
            "alicuota_iva": float(linea.alicuota_iva),
            "activo": linea.activo
        }

        update_dict = data.model_dump(exclude_unset=True)
        for field, val in update_dict.items():
            if val is not None:
                setattr(linea, field, val)

        actualizada = self.repository.update(linea)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="lineas_prestamo",
                entidad_id=linea_id,
                accion="UPDATE",
                datos_anteriores=datos_anteriores,
                datos_nuevos=data.model_dump(exclude_unset=True, mode="json"),
                usuario_operador=usuario_operador,
                motivo="Modificación de parámetros de línea"
            )

        return actualizada

    def eliminar(self, linea_id: int, usuario_operador: Optional[str] = None) -> None:
        """Aplica Soft-Delete: no borra el registro de la DB para preservar integridad histórica."""
        linea = self.obtener_por_id(linea_id)
        linea.activo = False
        self.repository.update(linea)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="lineas_prestamo",
                entidad_id=linea_id,
                accion="SOFT_DELETE",
                datos_anteriores={"activo": True},
                datos_nuevos={"activo": False},
                usuario_operador=usuario_operador,
                motivo="Baja lógica (soft-delete) de línea de préstamo"
            )
