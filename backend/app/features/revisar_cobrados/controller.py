"""Reporte web sobre cobros confirmados de la base histórica Oracle."""
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from app.features.respuestas_bancarias.controller import operador
from app.integrations.oracle_client import oracle_client

router = APIRouter(prefix='/reportes/revisar-cobrados', tags=['Reportes'])
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
    except Exception:
        raise HTTPException(503, 'No se pudo consultar la base histórica Oracle. Verificá la conexión e intentá nuevamente.') from None


@router.get('/tipos')
def tipos(usuario: str = Depends(operador)):
    """Carga el catálogo de tipos desde la misma vista histórica."""
    _, filas = ejecutar('SELECT DISTINCT tipo_prestamo FROM prestaprod.MV_PRESTAMOS_MORA_COMPLETA WHERE tipo_prestamo IS NOT NULL ORDER BY tipo_prestamo')
    return [fila[0] for fila in filas]


@router.post('')
def consultar(req: FiltrosCobrados, usuario: str = Depends(operador)):
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
