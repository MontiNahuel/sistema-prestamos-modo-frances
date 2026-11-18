import calendar
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import true
from sqlalchemy.orm import Session
from app.features.cuotas_sociales.config_service import CuotaSocialConfigService
from app.features.cuotas_sociales.model import CuotaSocial
from app.features.cuotas_sociales.schemas import (
    ActualizarCuotaSocialConfigResponse,
    CuotaSocialConfigResponse,
    CuotaSocialReporteItem,
    CuotaSocialResponse,
    CuotaSocialSociosActivosResponse,
    SocioCuotaSocialEstadoResponse,
)
from app.features.prestamos.model import Prestamo
from app.features.socios.model import Socio
import app.features.prestamos.model  # noqa: F401
import app.features.respuestas_bancarias.model  # noqa: F401


def _sumar_un_mes(fecha: date, dia_objetivo: int) -> date:
    anio = fecha.year + (1 if fecha.month == 12 else 0)
    mes = 1 if fecha.month == 12 else fecha.month + 1
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    return date(anio, mes, min(max(1, dia_objetivo), ultimo_dia))


def _fecha_vencimiento_mes(anio: int, mes: int, dia_objetivo: int) -> date:
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    return date(anio, mes, min(max(1, dia_objetivo), ultimo_dia))


class CuotaSocialService:
    """Gestiona suscripciones mensuales de Cuota Social por socio, aparte de los préstamos."""

    def __init__(self, db: Session):
        self.db = db
        self._config_service = CuotaSocialConfigService(db)

    def obtener_valor_default_centavos(self) -> int:
        return self._config_service.obtener_valor_default_centavos()

    def obtener_configuracion_global(self) -> CuotaSocialConfigResponse:
        return self._config_service.obtener_configuracion_global()

    def actualizar_configuracion_global(
        self,
        valor_default_centavos: int,
        aplicar_a_activos: bool = False,
        usuario_operador: Optional[str] = None,
    ) -> ActualizarCuotaSocialConfigResponse:
        return self._config_service.actualizar_configuracion_global(
            valor_default_centavos=valor_default_centavos,
            aplicar_a_activos=aplicar_a_activos,
            usuario_operador=usuario_operador,
        )

    def listar_socios_activos(
        self,
        buscar: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> CuotaSocialSociosActivosResponse:
        return self._config_service.listar_socios_activos(
            buscar=buscar,
            limit=limit,
            offset=offset,
        )

    def activar_socio(
        self,
        socio_id: int,
        valor_centavos: Optional[int] = None,
        prestamo_id: Optional[str] = None,
        fecha_primer_vencimiento: Optional[date] = None,
        commit: bool = True,
    ) -> SocioCuotaSocialEstadoResponse:
        socio = self.db.get(Socio, socio_id)
        if not socio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Socio no encontrado.")
        valor_final = (
            int(valor_centavos)
            if valor_centavos is not None
            else self.obtener_valor_default_centavos()
        )
        if valor_final <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El valor de la cuota social debe ser mayor a cero.")

        hoy = date.today()
        fecha_inicial = fecha_primer_vencimiento or _sumar_un_mes(hoy.replace(day=1), 10)
        dia_objetivo = fecha_inicial.day

        socio.cuota_social_activa = True
        socio.cuota_social_valor_centavos = valor_final
        if prestamo_id:
            socio.cuota_social_prestamo_id = prestamo_id
        socio.cuota_social_fecha_alta = datetime.now(timezone.utc).replace(tzinfo=None)
        socio.cuota_social_fecha_baja = None
        socio.cuota_social_ultimo_vencimiento_dia = dia_objetivo

        self._asegurar_periodo(
            socio=socio,
            fecha_vencimiento=fecha_inicial,
            valor_centavos=valor_final,
            prestamo_id=prestamo_id or socio.cuota_social_prestamo_id,
            reactivar_si_anulada=True,
        )

        # Si hay cuotas sociales futuras pendientes de un monto anterior, actualizamos al nuevo valor
        pendientes = (
            self.db.query(CuotaSocial)
            .filter(
                CuotaSocial.socio_id == socio_id,
                CuotaSocial.estado == "PENDIENTE",
                CuotaSocial.monto_pagado_centavos == 0,
            )
            .all()
        )
        for c in pendientes:
            c.valor_centavos = valor_final

        self.db.flush()
        if commit:
            self.db.commit()
        return self.obtener_estado_socio(socio_id, generar_actual=False)

    def _asegurar_periodo(
        self,
        socio: Socio,
        fecha_vencimiento: date,
        valor_centavos: int,
        prestamo_id: Optional[str],
        reactivar_si_anulada: bool = False,
    ) -> Optional[CuotaSocial]:
        periodo = fecha_vencimiento.strftime("%Y-%m")
        existente = (
            self.db.query(CuotaSocial)
            .filter(CuotaSocial.socio_id == socio.id, CuotaSocial.periodo == periodo)
            .first()
        )
        if existente:
            if existente.estado == "ANULADA" and reactivar_si_anulada:
                existente.estado = "PENDIENTE"
                existente.valor_centavos = valor_centavos
                existente.fecha_vencimiento = fecha_vencimiento
                if prestamo_id:
                    existente.prestamo_id = prestamo_id
            return existente

        nueva = CuotaSocial(
            id=str(uuid.uuid4()),
            socio_id=socio.id,
            prestamo_id=prestamo_id,
            periodo=periodo,
            fecha_vencimiento=fecha_vencimiento,
            valor_centavos=valor_centavos,
            monto_pagado_centavos=0,
            estado="PENDIENTE",
            fecha_alta=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(nueva)
        return nueva

    def asegurar_periodos_hasta(
        self,
        fecha_hasta: Optional[date] = None,
        socio_id: Optional[int] = None,
        commit: bool = True,
    ) -> int:
        """Materializa los períodos mensuales pendientes para socios con Cuota Social activa."""
        limite = fecha_hasta or date.today()
        periodo_limite = limite.strftime("%Y-%m")
        q = self.db.query(Socio).filter(Socio.cuota_social_activa == true())
        if socio_id is not None:
            q = q.filter(Socio.id == socio_id)
        socios = q.all()
        creadas = 0

        for socio in socios:
            if not socio.cuota_social_valor_centavos or socio.cuota_social_valor_centavos <= 0:
                continue
            dia_obj = socio.cuota_social_ultimo_vencimiento_dia or 10
            existentes = (
                self.db.query(CuotaSocial)
                .filter(CuotaSocial.socio_id == socio.id)
                .order_by(CuotaSocial.periodo.asc())
                .all()
            )
            por_periodo = {c.periodo: c for c in existentes}
            activas = [c for c in existentes if c.estado != "ANULADA"]

            if activas:
                cursor_fecha = activas[-1].fecha_vencimiento
            elif socio.cuota_social_fecha_alta:
                alta_fecha = socio.cuota_social_fecha_alta.date()
                cursor_fecha = _fecha_vencimiento_mes(alta_fecha.year, alta_fecha.month, dia_obj)
            else:
                cursor_fecha = _fecha_vencimiento_mes(date.today().year, date.today().month, dia_obj)

            # Si no existe aún el período base de arranque y está dentro del rango, asegurarlo primero
            if cursor_fecha.strftime("%Y-%m") <= periodo_limite and cursor_fecha <= limite:
                p_ini = cursor_fecha.strftime("%Y-%m")
                if p_ini not in por_periodo:
                    nueva = self._asegurar_periodo(
                        socio=socio,
                        fecha_vencimiento=cursor_fecha,
                        valor_centavos=int(socio.cuota_social_valor_centavos),
                        prestamo_id=socio.cuota_social_prestamo_id,
                    )
                    if nueva:
                        por_periodo[p_ini] = nueva
                        creadas += 1

            while True:
                siguiente = _sumar_un_mes(cursor_fecha, dia_obj)
                p_sig = siguiente.strftime("%Y-%m")
                if p_sig > periodo_limite or siguiente > limite:
                    break
                if p_sig not in por_periodo:
                    nueva = self._asegurar_periodo(
                        socio=socio,
                        fecha_vencimiento=siguiente,
                        valor_centavos=int(socio.cuota_social_valor_centavos),
                        prestamo_id=socio.cuota_social_prestamo_id,
                    )
                    if nueva:
                        por_periodo[p_sig] = nueva
                        creadas += 1
                cursor_fecha = siguiente

        if creadas > 0:
            self.db.flush()
            if commit:
                self.db.commit()
        return creadas

    def dar_baja_socio(self, socio_id: int) -> SocioCuotaSocialEstadoResponse:
        socio = self.db.get(Socio, socio_id)
        if not socio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Socio no encontrado.")

        socio.cuota_social_activa = False
        socio.cuota_social_fecha_baja = datetime.now(timezone.utc).replace(tzinfo=None)

        pendientes = (
            self.db.query(CuotaSocial)
            .filter(
                CuotaSocial.socio_id == socio_id,
                CuotaSocial.estado == "PENDIENTE",
                CuotaSocial.monto_pagado_centavos == 0,
            )
            .all()
        )
        for c in pendientes:
            c.estado = "ANULADA"

        self.db.commit()
        return self.obtener_estado_socio(socio_id, generar_actual=False)

    def obtener_estado_socio(
        self,
        socio_id: int,
        generar_actual: bool = True,
    ) -> SocioCuotaSocialEstadoResponse:
        default_valor = self.obtener_valor_default_centavos()
        socio = self.db.get(Socio, socio_id)
        if not socio:
            return SocioCuotaSocialEstadoResponse(
                socio_id=socio_id,
                activa=False,
                valor_centavos=default_valor,
                cuotas=[],
            )

        if generar_actual and socio.cuota_social_activa:
            self.asegurar_periodos_hasta(fecha_hasta=date.today(), socio_id=socio_id, commit=True)

        cuotas: List[CuotaSocial] = (
            self.db.query(CuotaSocial)
            .filter(CuotaSocial.socio_id == socio_id)
            .order_by(CuotaSocial.periodo.desc())
            .all()
        )
        return SocioCuotaSocialEstadoResponse(
            socio_id=socio.id,
            activa=bool(socio.cuota_social_activa),
            valor_centavos=int(socio.cuota_social_valor_centavos or default_valor),
            prestamo_id=socio.cuota_social_prestamo_id,
            fecha_alta=socio.cuota_social_fecha_alta,
            fecha_baja=socio.cuota_social_fecha_baja,
            dia_vencimiento=int(socio.cuota_social_ultimo_vencimiento_dia or 10),
            cuotas=[CuotaSocialResponse.model_validate(c) for c in cuotas],
        )

    def listar_periodos_reporte(
        self,
        desde: date,
        hasta: date,
        incluir_anuladas: bool = False,
        hoy: Optional[date] = None,
    ) -> List[CuotaSocialReporteItem]:
        """Lista cuotas sociales reales en el rango [desde, hasta] sin proyectar meses futuros."""
        if desde > hasta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha 'desde' no puede ser posterior a 'hasta'.",
            )

        fecha_actual = hoy or date.today()
        fin_mes_actual = _fecha_vencimiento_mes(fecha_actual.year, fecha_actual.month, 31)
        limite_asegurar = min(hasta, fin_mes_actual)
        self.asegurar_periodos_hasta(fecha_hasta=limite_asegurar, commit=True)

        q = (
            self.db.query(CuotaSocial, Socio, Prestamo.numero_prestamo)
            .join(Socio, CuotaSocial.socio_id == Socio.id)
            .outerjoin(Prestamo, CuotaSocial.prestamo_id == Prestamo.id)
            .filter(
                CuotaSocial.fecha_vencimiento >= desde,
                CuotaSocial.fecha_vencimiento <= hasta,
            )
        )
        if not incluir_anuladas:
            q = q.filter(CuotaSocial.estado != "ANULADA")

        filas = q.order_by(
            CuotaSocial.fecha_vencimiento.asc(),
            Socio.nombre_completo.asc(),
            CuotaSocial.socio_id.asc(),
        ).all()

        return [
            CuotaSocialReporteItem(
                id=cs.id,
                socio_id=cs.socio_id,
                persona_nombre=socio.nombre_completo,
                persona_doc=socio.documento,
                prestamo_id=cs.prestamo_id,
                numero_prestamo=numero_prestamo,
                periodo=cs.periodo,
                fecha_vencimiento=cs.fecha_vencimiento,
                valor_centavos=int(cs.valor_centavos),
                monto_pagado_centavos=int(cs.monto_pagado_centavos or 0),
                estado=cs.estado,
                fecha_pago=cs.fecha_pago,
                cuota_social_activa=bool(socio.cuota_social_activa),
            )
            for cs, socio, numero_prestamo in filas
        ]
