from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_, true
from sqlalchemy.orm import Session
from app.features.auditoria.service import AuditoriaService
from app.features.cuotas_sociales.model import CuotaSocial, CuotaSocialConfig
from app.features.cuotas_sociales.schemas import (
    DEFAULT_CUOTA_SOCIAL_CENTAVOS,
    ActualizarCuotaSocialConfigResponse,
    CuotaSocialConfigResponse,
    CuotaSocialSocioActivoItem,
    CuotaSocialSociosActivosResponse,
)
from app.features.socios.model import Socio


class CuotaSocialConfigService:
    """Gestiona la configuración global del valor por defecto de Cuota Social y su aplicación al padrón activo."""

    def __init__(self, db: Session):
        self.db = db

    def obtener_valor_default_centavos(self) -> int:
        cfg = self.db.get(CuotaSocialConfig, 1)
        if cfg and cfg.valor_default_centavos and int(cfg.valor_default_centavos) > 0:
            return int(cfg.valor_default_centavos)
        return DEFAULT_CUOTA_SOCIAL_CENTAVOS

    def _contar_resumen_activos(self) -> tuple[int, int]:
        socios_activos_count = (
            self.db.query(Socio)
            .filter(Socio.cuota_social_activa == true())
            .count()
        )
        pendientes_count = (
            self.db.query(CuotaSocial)
            .join(Socio, CuotaSocial.socio_id == Socio.id)
            .filter(
                Socio.cuota_social_activa == true(),
                CuotaSocial.estado == "PENDIENTE",
                CuotaSocial.monto_pagado_centavos == 0,
            )
            .count()
        )
        return socios_activos_count, pendientes_count

    def obtener_configuracion_global(self) -> CuotaSocialConfigResponse:
        cfg = self.db.get(CuotaSocialConfig, 1)
        socios_cnt, cuotas_cnt = self._contar_resumen_activos()
        return CuotaSocialConfigResponse(
            valor_default_centavos=(
                int(cfg.valor_default_centavos)
                if cfg and cfg.valor_default_centavos
                else DEFAULT_CUOTA_SOCIAL_CENTAVOS
            ),
            fecha_actualizacion=cfg.fecha_actualizacion if cfg else None,
            actualizado_por=cfg.actualizado_por if cfg else None,
            socios_activos_count=socios_cnt,
            cuotas_pendientes_modificables_count=cuotas_cnt,
        )

    def _aplicar_valor_a_activos(self, valor_centavos: int) -> tuple[int, int]:
        socios_actualizados = 0
        cuotas_actualizadas = 0
        socios_activos = (
            self.db.query(Socio)
            .filter(Socio.cuota_social_activa == true())
            .all()
        )
        for socio in socios_activos:
            if int(socio.cuota_social_valor_centavos or 0) != valor_centavos:
                socio.cuota_social_valor_centavos = valor_centavos
                socios_actualizados += 1

        activos_ids = [s.id for s in socios_activos]
        if activos_ids:
            pendientes = (
                self.db.query(CuotaSocial)
                .filter(
                    CuotaSocial.socio_id.in_(activos_ids),
                    CuotaSocial.estado == "PENDIENTE",
                    CuotaSocial.monto_pagado_centavos == 0,
                )
                .all()
            )
            for cuota in pendientes:
                if int(cuota.valor_centavos) != valor_centavos:
                    cuota.valor_centavos = valor_centavos
                    cuotas_actualizadas += 1
        return socios_actualizados, cuotas_actualizadas

    def actualizar_configuracion_global(
        self,
        valor_default_centavos: int,
        aplicar_a_activos: bool = False,
        usuario_operador: Optional[str] = None,
    ) -> ActualizarCuotaSocialConfigResponse:
        if valor_default_centavos <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El valor por defecto de la cuota social debe ser mayor a cero.",
            )

        ahora = datetime.now(timezone.utc).replace(tzinfo=None)
        cfg = self.db.get(CuotaSocialConfig, 1)
        valor_anterior = (
            int(cfg.valor_default_centavos)
            if cfg and cfg.valor_default_centavos
            else DEFAULT_CUOTA_SOCIAL_CENTAVOS
        )

        if not cfg:
            cfg = CuotaSocialConfig(
                id=1,
                valor_default_centavos=int(valor_default_centavos),
                fecha_actualizacion=ahora,
                actualizado_por=usuario_operador,
            )
            self.db.add(cfg)
        else:
            cfg.valor_default_centavos = int(valor_default_centavos)
            cfg.fecha_actualizacion = ahora
            cfg.actualizado_por = usuario_operador

        socios_actualizados = 0
        cuotas_actualizadas = 0
        if aplicar_a_activos:
            socios_actualizados, cuotas_actualizadas = self._aplicar_valor_a_activos(
                int(valor_default_centavos)
            )

        self.db.flush()
        AuditoriaService(self.db).auditar_configuracion_credito(
            tipo_entidad="CUOTA_SOCIAL",
            entidad_id=1,
            accion="UPDATE",
            codigo="CUOTA_SOCIAL_DEFAULT",
            nombre="Valor por defecto Cuota Social",
            usuario_operador=usuario_operador,
            motivo=(
                f"Actualización de Cuota Social por defecto "
                f"(${valor_anterior / 100:,.2f} -> ${valor_default_centavos / 100:,.2f})"
                + (
                    f" con aplicación a {socios_actualizados} socio(s) y {cuotas_actualizadas} cuota(s)"
                    if aplicar_a_activos
                    else " (solo nuevas operaciones)"
                )
            ),
            cambios_json={
                "valor_anterior_centavos": valor_anterior,
                "valor_nuevo_centavos": int(valor_default_centavos),
                "aplicar_a_activos": bool(aplicar_a_activos),
                "socios_actualizados": socios_actualizados,
                "cuotas_pendientes_actualizadas": cuotas_actualizadas,
            },
        )

        socios_cnt, cuotas_cnt = self._contar_resumen_activos()
        return ActualizarCuotaSocialConfigResponse(
            valor_default_centavos=int(cfg.valor_default_centavos),
            valor_anterior_centavos=valor_anterior,
            fecha_actualizacion=cfg.fecha_actualizacion,
            actualizado_por=cfg.actualizado_por,
            socios_activos_count=socios_cnt,
            cuotas_pendientes_modificables_count=cuotas_cnt,
            socios_actualizados=socios_actualizados,
            cuotas_pendientes_actualizadas=cuotas_actualizadas,
        )

    def listar_socios_activos(
        self,
        buscar: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> CuotaSocialSociosActivosResponse:
        q = self.db.query(Socio).filter(Socio.cuota_social_activa == true())
        if buscar and buscar.strip():
            termino = buscar.strip()
            patron = f"%{termino}%"
            filtros = [
                Socio.nombre_completo.ilike(patron),
                Socio.documento.ilike(patron),
            ]
            if termino.isdigit():
                filtros.append(Socio.id == int(termino))
            q = q.filter(or_(*filtros))

        total = q.count()
        socios = (
            q.order_by(Socio.nombre_completo.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        pendientes_por_socio: dict[int, int] = {}
        if socios:
            ids = [s.id for s in socios]
            filas = (
                self.db.query(CuotaSocial.socio_id, func.count(CuotaSocial.id))
                .filter(
                    CuotaSocial.socio_id.in_(ids),
                    CuotaSocial.estado == "PENDIENTE",
                )
                .group_by(CuotaSocial.socio_id)
                .all()
            )
            pendientes_por_socio = {int(sid): int(cnt) for sid, cnt in filas}

        default_valor = self.obtener_valor_default_centavos()
        items = [
            CuotaSocialSocioActivoItem(
                socio_id=s.id,
                nombre_completo=s.nombre_completo,
                documento=s.documento,
                valor_centavos=int(s.cuota_social_valor_centavos or default_valor),
                fecha_alta=s.cuota_social_fecha_alta,
                prestamo_id=s.cuota_social_prestamo_id,
                cuotas_pendientes=pendientes_por_socio.get(s.id, 0),
            )
            for s in socios
        ]
        return CuotaSocialSociosActivosResponse(total=total, items=items)
