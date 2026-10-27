import hashlib
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import text, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.features.prestamos.model import Cuota, Prestamo
from app.features.prestamos.cobros import desglose_cobrado, recalcular_saldo
from app.features.presentaciones_bapro.model import PresentacionBaproArchivo, PresentacionBaproAuditoria
from .model import RespuestaBancaria, RespuestaBancariaDetalle
from .parser import parsear


def huella(valor):
    return hashlib.sha256(json.dumps(valor, sort_keys=True, ensure_ascii=True, default=str).encode()).hexdigest()


def bloquear_cobranzas(db):
    """Serializa importaciones y cobros manuales; lock liberado con commit/rollback."""
    dialecto = db.get_bind().dialect.name
    if dialecto == 'mssql':
        result = db.execute(text("""
            SET NOCOUNT ON;
            IF @@TRANCOUNT = 0 BEGIN TRANSACTION;
            DECLARE @r int;
            EXEC @r = sp_getapplock @Resource='prestamos:cobranzas',
                @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
            SELECT @r;
        """)).scalar()
        if result is None or result < 0:
            raise HTTPException(409, 'Hay otra cobranza en curso. Reintente.')
    elif dialecto == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))
    else:
        raise HTTPException(503, 'Bloqueo de cobranzas no configurado para esta base.')


class RespuestasService:
    def __init__(self, db):
        self.db = db

    def previsualizar(self, banco, lote, contenido, fecha_cobro, asignaciones=None):
        if lote <= 0 or fecha_cobro > date.today():
            raise HTTPException(400, 'Indique un lote positivo y una fecha de cobro no futura.')
        try:
            registros = parsear(banco, contenido)
        except (ValueError, UnicodeError) as exc:
            raise HTTPException(400, str(exc)) from exc
        banco = 'NACION' if banco == 'BNA' else banco
        if asignaciones:
            raise HTTPException(400, 'El destino debe provenir de la presentación; no se admiten asignaciones manuales.')
        auditorias = {}
        avisos = ['Integración CoopYa V2 pendiente de homologación. No escribe en CoopYa central.']
        if not settings.RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED:
            avisos.append('Confirmación deshabilitada: solamente revisión hasta completar la homologación.')
        if banco == 'BAPRO':
            archivo = self.db.query(PresentacionBaproArchivo).filter_by(nro_archivo=lote).first()
            if not archivo:
                raise HTTPException(404, 'No existe esa presentación BAPRO local.')
            for a in self.db.query(PresentacionBaproAuditoria).filter_by(nro_archivo=lote):
                auditorias.setdefault(a.referencia_debito.strip(), []).append(a)
        else:
            avisos.append('Nación: solo revisión. Falta persistir la presentación original y su vínculo a cada obligación; no se infieren cuotas por CBU.')
        # Sólo leer los préstamos referidos por este archivo, no toda la cartera.
        objetivos = sorted({a.cuota_id for matches in auditorias.values() for a in matches if a.cuota_id})
        prestamos = {}
        for inicio in range(0, len(objetivos), 1000):
            grupo = objetivos[inicio:inicio+1000]
            filtro = Prestamo.id.in_(select(Cuota.prestamo_id).where(Cuota.id.in_(grupo)))
            for p in self.db.query(Prestamo).options(selectinload(Prestamo.cuotas)).filter(filtro).order_by(Prestamo.id):
                prestamos[p.id] = p
        cuotas = {c.id: c for p in prestamos.values() for c in p.cuotas}
        claves = []
        for r in registros:
            if banco == 'BAPRO':
                claves.append(huella([banco, r['cuit'], r['referencia']]))
            else:
                claves.append(huella([banco, lote, r['sucursal'], r['sistema'], r['numero_cuenta'], r['importe_bancario']]))
        repeticiones = Counter(claves)
        existentes = {}
        # SQL Server admite como máximo 2100 parámetros.
        for inicio in range(0, len(claves), 1000):
            for d in self.db.query(RespuestaBancariaDetalle).filter(
                RespuestaBancariaDetalle.banco == banco,
                RespuestaBancariaDetalle.clave_operacion.in_(claves[inicio:inicio+1000]),
            ):
                existentes[d.clave_operacion] = d
        filas = []
        acumulado = defaultdict(int)
        for registro, clave in zip(registros, claves):
            r = dict(registro, clave=clave, estado='REVISAR', motivo='', cuota_id=None,
                     persona=None, prestamo_id=None, numero_cuota=None, candidatos=[])
            r['huella'] = huella({k: v for k, v in registro.items() if k != 'linea'})
            anterior = existentes.get(clave)
            if anterior:
                r.update(estado='DUPLICADA' if anterior.huella_respuesta == r['huella'] else 'CONFLICTO',
                         motivo='Operación ya registrada.' if anterior.huella_respuesta == r['huella'] else 'La operación ya tiene otra respuesta. Requiere conciliación.',
                         cuota_id=anterior.cuota_id)
            elif repeticiones[clave] > 1:
                r['motivo'] = 'Operación repetida dentro del archivo: no se imputa automáticamente.'
            elif r['revision']:
                r['motivo'] = 'Reversión o código especial: requiere revisión; no modifica saldos.'
            elif r['importe_centavos'] <= 0:
                r['motivo'] = 'Importe cero: no se puede imputar.'
            else:
                cuota = None
                if banco == 'BAPRO':
                    matches = [a for a in auditorias.get(r['referencia'], [])
                               if normalizar_cliente(a.identificador_cliente) == r['identificador_cliente']]
                    if len(matches) == 1:
                        a = matches[0]
                        r['auditoria_id'] = a.id
                        if (a.bloque1_cbu + a.bloque2_cbu != r['cuenta']
                            or a.cuit_empresa != r['cuit'] or int(a.importe) != r['importe_centavos']):
                            r['motivo'] = 'CBU, CUIT o importe distintos de la presentación.'
                        elif a.codigo_respuesta:
                            r['motivo'] = 'La presentación ya fue rendida por el circuito anterior; conciliar antes de cargar.'
                        else:
                            cuota = cuotas.get(a.cuota_id)
                    if len(matches) > 1:
                        r.update(estado='CONFLICTO', motivo='Más de un detalle coincide con referencia y cliente. Se bloquea todo el lote.')
                    if not cuota and not r['motivo']:
                        r['motivo'] = 'Referencia sin una cuota local única en el lote indicado.'
                else:
                    r['motivo'] = 'Sin presentación Nación persistida: no se permite seleccionar ni inferir una cuota.'
                if cuota:
                    p = cuota.prestamo
                    r.update(cuota_id=cuota.id, persona=p.persona_nombre or str(p.persona_id),
                             persona_id=p.persona_id, documento=p.persona_doc,
                             prestamo_id=p.id, numero_cuota=cuota.numero_cuota,
                             estado_actual=cuota.estado, pagado_actual=cuota.monto_pagado_centavos,
                             saldo_actual=cuota.cuota_total_centavos - cuota.monto_pagado_centavos,
                             estado_prestamo=p.estado)
                    if (cuota.capital_centavos + cuota.interes_centavos + cuota.iva_interes_centavos != cuota.cuota_total_centavos
                        or min(cuota.capital_centavos, cuota.interes_centavos, cuota.iva_interes_centavos, cuota.monto_pagado_centavos) < 0):
                        r['motivo'] = 'Los componentes de la cuota no concilian. Requiere revisión.'
                    elif p.estado not in ('ACTIVO', 'MORA') or cuota.estado in ('PAGADA', 'CANCELADA'):
                        r['motivo'] = 'La cuota o el préstamo ya no admite imputaciones.'
                    elif r['aceptado'] and r['importe_centavos'] + acumulado[cuota.id] > r['saldo_actual']:
                        r['motivo'] = 'El total a imputar supera el saldo de la cuota (incluye otras filas de este archivo).'
                    else:
                        r.update(estado='COBRAR' if r['aceptado'] else 'RECHAZAR', motivo='')
                        if r['aceptado']:
                            acumulado[cuota.id] += r['importe_centavos']
            filas.append(r)
        resumen = dict(total=len(filas), cobrados=sum(r['estado'] == 'COBRAR' for r in filas),
                       rechazados=sum(r['estado'] == 'RECHAZAR' for r in filas),
                       duplicados=sum(r['estado'] == 'DUPLICADA' for r in filas),
                       revisar=sum(r['estado'] in ('REVISAR', 'CONFLICTO') for r in filas),
                       importe_centavos=sum(r['importe_centavos'] for r in filas if r['estado'] == 'COBRAR'))
        return dict(banco=banco, lote=lote, fecha_cobro=fecha_cobro.isoformat(), resumen=resumen,
                    confirmacion_habilitada=settings.RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED and banco == 'BAPRO' and resumen['revisar'] == 0,
                    filas=filas, avisos=avisos, revision=huella([banco, lote, fecha_cobro, filas]),
                    sha256=hashlib.sha256(contenido).hexdigest())

    def confirmar(self, banco, lote, contenido, fecha_cobro, asignaciones, revision, nombre, operador):
        try:
            if not settings.RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED:
                raise HTTPException(503, 'Confirmación bancaria deshabilitada hasta homologar la integración CoopYa V2.')
            banco = 'NACION' if banco == 'BNA' else banco
            if banco != 'BAPRO':
                raise HTTPException(409, 'Nación requiere presentación persistida y vínculo previo a las obligaciones. Solo revisión.')
            bloquear_cobranzas(self.db)
            self.db.expire_all()
            vista = self.previsualizar(banco, lote, contenido, fecha_cobro, asignaciones)
            if vista['revision'] != revision:
                raise HTTPException(409, 'Los datos cambiaron. Vuelva a previsualizar antes de confirmar.')
            if vista['resumen']['revisar']:
                raise HTTPException(409, 'El lote contiene incidencias. No se aplica ninguna fila; resuelva la revisión completa.')
            if self.db.query(RespuestaBancaria).filter_by(banco=banco, lote=lote).first():
                raise HTTPException(409, 'La presentación ya tiene una respuesta. Una nueva rendición o reversión requiere conciliación.')
            aplicables = [r for r in vista['filas'] if r['estado'] in ('COBRAR', 'RECHAZAR')]
            if not aplicables:
                raise HTTPException(400, 'No hay registros nuevos listos para imputar.')
            carga = RespuestaBancaria(banco=banco, lote=lote, nombre_archivo=nombre[:200],
                sha256=vista['sha256'], fecha_cobro=fecha_cobro, operador=operador,
                resumen=vista['resumen'], archivo_original=contenido)
            self.db.add(carga)
            self.db.flush()
            prestamos = {}
            for r in aplicables:
                cuota = self.db.get(Cuota, r['cuota_id'])
                previo = desglose_cobrado(cuota)
                if r['aceptado']:
                    cuota.monto_pagado_centavos += r['importe_centavos']
                    # Persistencia UTC, sin convertir el día de cobro argentino al anterior.
                    fecha_pago = datetime.combine(fecha_cobro, datetime.min.time(),
                        tzinfo=timezone(timedelta(hours=-3))).astimezone(timezone.utc).replace(tzinfo=None)
                    cuota.fecha_pago = max(cuota.fecha_pago or fecha_pago, fecha_pago)
                    cuota.estado = 'PAGADA' if cuota.monto_pagado_centavos == cuota.cuota_total_centavos else 'PARCIAL'
                elif not cuota.monto_pagado_centavos:
                    cuota.estado = 'RECHAZADA'
                nuevo = desglose_cobrado(cuota)
                self.db.add(RespuestaBancariaDetalle(carga_id=carga.id, banco=banco,
                    clave_operacion=r['clave'], huella_respuesta=r['huella'], linea=r['linea'],
                    cuota_id=cuota.id, referencia=r['referencia'], codigo=r['codigo'],
                    descripcion=r['descripcion'][:250], importe_centavos=r['importe_centavos'],
                    cobrado_centavos=r['importe_centavos'] if r['aceptado'] else 0,
                    capital_centavos=nuevo[0]-previo[0], interes_centavos=nuevo[1]-previo[1],
                    iva_centavos=nuevo[2]-previo[2], saldo_cuota_centavos=cuota.cuota_total_centavos-cuota.monto_pagado_centavos,
                    estado_cuota=cuota.estado))
                prestamos[cuota.prestamo_id] = cuota.prestamo
                if banco == 'BAPRO':
                    a = self.db.get(PresentacionBaproAuditoria, r['auditoria_id'])
                    a.codigo_respuesta, a.fecha_respuesta = r['codigo'], datetime.utcnow()
            for p in prestamos.values():
                recalcular_saldo(p)
            if banco == 'BAPRO':
                self.db.flush()
                pendientes = self.db.query(PresentacionBaproAuditoria).filter_by(nro_archivo=lote, codigo_respuesta=None).count()
                archivo = self.db.query(PresentacionBaproArchivo).filter_by(nro_archivo=lote).one()
                archivo.estado = 'RENDIDO_PARCIAL' if pendientes else 'RENDIDO'
            self.db.commit()
            return dict(id=carga.id, **vista['resumen'])
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(409, 'Una operación ya fue registrada. Vuelva a previsualizar.') from exc
        except Exception:
            self.db.rollback()
            raise


def normalizar_cliente(valor):
    """Identificador numérico BAPRO sin ceros iniciales (rango BIGINT)."""
    try:
        n = int(str(valor).strip())
        return str(n) if -(2**63) <= n < 2**63 else None
    except (ValueError, TypeError):
        return None
