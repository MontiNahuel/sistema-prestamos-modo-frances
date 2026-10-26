import os
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.features.presentaciones_bapro.schemas import (
    BuscarCuotasBaproRequest,
    BuscarCuotasBaproResponse,
    GenerarPresentacionBaproRequest,
    GenerarPresentacionBaproResponse,
    ProcesarRespuestaBaproResponse,
    PresentacionBaproArchivoResponse,
    PresentacionBaproArchivoDetalleResponse,
    ProximoNumeroListaResponse,
    ValidarNumeroListaResponse,
)
from app.features.presentaciones_bapro.service import PresentacionBaproService

router = APIRouter(prefix="/presentaciones-bapro", tags=["Presentaciones BAPRO"])


def get_service(db: Session = Depends(get_db)) -> PresentacionBaproService:
    return PresentacionBaproService(db)


@router.post("/buscar-cuotas", response_model=BuscarCuotasBaproResponse)
def buscar_cuotas(
    req: BuscarCuotasBaproRequest,
    service: PresentacionBaproService = Depends(get_service),
):
    return service.buscar_cuotas_presentables(
        fecha_desde=req.fecha_desde,
        fecha_hasta=req.fecha_hasta,
        fecha_corte=req.fecha_corte,
        dni_desde=req.dni_desde,
        dni_hasta=req.dni_hasta,
        incluir_presentadas=req.incluir_presentadas,
        base_filtrada=req.base_filtrada,
    )


@router.get("/proximo-nro-lista", response_model=ProximoNumeroListaResponse)
def obtener_proximo_nro_lista(service: PresentacionBaproService = Depends(get_service)):
    nro = service.obtener_proximo_nro_lista()
    return ProximoNumeroListaResponse(nro_lista_propuesto=nro, disponible=True)


@router.get("/validar-nro-lista/{nro_lista}", response_model=ValidarNumeroListaResponse)
def validar_nro_lista(nro_lista: int, service: PresentacionBaproService = Depends(get_service)):
    disponible = service.validar_nro_lista(nro_lista)
    mensaje = (
        "Número disponible"
        if disponible
        else f"El número de lista {nro_lista} ya fue utilizado. Ingrese otro número."
    )
    return ValidarNumeroListaResponse(nro_lista=nro_lista, disponible=disponible, mensaje=mensaje)


@router.post("/generar", response_model=GenerarPresentacionBaproResponse)
def generar_presentacion(
    req: GenerarPresentacionBaproRequest,
    service: PresentacionBaproService = Depends(get_service),
):
    resp, _ = service.generar_presentacion_bapro(req)
    return resp


@router.get("/descargar/{nro_archivo}")
def descargar_archivo(
    nro_archivo: int,
    service: PresentacionBaproService = Depends(get_service),
):
    archivo = service.repo.obtener_archivo_por_nro(nro_archivo)
    if not archivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    ruta_completa = os.path.join(service.STORAGE_DIR, str(nro_archivo), archivo.nombre_archivo)
    if not os.path.exists(ruta_completa):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El archivo físico no existe en disco")

    return FileResponse(
        path=ruta_completa,
        media_type="text/plain",
        filename=archivo.nombre_archivo,
    )


@router.post("/cargar-respuesta", response_model=ProcesarRespuestaBaproResponse)
async def cargar_respuesta(
    nro_archivo: int = Form(...),
    file: UploadFile = File(...),
    service: PresentacionBaproService = Depends(get_service),
):
    contenido_bytes = await file.read()
    contenido_texto = contenido_bytes.decode("ascii", errors="ignore")
    return service.procesar_respuesta_bapro(
        nro_archivo=nro_archivo,
        contenido_texto=contenido_texto,
    )


@router.get("/archivos", response_model=List[PresentacionBaproArchivoResponse])
def listar_archivos(
    nro_archivo: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: PresentacionBaproService = Depends(get_service),
):
    archivos, _ = service.repo.listar_archivos(
        nro_archivo=nro_archivo,
        estado=estado,
        skip=skip,
        limit=limit,
    )
    return archivos


@router.get("/archivos/{nro_archivo}", response_model=PresentacionBaproArchivoDetalleResponse)
def obtener_detalle_archivo(
    nro_archivo: int,
    service: PresentacionBaproService = Depends(get_service),
):
    archivo = service.repo.obtener_archivo_por_nro(nro_archivo)
    if not archivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    return archivo
