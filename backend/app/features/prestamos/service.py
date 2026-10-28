import uuid
from decimal import Decimal
from datetime import datetime, timezone, date
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from app.features.prestamos.model import Prestamo, Cuota, PrestamoLineaSnapshot
from app.features.prestamos.schemas import PrestamoCreate
from app.features.prestamos.repository import PrestamoRepository
from app.features.lineas.repository import LineaPrestamoRepository
from app.features.motores.repository import MotorCalculoRepository
from app.features.socios.service import SocioService
from app.features.auditoria.service import HistorialCambiosService
from app.integrations.coopya_db_client import CoopYaDbClient, coopya_db_client
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual, RedondeoCuota
from app.features.prestamos.cobros import recalcular_saldo
from app.features.respuestas_bancarias.service import bloquear_cobranzas


def _resolver_config(linea, motor) -> MotorConfig:
    m = (linea.motor if linea and linea.motor else motor)
    if not m:
        return MotorConfig()
    return MotorConfig(
        convencion_tasa=ConvencionTasa(m.convencion_tasa),
        base_dias=BaseDias(m.base_dias),
        modalidad_iva=ModalidadIva(m.modalidad_iva),
        ajuste_residual=AjusteResidual(m.ajuste_residual),
        redondeo_cuota=RedondeoCuota(getattr(m, "redondeo_cuota", None) or "CON_CENTAVOS")
    )


class PrestamoService:
    """Orquesta las reglas del ciclo de vida financiero de los préstamos."""

    def __init__(
        self,
        repository: PrestamoRepository,
        linea_repository: LineaPrestamoRepository,
        motor_repository: MotorCalculoRepository,
        socio_service: SocioService,
        auditoria_service: Optional[HistorialCambiosService] = None,
        coopya_db: CoopYaDbClient = coopya_db_client
    ):
        self.repository = repository
        self.linea_repository = linea_repository
        self.motor_repository = motor_repository
        self.socio_service = socio_service
        self.auditoria_service = auditoria_service
        self.coopya_db = coopya_db

    def listar(self, persona_id: Optional[int] = None, estado: Optional[str] = None, buscar: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Prestamo]:
        return self.repository.list_filtered(persona_id=persona_id, estado=estado, buscar=buscar, limit=limit, offset=offset)

    def obtener_por_id(self, prestamo_id: str) -> Prestamo:
        prestamo = self.repository.get_by_id(prestamo_id)
        if not prestamo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Préstamo no encontrado.")
        return prestamo

    def otorgar_prestamo(self, req: PrestamoCreate, usuario_operador: Optional[str] = None) -> Prestamo:
        linea = self._validar_linea(req) if req.linea_id else None
        motor = self.motor_repository.get_by_id(req.motor_id) if req.motor_id and not linea else None
        cfg = _resolver_config(linea, motor)

        fecha_venc = req.fecha_primer_vencimiento
        if not fecha_venc:
            hoy = date.today()
            anio = hoy.year + (1 if hoy.month == 12 else 0)
            mes = 1 if hoy.month == 12 else hoy.month + 1
            fecha_venc = date(anio, mes, 10)

        try:
            plan = CalculadoraFrances.calcular(
                monto_centavos=req.monto_solicitado_centavos, plazo_meses=req.plazo_meses,
                tasa_anual=req.tna_pactada, alicuota_iva=req.alicuota_iva,
                config=cfg, fecha_primer_vencimiento=fecha_venc
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        self.socio_service.sincronizar_socio_titular(
            persona_id=req.persona_id,
            nombre_completo=req.persona_nombre,
            documento=req.persona_doc,
            cbu=req.cbu,
            banco_id=req.banco_id
        )
        prestamo_id = str(uuid.uuid4())

        # 1. Crear contrato y cuotas en la base de datos local (Local-First)
        nuevo_prestamo = Prestamo(
            id=prestamo_id, persona_id=req.persona_id, persona_nombre=req.persona_nombre, persona_doc=req.persona_doc,
            monto_solicitado_centavos=req.monto_solicitado_centavos, plazo_meses=req.plazo_meses,
            tna_pactada=round(Decimal(req.tna_pactada), 4), tem_pactada=round(Decimal(plan.tem), 6), alicuota_iva=round(Decimal(req.alicuota_iva), 4),
            total_capital_centavos=plan.total_capital_centavos, total_interes_centavos=plan.total_interes_centavos,
            total_iva_centavos=plan.total_iva_centavos, total_a_pagar_centavos=plan.total_a_pagar_centavos,
            saldo_deudor_actual_centavos=plan.total_capital_centavos, estado="ACTIVO",
            fecha_alta=datetime.now(timezone.utc), observaciones=req.observaciones
        )
        snapshot = self._crear_snapshot(prestamo_id, linea)

        cuotas: List[Cuota] = [
            Cuota(
                id=str(uuid.uuid4()), prestamo_id=prestamo_id, numero_cuota=c.numero_cuota,
                fecha_vencimiento=c.fecha_vencimiento, saldo_inicial_centavos=c.saldo_inicial_centavos,
                capital_centavos=c.capital_centavos, interes_centavos=c.interes_centavos,
                iva_interes_centavos=c.iva_interes_centavos, cuota_pura_centavos=c.cuota_pura_centavos,
                cuota_total_centavos=c.cuota_total_centavos, saldo_final_centavos=c.saldo_final_centavos,
                calculo_exacto=c.calculo_exacto.model_dump(mode="json") if c.calculo_exacto else None,
                estado="PENDIENTE", monto_pagado_centavos=0,
                movimiento_coopya_id=None, desglose_coopya_id=None
            )
            for c in plan.cronograma
        ]

        # 2. Persistir PRIMERO en la base de datos local
        creado = self.repository.create(nuevo_prestamo, cuotas, snapshot=snapshot)

        # 3. Solo si la base local persistió con éxito, sincronizar con el Monolito CoopYa
        if self.coopya_db and getattr(self.coopya_db, "enabled", True):
            cuotas_raw = [
                {"numero_cuota": c.numero_cuota, "fecha_vencimiento": c.fecha_vencimiento,
                 "cuota_total_centavos": c.cuota_total_centavos, "capital_centavos": c.capital_centavos,
                 "interes_centavos": c.interes_centavos, "iva_interes_centavos": c.iva_interes_centavos}
                for c in plan.cronograma
            ]
            try:
                vinculos = self.coopya_db.impactar_cuotas_prestamo(persona_id=req.persona_id, prestamo_id=prestamo_id, cuotas=cuotas_raw)
                vinculos_map = {v["numero_cuota"]: v for v in vinculos}
                for c in creado.cuotas:
                    v = vinculos_map.get(c.numero_cuota)
                    if v:
                        c.movimiento_coopya_id = v.get("movimiento_id")
                        c.desglose_coopya_id = v.get("desglose_id")
                self.repository.db.commit()
            except Exception as e:
                try:
                    self.repository.db.delete(creado)
                    self.repository.db.commit()
                except Exception:
                    self.repository.db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Fallo al sincronizar cuotas con Monolito CoopYa (operación local revertida): {str(e)}"
                )
        self._auditar(prestamo_id, "CREATE", {"monto_centavos": creado.monto_solicitado_centavos, "plazo": creado.plazo_meses, "socio_id": creado.persona_id}, usuario_operador, "Otorgamiento de préstamo formal")
        return creado

    def cancelar(self, prestamo_id: str, usuario_operador: Optional[str] = None) -> Prestamo:
        bloquear_cobranzas(self.repository.db)
        prestamo = self.obtener_por_id(prestamo_id)
        estado_previo = prestamo.estado
        prestamo.estado = "CANCELADO"
        for c in prestamo.cuotas:
            if c.estado != "PAGADA":
                c.estado = "CANCELADA"
        actualizado = self.repository.update(prestamo)

        # Soft-delete en CoopYa de las cuotas pendientes
        if self.coopya_db:
            mov_ids = [c.movimiento_coopya_id for c in prestamo.cuotas if c.movimiento_coopya_id and c.estado != "PAGADA"]
            if mov_ids:
                try:
                    self.coopya_db.cancelar_cuotas_prestamo(mov_ids, motivo_cancelacion=f"Préstamo #{prestamo_id[:8]} cancelado")
                except Exception:
                    pass

        self._auditar(prestamo_id, "CANCEL", {"estado": "CANCELADO"}, usuario_operador, "Cancelación de préstamo", datos_anteriores={"estado": estado_previo})
        return actualizado

    def pagar_cuota(self, prestamo_id: str, numero_cuota: int, usuario_operador: Optional[str] = None) -> Prestamo:
        bloquear_cobranzas(self.repository.db)
        prestamo = self.obtener_por_id(prestamo_id)
        if prestamo.estado not in ('ACTIVO', 'MORA'):
            raise HTTPException(400, 'El préstamo no admite cobros.')
        cuota = next((c for c in prestamo.cuotas if c.numero_cuota == numero_cuota), None)
        if not cuota:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cuota #{numero_cuota} no encontrada.")
        if cuota.estado == "PAGADA":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta cuota ya se encuentra pagada.")

        restante = cuota.cuota_total_centavos - cuota.monto_pagado_centavos
        cuota.estado = "PAGADA"
        cuota.fecha_pago = datetime.now(timezone.utc)
        cuota.monto_pagado_centavos = cuota.cuota_total_centavos
        recalcular_saldo(prestamo)

        actualizado = self.repository.update(prestamo)

        if cuota.movimiento_coopya_id and self.coopya_db:
            try:
                self.coopya_db.registrar_cobro_cuota(movimiento_id=cuota.movimiento_coopya_id, monto_pesos=round(restante / 100.0, 2))
            except Exception:
                pass

        self._auditar(prestamo_id, "PAGAR_CUOTA", {"cuota_numero": numero_cuota, "monto_centavos": restante}, usuario_operador, f"Cobro de cuota #{numero_cuota}")
        return actualizado

    def _validar_linea(self, req: PrestamoCreate):
        linea = self.linea_repository.get_by_id(req.linea_id)
        if not linea:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La línea de crédito no existe.")
        if not linea.activo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea seleccionada está inactiva.")
        if req.monto_solicitado_centavos < linea.monto_minimo_centavos or req.monto_solicitado_centavos > linea.monto_maximo_centavos:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El monto debe estar entre ${linea.monto_minimo_centavos / 100:,.2f} y ${linea.monto_maximo_centavos / 100:,.2f}.")
        if req.plazo_meses < linea.plazo_minimo_meses or req.plazo_meses > linea.plazo_maximo_meses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El plazo debe estar entre {linea.plazo_minimo_meses} y {linea.plazo_maximo_meses} cuotas.")
        return linea

    def _crear_snapshot(self, prestamo_id: str, linea) -> Optional[PrestamoLineaSnapshot]:
        if not (linea and linea.motor):
            return None
        m = linea.motor
        return PrestamoLineaSnapshot(
            prestamo_id=prestamo_id, linea_id=linea.id, linea_codigo=linea.codigo, linea_nombre=linea.nombre,
            motor_id=m.id, motor_nombre=m.nombre, tasa_catalogo_vigente=round(Decimal(linea.tasa_default), 4), alicuota_iva=round(Decimal(linea.alicuota_iva), 4),
            monto_minimo_centavos=linea.monto_minimo_centavos, monto_maximo_centavos=linea.monto_maximo_centavos,
            plazo_minimo_meses=linea.plazo_minimo_meses, plazo_maximo_meses=linea.plazo_maximo_meses,
            reglas_motor_json={"convencion_tasa": m.convencion_tasa, "base_dias": m.base_dias, "modalidad_iva": m.modalidad_iva, "ajuste_residual": m.ajuste_residual},
            fecha_snapshot=datetime.now(timezone.utc)
        )

    def _auditar(self, entidad_id: str, accion: str, datos_nuevos: Dict[str, Any], usuario: Optional[str], motivo: str, datos_anteriores: Optional[Dict[str, Any]] = None):
        if self.auditoria_service:
            self.auditoria_service.auditar_prestamo(
                prestamo_id=entidad_id, accion=accion,
                cuota_numero=datos_nuevos.get("cuota_numero"),
                monto_centavos=datos_nuevos.get("monto_centavos"),
                usuario_operador=usuario, motivo=motivo, detalles_json=datos_nuevos
            )
