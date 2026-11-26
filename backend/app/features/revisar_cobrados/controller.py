"""Reporte web sobre cobros confirmados de la base histórica Oracle."""
from datetime import date, datetime
from decimal import Decimal
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from app.features.auth.controller import obtener_perfil_verificado
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
    fecha_desde: date
    fecha_hasta: date
    tipo_prestamo: Optional[str] = Field(default=None, max_length=200)

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
        if self.fecha_desde > self.fecha_hasta:
            raise ValueError('La fecha de principio no puede superar la fecha tope.')
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


@router.post('')
def consultar(req: FiltrosCobrados):
    """Devuelve el snapshot completo; los filtros por lista se aplican sobre éste."""
    columnas, datos = ejecutar(SQL, {
        'periodo_haber': req.periodo_haber,
        'fecha_desde': datetime.combine(req.fecha_desde, datetime.min.time()),
        'fecha_hasta': datetime.combine(req.fecha_hasta, datetime.min.time()),
        'tipo_prestamo': req.tipo_prestamo or None,
        'lista': None,
    })
    filas = []
    for valores in datos:
        fila = dict(zip((c.lower() for c in columnas), valores))
        importe = fila.pop('importe_cobrado')
        if importe is None:
            raise HTTPException(502, 'Oracle devolvió un cobro sin importe. No se generaron totales parciales.')
        fila['importe_cobrado_centavos'] = int((Decimal(str(importe)) * 100).quantize(Decimal('1')))
        filas.append(fila)
    return {'filas': filas, 'generado': datetime.now().astimezone().isoformat()}
