import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.socios.model import Socio
from app.features.presentaciones_bna.service import PresentacionBnaService
from app.features.presentaciones_bna.schemas import (
    BuscarCuotasBnaResponse,
    GenerarPresentacionBnaRequest,
    GenerarPresentacionBnaResponse,
    PresentacionBnaArchivoItem,
    PresentacionBnaAuditoriaItem,
    ProcesarRespuestaBnaResponse,
)

router = APIRouter(prefix="/presentaciones-bna", tags=["Presentaciones BNA"])


def get_service(db: Session = Depends(get_db)) -> PresentacionBnaService:
    return PresentacionBnaService(db)


@router.get("/cuotas-pendientes", response_model=BuscarCuotasBnaResponse)
def buscar_cuotas_pendientes(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    fecha_corte: Optional[str] = Query(None),
    incluir_presentadas: bool = Query(True),
    service: PresentacionBnaService = Depends(get_service),
):
    return service.buscar_cuotas_presentables(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        fecha_corte=fecha_corte,
        incluir_presentadas=incluir_presentadas,
    )


@router.get("/proximo-nro-lista")
def obtener_proximo_nro_lista(
    service: PresentacionBnaService = Depends(get_service),
):
    return {"proximo_nro_lista": service.obtener_proximo_nro_lista()}


@router.get("/validar-nro-lista/{nro_lista}")
def validar_nro_lista(
    nro_lista: int,
    service: PresentacionBnaService = Depends(get_service),
):
    return {"disponible": service.validar_nro_lista(nro_lista)}


@router.post("/generar-archivo", response_model=GenerarPresentacionBnaResponse)
def generar_archivo_bna(
    req: GenerarPresentacionBnaRequest,
    service: PresentacionBnaService = Depends(get_service),
):
    resp, _ = service.generar_presentacion_bna(req)
    return resp


@router.get("/archivos")
def listar_archivos(
    nro_archivo: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: PresentacionBnaService = Depends(get_service),
):
    fd = datetime.fromisoformat(fecha_desde) if fecha_desde else None
    fh = datetime.fromisoformat(fecha_hasta) if fecha_hasta else None
    archivos, total = service.repo.listar_archivos(
        nro_archivo=nro_archivo,
        estado=estado,
        fecha_desde=fd,
        fecha_hasta=fh,
        skip=skip,
        limit=limit,
    )
    items = [
        PresentacionBnaArchivoItem(
            id=a.id,
            nro_archivo=a.nro_archivo,
            tipo=a.tipo,
            fecha_generacion=a.fecha_generacion.isoformat(),
            total_registros=a.total_registros,
            total_monto=float(a.total_monto),
            estado=a.estado,
            nombre_archivo=a.nombre_archivo,
        )
        for a in archivos
    ]
    return {"total": total, "archivos": items}


@router.get("/archivos/{archivo_id}/detalles", response_model=List[PresentacionBnaAuditoriaItem])
def obtener_detalles_archivo(
    archivo_id: int,
    db: Session = Depends(get_db),
    service: PresentacionBnaService = Depends(get_service),
):
    detalles = service.repo.obtener_detalles_por_archivo(archivo_id)
    socio_ids = {d.id_persona for d in detalles}
    socios = {s.id: s.nombre_completo for s in db.query(Socio).filter(Socio.id.in_(socio_ids)).all()} if socio_ids else {}

    return [
        PresentacionBnaAuditoriaItem(
            id=d.id,
            numero_operacion=d.numero_operacion,
            id_persona=d.id_persona,
            socio_nombre=socios.get(d.id_persona),
            sucursal_cuenta_cliente=d.sucursal_cuenta_cliente,
            nro_cuenta_cliente=d.nro_cuenta_cliente,
            monto_pesos=float(d.monto_pesos),
            concepto_debito=d.concepto_debito,
            codigo_respuesta=d.codigo_respuesta,
            descripcion_rechazo=d.descripcion_rechazo,
            fecha_respuesta=d.fecha_respuesta.isoformat() if d.fecha_respuesta else None,
        )
        for d in detalles
    ]


@router.get("/archivos/{archivo_id}/descargar")
def descargar_archivo_bna(
    archivo_id: int,
    service: PresentacionBnaService = Depends(get_service),
):
    archivo = service.repo.obtener_archivo_por_id(archivo_id)
    if not archivo or not os.path.exists(archivo.ruta):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo físico no encontrado")

    return FileResponse(
        path=archivo.ruta,
        filename=archivo.nombre_archivo,
        media_type="text/plain",
    )


@router.post("/archivos/{archivo_id}/subir-respuesta", response_model=ProcesarRespuestaBnaResponse)
async def subir_respuesta_bna(
    archivo_id: int,
    archivo: UploadFile = File(...),
    service: PresentacionBnaService = Depends(get_service),
):
    contenido = await archivo.read()
    try:
        texto = contenido.decode("ascii")
    except UnicodeDecodeError:
        texto = contenido.decode("latin1", errors="ignore")

    return service.procesar_respuesta_bna(
        archivo_id=archivo_id,
        contenido_txt=texto,
    )
