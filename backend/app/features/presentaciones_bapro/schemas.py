from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------
# Schemas para DNI Excluidos (Lista Negra BAPRO)
# ---------------------------------------------------------
class DniExcluidoBaproBase(BaseModel):
    dni: str = Field(..., max_length=20, description="DNI a excluir de presentaciones BAPRO")
    motivo: Optional[str] = Field(None, max_length=250, description="Motivo de la exclusión")


class DniExcluidoBaproCreate(DniExcluidoBaproBase):
    pass


class DniExcluidoBaproResponse(DniExcluidoBaproBase):
    id: int
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Schemas para Filtro Masivo de Personas
# ---------------------------------------------------------
class PresentacionFiltroMasivoBaproBase(BaseModel):
    id_persona: int = Field(..., description="ID de la persona en CoopYa")
    usuario_id: int = Field(..., description="ID del usuario que realiza la selección")


class PresentacionFiltroMasivoBaproCreate(PresentacionFiltroMasivoBaproBase):
    pass


class PresentacionFiltroMasivoBaproResponse(PresentacionFiltroMasivoBaproBase):
    id: int
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Schemas para Detalle de Auditoría BAPRO (Renglón de Débito)
# ---------------------------------------------------------
class PresentacionBaproAuditoriaBase(BaseModel):
    cuota_id: Optional[str] = Field(None, description="UUID de la cuota local asociada")
    id_persona: int
    nro_archivo: int
    numero_operacion: int
    codigo_interno: str = "71"
    fecha_vencimiento: str = Field(..., max_length=8, description="DDMMAAAA")
    identificador_cliente: str = Field(..., max_length=22)
    tipo_dato: str = "P"
    bloque1_cbu: str = Field(..., max_length=8)
    bloque2_cbu: str = Field(..., max_length=14)
    importe: str = Field(..., max_length=10, description="Centavos con ceros a la izquierda")
    monto_pesos: Decimal
    cuit_empresa: str = "30690754386"
    descripcion_transaccion: str = "SERVICI014"
    referencia_debito: str = Field(..., max_length=15)
    nuevo_identificador_cliente: Optional[str] = None
    codigo_respuesta: Optional[str] = None
    nombre_empresa: str = "COOPCREDITOYALTD"
    comunicacion_entes: Optional[str] = None
    tipo_exportacion: Optional[str] = "Seleccionados"
    tipo_importe: Optional[str] = "Prestamo"
    nombre_archivo: str
    usuario_id: Optional[int] = None
    fecha_respuesta: Optional[datetime] = None
    id_corrida: Optional[str] = None
    sumar_mora: bool = False
    coopya_auditoria_id: Optional[int] = None


class PresentacionBaproAuditoriaCreate(PresentacionBaproAuditoriaBase):
    presentacion_archivo_id: int


class PresentacionBaproAuditoriaResponse(PresentacionBaproAuditoriaBase):
    id: int
    presentacion_archivo_id: int
    fecha_generacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Schemas para Archivo / Lote de Presentación BAPRO (Cabecera)
# ---------------------------------------------------------
class PresentacionBaproArchivoBase(BaseModel):
    nro_archivo: int
    ruta: str
    tipo: str = "BAPRO"
    total_registros: int = 0
    total_monto: Decimal = Decimal("0.00")
    usuario_id: Optional[int] = None
    estado: str = "GENERADO"
    nombre_archivo: str


class PresentacionBaproArchivoCreate(PresentacionBaproArchivoBase):
    pass


class PresentacionBaproArchivoResponse(PresentacionBaproArchivoBase):
    id: int
    fecha_generacion: datetime

    model_config = ConfigDict(from_attributes=True)


class PresentacionBaproArchivoDetalleResponse(PresentacionBaproArchivoResponse):
    detalles: List[PresentacionBaproAuditoriaResponse] = []


# ---------------------------------------------------------
# Schemas de Búsqueda y Filtros
# ---------------------------------------------------------
class PresentacionBaproFiltroQuery(BaseModel):
    nro_archivo: Optional[int] = None
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    estado: Optional[str] = None
    skip: int = 0
    limit: int = 50
