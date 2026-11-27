"""Reporte web sobre cobros confirmados de la base histórica Oracle."""
from datetime import date, datetime
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator, model_validator
from app.features.auth.controller import obtener_perfil_verificado
from app.features.auth.schemas import UserProfileResponse
from app.features.revisar_cobrados import historico
from app.integrations.oracle_client import oracle_client

router = APIRouter(
    prefix='/reportes/revisar-cobrados',
    tags=['Reportes'],
    dependencies=[Depends(obtener_perfil_verificado)],
)
logger = logging.getLogger(__name__)
SQL = Path(__file__).with_name('consulta.sql').read_text(encoding='utf-8')


class FiltrosCobrados(BaseModel):
    periodo_haber: Optional[str] = Field(default=None, max_length=6)
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    tipo_prestamo: Optional[str] = Field(default=None, max_length=200)
    banco_id: Optional[int] = Field(default=None, ge=0)

    @field_validator('periodo_haber')
    @classmethod
    def periodo_valido(cls, valor):
        """Acepta todos los períodos o un mes AAAAMM válido."""
        if valor is None or not valor.strip():
            return None
        if len(valor) != 6 or not valor.isascii() or not valor.isdigit():
            raise ValueError('El período debe tener formato AAAAMM.')
        if not 1 <= int(valor[-2:]) <= 12 or int(valor[:4]) < 1900:
            raise ValueError('El período haber no es válido.')
        return valor

    @model_validator(mode='after')
    def rango_valido(self):
        """Rechaza rangos invertidos de generación."""
        if self.fecha_desde and self.fecha_hasta and self.fecha_desde > self.fecha_hasta:
            raise ValueError('La fecha desde no puede ser posterior a la fecha hasta.')
        return self


def ejecutar(sql, params=None):
    """Consulta Oracle con binds, sin incluir detalles de conexión en errores HTTP."""
    try:
        return oracle_client.ejecutar_consulta(sql, params)
    except Exception as exc:
        logger.exception('No se pudo ejecutar el reporte Revisar cobrados en Oracle')
        if not oracle_client.enabled:
            detalle = 'Oracle está deshabilitado en el backend (ORACLE_ENABLED=false).'
        elif not getattr(oracle_client, '_thick_initialized', False):
            detalle = 'El backend no inicializó Oracle Instant Client. Revisá el log de inicio del servicio.'
        elif 'no está instalado' in str(exc).lower():
            detalle = 'Falta instalar python-oracledb en el backend.'
        else:
            detalle = 'No se pudo conectar o consultar Oracle. Revisá conectividad, credenciales y el log del backend.'
        raise HTTPException(503, detalle) from None


@router.get('/tipos')
def tipos():
    """Carga el catálogo de tipos desde la misma vista histórica."""
    _, filas = ejecutar('SELECT DISTINCT tipo_prestamo FROM prestaprod.MV_PRESTAMOS_MORA_COMPLETA WHERE tipo_prestamo IS NOT NULL ORDER BY tipo_prestamo')
    return [fila[0] for fila in filas]


@router.get('/bancos')
def bancos():
    """Usa el identificador de canal de salida de las presentaciones MP."""
    _, filas = ejecutar('SELECT idcanalcobro, descripcion FROM prestaprod.mp_canalcobro WHERE descripcion IS NOT NULL ORDER BY descripcion')
    return [{'id': 0, 'nombre': 'BNA'}] + [{'id': id_canal, 'nombre': nombre} for id_canal, nombre in filas]


@router.post('', status_code=202)
def consultar(req: FiltrosCobrados, perfil: UserProfileResponse = Depends(obtener_perfil_verificado)):
    """Prepara el resultado completo sin bloquear la petición web."""
    consulta = historico.iniciar(perfil.id, SQL, req.model_dump(mode='json'), {
        'periodo_haber': req.periodo_haber,
        'fecha_desde': datetime.combine(req.fecha_desde, datetime.min.time()) if req.fecha_desde else None,
        'fecha_hasta': datetime.combine(req.fecha_hasta, datetime.min.time()) if req.fecha_hasta else None,
        'tipo_prestamo': req.tipo_prestamo or None,
        'banco_id': req.banco_id,
        'lista': None,
    })
    return {'id': consulta.id}


@router.get('/consultas/{id_consulta}')
def detalle(
    id_consulta: str, pagina: int = 1, lista: Optional[str] = None, incluir_listas: bool = False,
    perfil: UserProfileResponse = Depends(obtener_perfil_verificado),
):
    if pagina < 1 or pagina > 1_000_000:
        raise HTTPException(422, 'Página inválida.')
    consulta = historico.obtener(id_consulta, perfil.id)
    if consulta.estado == 'error':
        raise HTTPException(503, 'No se pudo preparar el reporte con Oracle. Intentá nuevamente.')
    return historico.detalle(consulta, pagina, lista, incluir_listas)


@router.post('/consultas/{id_consulta}/excel', status_code=202)
def preparar_excel(
    id_consulta: str, lista: Optional[str] = None,
    perfil: UserProfileResponse = Depends(obtener_perfil_verificado),
):
    consulta = historico.obtener(id_consulta, perfil.id)
    return {'estado': historico.iniciar_excel(consulta, lista)}


@router.get('/consultas/{id_consulta}/excel')
def excel(
    id_consulta: str, lista: Optional[str] = None, descargar: bool = False,
    perfil: UserProfileResponse = Depends(obtener_perfil_verificado),
):
    consulta = historico.obtener(id_consulta, perfil.id)
    if consulta.lista_excel != lista or consulta.estado_excel in ('pendiente', 'error'):
        raise HTTPException(409, 'El Excel no está disponible. Volvé a prepararlo.')
    if not descargar or consulta.estado_excel != 'lista':
        return {'estado': consulta.estado_excel}
    return FileResponse(
        consulta.excel, filename='revisar-cobrados.xlsx',
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Cache-Control': 'private, no-store'},
    )
