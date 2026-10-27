import json
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, UploadFile, File, Form, Header, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.features.auth.service import AuthService
from .parser import MAX_BYTES
from .model import RespuestaBancaria
from .service import RespuestasService

router = APIRouter(prefix='/respuestas-bancarias', tags=['Carga de respuesta bancaria'])


def operador(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Inicie sesión para consultar o imputar respuestas bancarias.')
    if not settings.COOPYA_DB_ENABLED:
        raise HTTPException(503, 'La verificación de sesiones CoopYa no está configurada.')
    perfil = AuthService().obtener_perfil_por_token(authorization)
    if perfil.usuario in ('operador_dev', 'operador_local', 'test_operator'):
        raise HTTPException(401, 'Se requiere una sesión verificada de CoopYa.')
    return perfil.usuario


def datos_archivo(file: UploadFile, asignaciones: str):
    contenido = file.file.read(MAX_BYTES + 1)
    try:
        seleccion = json.loads(asignaciones)
        if not isinstance(seleccion, dict) or len(seleccion) > 10000 or any(
            not str(k).isdigit() or not isinstance(v, str) or len(v) > 36 for k, v in seleccion.items()
        ):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(400, 'Selección de cuotas inválida.') from None
    return contenido, seleccion


@router.post('/previsualizar')
def previsualizar(
    banco: Literal['BAPRO', 'BNA', 'NACION'] = Form(...), lote: int = Form(..., gt=0),
    fecha_cobro: date = Form(...), file: UploadFile = File(...),
    asignaciones: str = Form('{}'), db: Session = Depends(get_db), usuario: str = Depends(operador),
):
    contenido, seleccion = datos_archivo(file, asignaciones)
    return RespuestasService(db).previsualizar(banco, lote, contenido, fecha_cobro, seleccion)


@router.post('/confirmar')
def confirmar(
    banco: Literal['BAPRO', 'BNA', 'NACION'] = Form(...), lote: int = Form(..., gt=0),
    fecha_cobro: date = Form(...), file: UploadFile = File(...),
    revision: str = Form(...), asignaciones: str = Form('{}'),
    db: Session = Depends(get_db), usuario: str = Depends(operador),
):
    contenido, seleccion = datos_archivo(file, asignaciones)
    nombre = (file.filename or 'respuesta.txt').replace('\\', '/').split('/')[-1]
    return RespuestasService(db).confirmar(banco, lote, contenido, fecha_cobro, seleccion, revision, nombre, usuario)


@router.get('')
def historial(db: Session = Depends(get_db), usuario: str = Depends(operador),
              offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    filas = db.query(RespuestaBancaria).order_by(RespuestaBancaria.fecha_carga.desc()).offset(offset).limit(limit).all()
    return [dict(id=r.id, banco=r.banco, lote=r.lote, nombre_archivo=r.nombre_archivo,
                 fecha_cobro=r.fecha_cobro, fecha_carga=r.fecha_carga, operador=r.operador,
                 resumen=r.resumen) for r in filas]


@router.get('/contrato/prestamos/{prestamo_id}')
def contrato_prestamo(prestamo_id: str, db: Session = Depends(get_db), usuario: str = Depends(operador)):
    from app.features.prestamos.model import Prestamo
    from .contrato import exportar_obligaciones
    prestamo = db.get(Prestamo, prestamo_id)
    if not prestamo:
        raise HTTPException(404, 'Préstamo no encontrado.')
    return exportar_obligaciones(prestamo)


@router.get('/{id}/archivo')
def descargar_original(id: str, db: Session = Depends(get_db), usuario: str = Depends(operador)):
    carga = db.get(RespuestaBancaria, id)
    if not carga or carga.archivo_original is None:
        raise HTTPException(404, 'Archivo original no disponible para esta carga.')
    return Response(content=carga.archivo_original, media_type='application/octet-stream',
                    headers={'Content-Disposition': 'attachment; filename="respuesta-original.txt"',
                             'Cache-Control': 'no-store'})


@router.get('/{id}')
def detalle(id: str, db: Session = Depends(get_db), usuario: str = Depends(operador)):
    r = db.get(RespuestaBancaria, id)
    if not r:
        raise HTTPException(404, 'Carga no encontrada.')
    return [dict(linea=d.linea, prestamo_id=d.cuota.prestamo_id,
                 persona=d.cuota.prestamo.persona_nombre, persona_id=d.cuota.prestamo.persona_id, numero_cuota=d.cuota.numero_cuota,
                 referencia=d.referencia, codigo=d.codigo, descripcion=d.descripcion,
                 importe_centavos=d.importe_centavos, cobrado_centavos=d.cobrado_centavos,
                 capital_centavos=d.capital_centavos, interes_centavos=d.interes_centavos,
                 iva_centavos=d.iva_centavos, saldo_cuota_centavos=d.saldo_cuota_centavos,
                 estado_cuota=d.estado_cuota) for d in r.detalles]


@router.get('/cuenta-corriente/{persona_id}')
def cuenta_local(persona_id: int, db: Session = Depends(get_db), usuario: str = Depends(operador)):
    from app.features.socios.model import Socio
    from app.features.prestamos.model import Prestamo
    from app.features.personas.cuenta_corriente import construir_cuenta_corriente_local
    socio = db.get(Socio, persona_id)
    if not socio:
        raise HTTPException(404, 'Persona sin cuenta corriente local.')
    prestamos = db.query(Prestamo).filter_by(persona_id=persona_id).all()
    return construir_cuenta_corriente_local(socio, prestamos)
