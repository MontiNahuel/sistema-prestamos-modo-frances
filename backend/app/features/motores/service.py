from typing import List, Optional
from fastapi import HTTPException, status
from app.features.motores.model import MotorCalculo
from app.features.motores.schemas import MotorCalculoCreate, MotorCalculoUpdate
from app.features.motores.repository import MotorCalculoRepository
from app.features.auditoria.service import HistorialCambiosService


class MotorCalculoService:
    """Orquesta las reglas de negocio y validaciones de los motores de cálculo."""

    def __init__(
        self,
        repository: MotorCalculoRepository,
        auditoria_service: Optional[HistorialCambiosService] = None
    ):
        self.repository = repository
        self.auditoria_service = auditoria_service

    def listar(self, solo_activos: bool = False) -> List[MotorCalculo]:
        return self.repository.list_all(solo_activos=solo_activos)

    def obtener_por_id(self, motor_id: int) -> MotorCalculo:
        motor = self.repository.get_by_id(motor_id)
        if not motor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Motor de cálculo no encontrado"
            )
        return motor

    def crear(self, data: MotorCalculoCreate, usuario_operador: Optional[str] = None) -> MotorCalculo:
        existente = self.repository.get_by_codigo(data.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un motor con ese código"
            )

        nuevo = MotorCalculo(
            codigo=data.codigo,
            nombre=data.nombre,
            descripcion=data.descripcion,
            convencion_tasa=data.convencion_tasa.value,
            base_dias=data.base_dias.value,
            modalidad_iva=data.modalidad_iva.value,
            ajuste_residual=data.ajuste_residual.value,
            activo=data.activo,
            es_sistema=False
        )
        creado = self.repository.create(nuevo)

        if self.auditoria_service:
            self.auditoria_service.auditar_configuracion_credito(
                tipo_entidad="MOTOR",
                entidad_id=creado.id,
                accion="CREATE",
                codigo=creado.codigo,
                nombre=creado.nombre,
                usuario_operador=usuario_operador,
                motivo="Creación de motor de cálculo",
                cambios_json=data.model_dump(mode="json"),
            )

        return creado

    def actualizar(
        self,
        motor_id: int,
        data: MotorCalculoUpdate,
        usuario_operador: Optional[str] = None
    ) -> MotorCalculo:
        motor = self.obtener_por_id(motor_id)

        datos_anteriores = {
            "nombre": motor.nombre,
            "convencion_tasa": motor.convencion_tasa,
            "modalidad_iva": motor.modalidad_iva,
            "activo": motor.activo
        }

        update_dict = data.model_dump(exclude_unset=True)
        for field, val in update_dict.items():
            if val is not None:
                setattr(motor, field, getattr(val, "value", val))

        actualizado = self.repository.update(motor)

        if self.auditoria_service:
            self.auditoria_service.auditar_configuracion_credito(
                tipo_entidad="MOTOR",
                entidad_id=motor_id,
                accion="UPDATE",
                codigo=actualizado.codigo,
                nombre=actualizado.nombre,
                usuario_operador=usuario_operador,
                motivo="Modificación de motor de cálculo",
                cambios_json=data.model_dump(exclude_unset=True, mode="json"),
            )

        return actualizado

    def eliminar(self, motor_id: int, usuario_operador: Optional[str] = None) -> None:
        """Aplica Soft-Delete: no borra el motor de la base de datos."""
        motor = self.obtener_por_id(motor_id)
        if motor.es_sistema:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los motores estándar del sistema no pueden eliminarse"
            )
        motor.activo = False
        self.repository.update(motor)

        if self.auditoria_service:
            self.auditoria_service.auditar_configuracion_credito(
                tipo_entidad="MOTOR",
                entidad_id=motor_id,
                accion="SOFT_DELETE",
                codigo=motor.codigo,
                nombre=motor.nombre,
                usuario_operador=usuario_operador,
                motivo="Baja lógica (soft-delete) de motor de cálculo",
                cambios_json={"activo": False},
            )
