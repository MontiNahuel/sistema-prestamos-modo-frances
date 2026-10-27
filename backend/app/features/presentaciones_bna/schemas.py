from typing import List, Optional
from pydantic import BaseModel, Field


class CuotaPresentableBnaItem(BaseModel):
    cuota_id: str
    prestamo_id: str
    numero_cuota: int
    socio_id: int
    socio_nombre: str
    socio_documento: Optional[str] = None
    cbu: Optional[str] = None
    sucursal_bna: Optional[str] = None
    nro_cuenta_bna: Optional[str] = None
    monto_pesos: float
    monto_centavos: int
    fecha_vencimiento: Optional[str] = None
    estado: str
    presentable: bool
    motivo_exclusion: Optional[str] = None


class BuscarCuotasBnaResponse(BaseModel):
    presentables: List[CuotaPresentableBnaItem]
    excluidas: List[CuotaPresentableBnaItem]
    total_presentables: int
    total_monto_pesos: float


class GenerarPresentacionBnaRequest(BaseModel):
    cuota_ids: List[str]
    nro_lista: Optional[int] = None
    nombre_archivo: Optional[str] = None
    fecha_impacto: Optional[str] = None
    numero_operacion_inicial: int = 1
    casa: str = Field(default="0085", max_length=4)
    producto: str = Field(default="10", max_length=2)
    cuenta: str = Field(default="0005502347", max_length=10)
    indicador_lote: str = Field(default="REE", max_length=3)


class GenerarPresentacionBnaResponse(BaseModel):
    archivo_id: int
    nro_archivo: int
    nombre_archivo: str
    total_registros: int
    total_monto_pesos: float
    ruta_descarga: str


class PresentacionBnaArchivoItem(BaseModel):
    id: int
    nro_archivo: int
    tipo: str
    fecha_generacion: str
    total_registros: int
    total_monto: float
    estado: str
    nombre_archivo: str


class PresentacionBnaAuditoriaItem(BaseModel):
    id: int
    numero_operacion: int
    id_persona: int
    socio_nombre: Optional[str] = None
    sucursal_cuenta_cliente: str
    nro_cuenta_cliente: str
    monto_pesos: float
    concepto_debito: str
    codigo_respuesta: Optional[str] = None
    descripcion_rechazo: Optional[str] = None
    fecha_respuesta: Optional[str] = None


class ProcesarRespuestaBnaResponse(BaseModel):
    archivo_id: int
    total_lineas: int
    actualizados: int
    exitosos: int
    rechazados: int
    no_encontrados: int
    mensaje: str
