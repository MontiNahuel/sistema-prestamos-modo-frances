"""Copia temporal del resultado Oracle para paginar y exportar sin repetir la consulta."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
import logging
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import HTTPException
import xlsxwriter

from app.integrations.oracle_client import oracle_client

logger = logging.getLogger(__name__)
_directorio = TemporaryDirectory(prefix='prestamos-cobrados-')
_trabajadores = ThreadPoolExecutor(max_workers=2, thread_name_prefix='cobrados')
_lock = Lock()
_consultas = {}
TAMANIO_PAGINA = 50
FILAS_EXCEL = 1_048_575


@dataclass
class Consulta:
    id: str
    operador_id: int
    filtros: dict
    generado: str
    acceso: float
    estado: str = 'procesando'
    estado_excel: str = 'pendiente'
    lista_excel: str | None = None

    @property
    def db(self) -> Path:
        return Path(_directorio.name) / f'{self.id}.sqlite'

    @property
    def excel(self) -> Path:
        return Path(_directorio.name) / f'{self.id}.xlsx'


def _limpiar() -> None:
    vencimiento = monotonic() - 1800
    for id_consulta, consulta in list(_consultas.items()):
        if consulta.acceso < vencimiento and (
            consulta.estado != 'procesando' and consulta.estado_excel != 'procesando'
        ):
            consulta.db.unlink(missing_ok=True)
            consulta.excel.unlink(missing_ok=True)
            del _consultas[id_consulta]


def iniciar(operador_id: int, sql: str, filtros: dict, parametros: dict) -> Consulta:
    with _lock:
        _limpiar()
        previa = next((c for c in _consultas.values() if c.operador_id == operador_id and c.estado == 'procesando'), None)
        if previa and previa.filtros == filtros:
            return previa
        if previa:
            raise HTTPException(409, 'Ya tenés una consulta en curso.')
        if sum(c.estado == 'procesando' for c in _consultas.values()) >= 2:
            raise HTTPException(429, 'Hay varias consultas de cobrados en curso. Probá de nuevo en unos minutos.')
        if len(_consultas) >= 8:
            disponibles = [c for c in _consultas.values() if c.estado != 'procesando' and c.estado_excel != 'procesando']
            if not disponibles:
                raise HTTPException(429, 'Hay varios reportes en preparación. Probá de nuevo en unos minutos.')
            anterior = min(disponibles, key=lambda c: c.acceso)
            anterior.db.unlink(missing_ok=True)
            anterior.excel.unlink(missing_ok=True)
            del _consultas[anterior.id]
        consulta = Consulta(uuid4().hex, operador_id, filtros, datetime.now().astimezone().isoformat(), monotonic())
        _consultas[consulta.id] = consulta
        _trabajadores.submit(_cargar, consulta, sql, parametros)
        return consulta


def obtener(id_consulta: str, operador_id: int) -> Consulta:
    with _lock:
        _limpiar()
        consulta = _consultas.get(id_consulta)
        if consulta is None or consulta.operador_id != operador_id:
            raise HTTPException(404, 'La consulta ya no está disponible. Volvé a consultar.')
        consulta.acceso = monotonic()
        return consulta


def _convertir(fila):
    (origen, banco, lista, id_lista, importe, id_cobro, id_registro, prestamo, cuota,
     periodo, generacion, tipo, aplicacion, cuenta, producto, plan, importe_aplicado, dni, movimiento) = fila
    if importe is None:
        raise ValueError('Oracle devolvió un cobro sin importe')
    return (
        origen, banco, lista, id_lista, _centavos(importe), id_cobro, id_registro, prestamo, cuota,
        periodo, generacion.isoformat(), tipo, aplicacion.isoformat() if aplicacion else None, cuenta, producto,
        plan, _centavos(importe_aplicado) if importe_aplicado is not None else None,
        dni, movimiento.isoformat() if movimiento else None,
    )


def _centavos(importe) -> int:
    return int((Decimal(str(importe)) * 100).quantize(Decimal('1')))


def _cargar(consulta: Consulta, sql: str, parametros: dict) -> None:
    try:
        with closing(sqlite3.connect(consulta.db)) as db:
            db.execute('''
                CREATE TABLE detalle (
                    fuente_cobro TEXT, banco TEXT, lista_cobro TEXT, id_lista INTEGER,
                    importe_cobrado_centavos INTEGER NOT NULL, id_cobro INTEGER,
                    id_registro INTEGER, idprestamo INTEGER, idcuota INTEGER,
                    periodohaber TEXT, fechageneracion TEXT, tipo_prestamo TEXT,
                    fecha_aplicacion TEXT, numero_cuenta TEXT, tipo_producto TEXT,
                    plan_producto TEXT, importe_aplicado_centavos INTEGER,
                    dni TEXT, fecha_movimiento TEXT
                )
            ''')
            with oracle_client.cursor_consulta(sql, parametros, lote=5000) as cursor:
                while lote := cursor.fetchmany(5000):
                    db.executemany(
                        'INSERT INTO detalle VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        map(_convertir, lote),
                    )
            db.executescript('''
                CREATE INDEX ix_detalle_lista ON detalle(lista_cobro);
                CREATE TABLE listas AS
                SELECT lista_cobro AS lista, COUNT(*) AS registros,
                       SUM(importe_cobrado_centavos) AS cobrado
                FROM detalle GROUP BY lista_cobro;
                CREATE UNIQUE INDEX ix_listas ON listas(lista);
            ''')
            db.commit()
        estado = 'lista'
    except Exception:
        logger.exception('Falló la preparación de Revisar cobrados')
        consulta.db.unlink(missing_ok=True)
        estado = 'error'
    with _lock:
        consulta.estado = estado
        consulta.acceso = monotonic()


def _por_lista(lista: str | None) -> tuple[str, tuple]:
    return (' WHERE lista_cobro = ?', (lista,)) if lista else ('', ())


def detalle(consulta: Consulta, pagina: int, lista: str | None, incluir_listas: bool) -> dict:
    if consulta.estado != 'lista':
        return {'estado': consulta.estado}
    where, params = _por_lista(lista)
    with closing(sqlite3.connect(consulta.db)) as db:
        db.row_factory = sqlite3.Row
        filas = db.execute(
            f'SELECT * FROM detalle{where} ORDER BY rowid LIMIT ? OFFSET ?',
            (*params, TAMANIO_PAGINA, (pagina - 1) * TAMANIO_PAGINA),
        ).fetchall()
        resumen = db.execute(
            'SELECT COUNT(*), COALESCE(SUM(registros), 0), COALESCE(SUM(cobrado), 0) FROM listas'
            + (' WHERE lista = ?' if lista else ''), params,
        ).fetchone()
        respuesta = {
            'estado': 'lista', 'filas': [dict(f) for f in filas], 'generado': consulta.generado,
            'cantidad_listas': resumen[0], 'registros': resumen[1], 'cobrado': resumen[2],
        }
        if incluir_listas:
            respuesta['listas'] = [dict(f) for f in db.execute('SELECT * FROM listas ORDER BY lista')]
        return respuesta


def iniciar_excel(consulta: Consulta, lista: str | None) -> str:
    with _lock:
        if consulta.estado != 'lista':
            raise HTTPException(409, 'Los resultados todavía no están listos.')
        if consulta.estado_excel == 'procesando':
            if consulta.lista_excel != lista:
                raise HTTPException(409, 'Ya se está preparando otro Excel para esta consulta.')
            return consulta.estado_excel
        if consulta.estado_excel == 'lista' and consulta.lista_excel == lista:
            return consulta.estado_excel
        if sum(c.estado_excel == 'procesando' for c in _consultas.values()) >= 2:
            raise HTTPException(429, 'Hay varios Excel en preparación. Intentá nuevamente en unos minutos.')
        consulta.estado_excel = 'procesando'
        consulta.lista_excel = lista
        _trabajadores.submit(_crear_excel, consulta, lista)
        return consulta.estado_excel


def _crear_excel(consulta: Consulta, lista: str | None) -> None:
    where, params = _por_lista(lista)
    columnas = (
        ('dni', 'DNI'),
        ('numero_cuenta', 'Nro. de cuenta'),
        ('fecha_aplicacion', 'Fecha de aplicación'),
        ('fecha_movimiento', 'Fecha de movimiento'),
        ('importe_cobrado_centavos', 'Importe cobrado'),
        ('idprestamo', 'ID préstamo'),
        ('tipo_producto', 'Tipo de producto'),
        ('plan_producto', 'Plan del producto'),
        ('importe_aplicado_centavos', 'Importe aplicado'),
        ('fechageneracion', 'Fecha de generación'),
        ('tipo_prestamo', 'Tipo de préstamo'),
        ('fuente_cobro', 'Origen'),
        ('banco', 'Banco / canal'),
        ('lista_cobro', 'Lista recuperada'),
        ('id_lista', 'ID lista'),
        ('id_cobro', 'ID cobro'),
        ('id_registro', 'ID registro'),
        ('idcuota', 'Cuota'),
        ('periodohaber', 'Período haber'),
    )
    try:
        with closing(sqlite3.connect(consulta.db)) as db, xlsxwriter.Workbook(str(consulta.excel), {
            'constant_memory': True, 'strings_to_formulas': False, 'strings_to_urls': False,
            'tmpdir': _directorio.name, 'use_zip64': True,
        }) as libro:
            db.row_factory = sqlite3.Row
            cabecera = libro.add_format({'bold': True, 'font_color': 'white', 'bg_color': '#1E3A8A'})
            dinero = libro.add_format({'num_format': '"$" #,##0.00'})
            fecha = libro.add_format({'num_format': 'dd/mm/yyyy hh:mm:ss'})
            condiciones = libro.add_worksheet('Condiciones')
            condiciones.set_column(0, 0, 22)
            condiciones.set_column(1, 1, 45)
            condiciones.write_row(0, 0, ['Filtro', 'Valor'], cabecera)
            condiciones_rows = [
                ('Fuente', 'Oracle histórico'),
                ('Período haber', consulta.filtros.get('periodo_haber') or 'Todos'),
                ('Generación desde', consulta.filtros.get('fecha_desde') or 'Sin límite'),
                ('Generación hasta (inclusive)', consulta.filtros.get('fecha_hasta') or 'Sin límite'),
                ('Tipo de préstamo', consulta.filtros.get('tipo_prestamo') or 'Todos'),
                ('Lista', lista or 'Todas'),
                ('Consulta', consulta.generado),
                ('Fechas contables', 'Aplicación: actualización del cobro del mismo día. Movimiento: fecha del asiento en cuenta corriente.'),
                ('Importe cobrado', 'Para MP es el importe ajustado de cada registro OK de la presentación. Puede incluir cuota social.'),
            ]
            for i, fila in enumerate(condiciones_rows, 1):
                condiciones.write_row(i, 0, fila)

            resumen = libro.add_worksheet('Cobrado por lista')
            resumen.set_column(0, 0, 34)
            resumen.set_column(1, 2, 18)
            resumen.freeze_panes(1, 0)
            resumen.write_row(0, 0, ['Lista', 'Registros', 'Cobrado'], cabecera)
            grupos = db.execute('SELECT * FROM listas' + (' WHERE lista = ?' if lista else '') + ' ORDER BY lista', params)
            for i, (nombre, cantidad, total) in enumerate(grupos, 1):
                resumen.write_row(i, 0, [nombre, cantidad])
                resumen.write_number(i, 2, total / 100, dinero)

            hoja = None
            for i, valores in enumerate(db.execute(f'SELECT * FROM detalle{where} ORDER BY rowid', params)):
                parte, fila = divmod(i, FILAS_EXCEL)
                if fila == 0:
                    hoja = libro.add_worksheet('Detalle' if parte == 0 else f'Detalle {parte + 1}')
                    hoja.freeze_panes(1, 0)
                    hoja.set_column(0, len(columnas) - 1, 21)
                    hoja.set_column(1, 1, 26)
                    hoja.set_column(6, 7, 34)
                    hoja.set_column(13, 13, 34)
                    hoja.write_row(0, 0, [titulo for _, titulo in columnas], cabecera)
                for columna, (campo, _) in enumerate(columnas):
                    valor = valores[campo]
                    if valor is None:
                        continue
                    if campo in ('importe_cobrado_centavos', 'importe_aplicado_centavos'):
                        hoja.write_number(fila + 1, columna, valor / 100, dinero)
                    elif campo in ('fecha_aplicacion', 'fecha_movimiento', 'fechageneracion'):
                        hoja.write_datetime(fila + 1, columna, datetime.fromisoformat(valor), fecha)
                    elif campo in ('dni', 'numero_cuenta'):
                        hoja.write_string(fila + 1, columna, valor)
                    else:
                        hoja.write(fila + 1, columna, valor)
        estado = 'lista'
    except Exception:
        logger.exception('Falló la exportación de Revisar cobrados')
        consulta.excel.unlink(missing_ok=True)
        estado = 'error'
    with _lock:
        consulta.estado_excel = estado
        consulta.acceso = monotonic()
