import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from app.features.prestamos.model import Prestamo, Cuota, PrestamoLineaSnapshot
from app.features.prestamos.schemas import PrestamoCreate
from app.features.prestamos.repository import PrestamoRepository
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.socios.service import SocioService
from app.features.auditoria.service import HistorialCambiosService
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual


class PrestamoService:
    """Orquesta las reglas del ciclo de vida financiero de los préstamos."""

    def __init__(
        self,
        repository: PrestamoRepository,
        linea_repository: LineaPrestamoRepository,
        motor_repository: MotorCalculoRepository,
        socio_service: SocioService,
        auditoria_service: Optional[HistorialCambiosService] = None
    ):
        self.repository = repository
        self.linea_repository = linea_repository
        self.motor_repository = motor_repository
        self.socio_service = socio_service
        self.auditoria_service = auditoria_service

    def listar(
        self,
        persona_id: Optional[int] = None,
        estado: Optional[str] = None,
        buscar: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Prestamo]:
        return self.repository.list_filtered(
            persona_id=persona_id, estado=estado, buscar=buscar, limit=limit, offset=offset
        )

    def obtener_por_id(self, prestamo_id: str) -> Prestamo:
        prestamo = self.repository.get_by_id(prestamo_id)
        if not prestamo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Préstamo no encontrado.")
        return prestamo

    def otorgar_prestamo(self, req: PrestamoCreate, usuario_operador: Optional[str] = None) -> Prestamo:
        cfg = MotorConfig()
        linea_encontrada = None

        if req.linea_id:
            linea_encontrada = self.linea_repository.get_by_id(req.linea_id)
            if not linea_encontrada:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La línea de crédito no existe.")
            if not linea_encontrada.activo:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea seleccionada está inactiva.")

            if (
                req.monto_solicitado_centavos < linea_encontrada.monto_minimo_centavos
                or req.monto_solicitado_centavos > linea_encontrada.monto_maximo_centavos
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El monto debe estar entre ${linea_encontrada.monto_minimo_centavos / 100:,.2f} y ${linea_encontrada.monto_maximo_centavos / 100:,.2f}."
                )
            if req.plazo_meses < linea_encontrada.plazo_minimo_meses or req.plazo_meses > linea_encontrada.plazo_maximo_meses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El plazo debe estar entre {linea_encontrada.plazo_minimo_meses} y {linea_encontrada.plazo_maximo_meses} cuotas."
                )

            if linea_encontrada.motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(linea_encontrada.motor.convencion_tasa),
                    base_dias=BaseDias(linea_encontrada.motor.base_dias),
                    modalidad_iva=ModalidadIva(linea_encontrada.motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(linea_encontrada.motor.ajuste_residual)
                )

        elif req.motor_id:
            motor = self.motor_repository.get_by_id(req.motor_id)
            if motor:
                cfg = MotorConfig(
                    convencion_tasa=ConvencionTasa(motor.convencion_tasa),
                    base_dias=BaseDias(motor.base_dias),
                    modalidad_iva=ModalidadIva(motor.modalidad_iva),
                    ajuste_residual=AjusteResidual(motor.ajuste_residual)
                )

        try:
            plan = CalculadoraFrances.calcular(
                monto_centavos=req.monto_solicitado_centavos,
                plazo_meses=req.plazo_meses,
                tasa_anual=req.tna_pactada,
                alicuota_iva=req.alicuota_iva,
                config=cfg,
                fecha_primer_vencimiento=req.fecha_primer_vencimiento
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        self.socio_service.sincronizar_socio_titular(
            persona_id=req.persona_id, nombre_completo=req.persona_nombre, documento=req.persona_doc
        )

        prestamo_id = str(uuid.uuid4())
        nuevo_prestamo = Prestamo(
            id=prestamo_id,
            persona_id=req.persona_id,
            persona_nombre=req.persona_nombre,
            persona_doc=req.persona_doc,
            monto_solicitado_centavos=req.monto_solicitado_centavos,
            plazo_meses=req.plazo_meses,
            tna_pactada=req.tna_pactada,
            tem_pactada=plan.tem,
            alicuota_iva=req.alicuota_iva,
            total_capital_centavos=plan.total_capital_centavos,
            total_interes_centavos=plan.total_interes_centavos,
            total_iva_centavos=plan.total_iva_centavos,
            total_a_pagar_centavos=plan.total_a_pagar_centavos,
            saldo_deudor_actual_centavos=plan.total_capital_centavos,
            estado="ACTIVO",
            fecha_alta=datetime.now(timezone.utc),
            observaciones=req.observaciones
        )

        snapshot: Optional[PrestamoLineaSnapshot] = None
        if linea_encontrada and linea_encontrada.motor:
            snapshot = PrestamoLineaSnapshot(
                prestamo_id=prestamo_id,
                linea_id=linea_encontrada.id,
                linea_codigo=linea_encontrada.codigo,
                linea_nombre=linea_encontrada.nombre,
                motor_id=linea_encontrada.motor.id,
                motor_nombre=linea_encontrada.motor.nombre,
                tasa_catalogo_vigente=linea_encontrada.tasa_default,
                alicuota_iva=linea_encontrada.alicuota_iva,
                monto_minimo_centavos=linea_encontrada.monto_minimo_centavos,
                monto_maximo_centavos=linea_encontrada.monto_maximo_centavos,
                plazo_minimo_meses=linea_encontrada.plazo_minimo_meses,
                plazo_maximo_meses=linea_encontrada.plazo_maximo_meses,
                reglas_motor_json={
                    "convencion_tasa": linea_encontrada.motor.convencion_tasa,
                    "base_dias": linea_encontrada.motor.base_dias,
                    "modalidad_iva": linea_encontrada.motor.modalidad_iva,
                    "ajuste_residual": linea_encontrada.motor.ajuste_residual
                },
                fecha_snapshot=datetime.now(timezone.utc)
            )

        cuotas: List[Cuota] = [
            Cuota(
                id=str(uuid.uuid4()),
                prestamo_id=prestamo_id,
                numero_cuota=c.numero_cuota,
                fecha_vencimiento=c.fecha_vencimiento,
                saldo_inicial_centavos=c.saldo_inicial_centavos,
                capital_centavos=c.capital_centavos,
                interes_centavos=c.interes_centavos,
                iva_interes_centavos=c.iva_interes_centavos,
                cuota_pura_centavos=c.cuota_pura_centavos,
                cuota_total_centavos=c.cuota_total_centavos,
                saldo_final_centavos=c.saldo_final_centavos,
                estado="PENDIENTE",
                monto_pagado_centavos=0
            )
            for c in plan.cronograma
        ]

        creado = self.repository.create(nuevo_prestamo, cuotas, snapshot=snapshot)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="prestamos",
                entidad_id=prestamo_id,
                accion="CREATE",
                datos_nuevos={
                    "monto_centavos": creado.monto_solicitado_centavos,
                    "plazo": creado.plazo_meses,
                    "socio_id": creado.persona_id,
                    "tna": float(creado.tna_pactada)
                },
                usuario_operador=usuario_operador,
                motivo="Otorgamiento de préstamo formal"
            )

        return creado

    def cancelar(self, prestamo_id: str, usuario_operador: Optional[str] = None) -> Prestamo:
        prestamo = self.obtener_por_id(prestamo_id)
        estado_previo = prestamo.estado
        prestamo.estado = "CANCELADO"
        actualizado = self.repository.update(prestamo)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="prestamos",
                entidad_id=prestamo_id,
                accion="CANCEL",
                datos_anteriores={"estado": estado_previo},
                datos_nuevos={"estado": "CANCELADO"},
                usuario_operador=usuario_operador,
                motivo="Cancelación de préstamo"
            )
        return actualizado

    def pagar_cuota(self, prestamo_id: str, numero_cuota: int, usuario_operador: Optional[str] = None) -> Prestamo:
        prestamo = self.obtener_por_id(prestamo_id)
        cuota = next((c for c in prestamo.cuotas if c.numero_cuota == numero_cuota), None)
        if not cuota:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cuota #{numero_cuota} no encontrada.")
        if cuota.estado == "PAGADA":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta cuota ya se encuentra pagada.")

        cuota.estado = "PAGADA"
        cuota.fecha_pago = datetime.now(timezone.utc)
        cuota.monto_pagado_centavos = cuota.cuota_total_centavos
        prestamo.saldo_deudor_actual_centavos = max(0, prestamo.saldo_deudor_actual_centavos - cuota.capital_centavos)

        if all(c.estado == "PAGADA" for c in prestamo.cuotas):
            prestamo.estado = "FINALIZADO"
            prestamo.saldo_deudor_actual_centavos = 0

        actualizado = self.repository.update(prestamo)

        if self.auditoria_service:
            self.auditoria_service.registrar_evento(
                entidad_nombre="prestamos",
                entidad_id=prestamo_id,
                accion="PAGAR_CUOTA",
                datos_nuevos={"cuota_numero": numero_cuota, "monto_centavos": cuota.monto_pagado_centavos},
                usuario_operador=usuario_operador,
                motivo=f"Cobro de cuota #{numero_cuota}"
            )

        return actualizado
