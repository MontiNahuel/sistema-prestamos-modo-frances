from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.features.prestamos.model import Cuota
from app.features.presentaciones_bna.repository import PresentacionBnaRepository
from app.features.presentaciones_bna.bna_layout import ParseadorRespuestaBna
from app.features.presentaciones_bna.schemas import ProcesarRespuestaBnaResponse


class PresentacionBnaResponseService:
    """Procesamiento y conciliación de rendiciones de Banco Nación."""

    def __init__(self, db: Session, repo: PresentacionBnaRepository):
        self.db = db
        self.repo = repo

    def procesar(
        self, archivo_id: int, contenido_txt: str, usuario_id: Optional[int] = None
    ) -> ProcesarRespuestaBnaResponse:
        archivo = self.repo.obtener_archivo_por_id(archivo_id)
        if not archivo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo de presentación no encontrado")

        lineas = contenido_txt.splitlines()
        actualizados, exitosos, rechazados, no_encontrados = 0, 0, 0, 0

        for linea in lineas:
            parsed = ParseadorRespuestaBna.parsear_linea_detalle(linea)
            if not parsed:
                continue

            concepto = parsed["concepto_debito"]
            num_op = parsed["numero_operacion"]

            detalle = self.repo.buscar_detalle_por_concepto(archivo.id, concepto)
            if not detalle and num_op is not None:
                detalle = self.repo.buscar_detalle_por_num_op(archivo.id, num_op)

            if not detalle:
                no_encontrados += 1
                continue

            detalle.codigo_respuesta = parsed["estado"]
            detalle.descripcion_rechazo = parsed["descripcion_rechazo"]
            detalle.fecha_respuesta = datetime.utcnow()
            actualizados += 1

            if parsed["es_ok"]:
                exitosos += 1
                if detalle.cuota_id:
                    cuota = self.db.query(Cuota).filter_by(id=detalle.cuota_id).first()
                    if cuota:
                        cuota.estado = "COBRADA"
                        cuota.fecha_pago = datetime.utcnow().date()
            else:
                rechazados += 1
                if detalle.cuota_id:
                    cuota = self.db.query(Cuota).filter_by(id=detalle.cuota_id).first()
                    if cuota and cuota.estado == "PRESENTADA":
                        cuota.estado = "RECHAZADA"

        archivo.estado = "RENDIDO"
        self.db.commit()

        return ProcesarRespuestaBnaResponse(
            archivo_id=archivo.id,
            total_lineas=len(lineas),
            actualizados=actualizados,
            exitosos=exitosos,
            rechazados=rechazados,
            no_encontrados=no_encontrados,
            mensaje=f"Proceso finalizado: {actualizados} registros actualizados ({exitosos} cobrados, {rechazados} rechazados).",
        )
