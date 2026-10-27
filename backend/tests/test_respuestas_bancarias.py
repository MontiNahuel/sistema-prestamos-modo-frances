"""Pruebas aisladas: nunca usan la base configurada ni bancos reales."""
from datetime import date
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from main import app
from app.core.database import Base
from app.features.socios.model import Socio, MedioDePago
from app.features.prestamos.model import Prestamo, Cuota
from app.features.prestamos.cobros import desglose_cobrado
from app.features.personas.cuenta_corriente import construir_cuenta_corriente_local
from app.features.presentaciones_bapro.model import PresentacionBaproArchivo, PresentacionBaproAuditoria
from app.features.presentaciones_bna.model import PresentacionBnaArchivo, PresentacionBnaAuditoria
from app.features.presentaciones_bapro.bapro_layout import BaproRegistroIndividual
from app.features.respuestas_bancarias.parser import parsear
from app.features.respuestas_bancarias.model import RespuestaBancaria, RespuestaBancariaDetalle
from app.features.respuestas_bancarias.service import RespuestasService

FECHA = date(2026, 1, 10)
CBU = '0140123456789012345678'
CBU_BNA = '0110123400123456789010'


@pytest.fixture(autouse=True)
def habilitar_solo_en_pruebas(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, 'RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED', True)


@pytest.fixture
def db():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as session:
        socio = Socio(id=1, nombre_completo='Persona de prueba', documento='123')
        prestamo = Prestamo(id='prestamo-1', socio=socio, persona_nombre=socio.nombre_completo,
            persona_doc=socio.documento, monto_solicitado_centavos=10000, plazo_meses=1,
            tna_pactada=Decimal('.6'), tem_pactada=Decimal('.05'), alicuota_iva=Decimal('.21'),
            total_capital_centavos=10000, total_interes_centavos=2000, total_iva_centavos=420,
            total_a_pagar_centavos=12420, saldo_deudor_actual_centavos=10000, estado='ACTIVO')
        cuota = Cuota(id='cuota-1', prestamo=prestamo, numero_cuota=1, fecha_vencimiento=FECHA,
            saldo_inicial_centavos=10000, capital_centavos=10000, interes_centavos=2000,
            iva_interes_centavos=420, cuota_pura_centavos=12000, cuota_total_centavos=12420,
            saldo_final_centavos=0, estado='PENDIENTE', monto_pagado_centavos=0)
        session.add_all([socio, prestamo, cuota, MedioDePago(socio=socio, tipo=2, valor=CBU_BNA)])
        session.commit()
        yield session
    engine.dispose()


def bapro(db, importes=(12420,), codigos=None):
    a = PresentacionBaproArchivo(nro_archivo=28, ruta='test', nombre_archivo='test.txt')
    db.add(a); db.flush()
    lineas = []
    for i, importe in enumerate(importes, 1):
        referencia = f'28{i:06}'
        db.add(PresentacionBaproAuditoria(presentacion_archivo_id=a.id, cuota_id='cuota-1',
            id_persona=1, nro_archivo=28, numero_operacion=i, fecha_vencimiento='10012026',
            identificador_cliente='1', bloque1_cbu=CBU[:8], bloque2_cbu=CBU[8:],
            importe=str(importe).zfill(10), monto_pesos=Decimal(importe)/100,
            descripcion_transaccion='SERVICI014', referencia_debito=referencia, nombre_archivo='test.txt'))
        l = BaproRegistroIndividual.formatear_linea('10012026', 1, CBU, importe, i, 28)
        codigo = (codigos or [''] * len(importes))[i-1]
        lineas.append('72' + l[2:144] + codigo.ljust(3) + l[147:])
    db.commit()
    return '\r\n'.join(lineas).encode()


def bna(importes=(12420,), codigos=('0',), longitud=128):
    cab = ('1' + '0085' + '10' + '0005502347' + 'P' + 'D' + '0101' + '20260110' + 'REE').ljust(longitud)
    detalles = [('2' + '0085CA12345678901' + str(m).zfill(15) + '00000000' + cod + ''.ljust(30) + f'28-{i}'.ljust(10)).ljust(longitud) for i, (m, cod) in enumerate(zip(importes, codigos), 1)]
    ok = [m for m, c in zip(importes, codigos) if c == '0']
    no = [m for m, c in zip(importes, codigos) if c == '9']
    pie = ('3' + str(sum(ok)).zfill(15) + str(len(ok)).zfill(6) + str(sum(no)).zfill(15) + str(len(no)).zfill(6)).ljust(longitud)
    return '\r\n'.join([cab, *detalles, pie]).encode()


def bna_con_presentacion(db, importes=(12420,), codigos=('0',)):
    a = PresentacionBnaArchivo(nro_archivo=28, ruta='test', nombre_archivo='test.txt')
    db.add(a); db.flush()
    for i, (m, cod) in enumerate(zip(importes, codigos), 1):
        db.add(PresentacionBnaAuditoria(
            presentacion_archivo_id=a.id, cuota_id='cuota-1', id_persona=1, nro_archivo=28,
            numero_operacion=i, sucursal_cuenta_cliente='0085', sistema_cuenta='CA',
            nro_cuenta_cliente='12345678901', importe=str(m).zfill(15), monto_pesos=Decimal(m)/100,
            concepto_debito=f'28-{i}', nombre_archivo='test.txt'
        ))
    db.commit()
    return bna(importes, codigos)


def aplicar(service, banco, contenido, asignaciones=None):
    vista = service.previsualizar(banco, 28, contenido, FECHA, asignaciones)
    return service.confirmar(banco, 28, contenido, FECHA, asignaciones, vista['revision'], 'respuesta.txt', 'operador')


def test_vista_no_escribe_y_cobro_impacta_cuenta_corriente(db):
    data = bapro(db)
    service = RespuestasService(db)
    vista = service.previsualizar('BAPRO', 28, data, FECHA)
    assert vista['resumen']['cobrados'] == 1
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0
    assert db.query(RespuestaBancaria).count() == 0
    aplicar(service, 'BAPRO', data)
    p = db.get(Prestamo, 'prestamo-1')
    assert p.saldo_deudor_actual_centavos == 0 and p.estado == 'FINALIZADO'
    cc = construir_cuenta_corriente_local(p.socio, [p])
    assert cc['totales']['saldo'] == 0
    assert cc['totales']['importeCobrado'] == 124.2
    assert cc['movimientos'][0]['origen'] == 'BAPRO'
    assert cc['movimientos'][0]['archivo'] == 'respuesta.txt'


def test_cuenta_sin_cobros_no_inventa_intereses_cobrados(db):
    p = db.get(Prestamo, 'prestamo-1')
    cc = construir_cuenta_corriente_local(p.socio, [p])
    assert cc['totales']['saldo'] == 124.2
    assert cc['totales']['importeCobrado'] == 0


def test_partes_se_acumulan_y_rechazo_no_borra_el_cobro(db):
    data = bapro(db, (6210, 6210), ('', 'R10'))
    aplicar(RespuestasService(db), 'BAPRO', data)
    c = db.get(Cuota, 'cuota-1')
    assert c.estado == 'PARCIAL' and c.monto_pagado_centavos == 6210
    assert c.prestamo.saldo_deudor_actual_centavos == 5000
    cc = construir_cuenta_corriente_local(c.prestamo.socio, [c.prestamo])
    assert cc['totales']['saldo'] == 62.1
    assert cc['totales']['importeCobrado'] == 62.1
    assert cc['totales']['importeRechazado'] == 62.1
    assert cc['desglose'][0]['importePendiente'] == 62.1
    assert cc['periodos'][0]['esParcial'] is True


def test_dos_partes_completan_sin_redondeo_perdido(db):
    data = bapro(db, (6209, 6211))
    aplicar(RespuestasService(db), 'BAPRO', data)
    eventos = db.query(RespuestaBancariaDetalle).all()
    assert sum(e.capital_centavos for e in eventos) == 10000
    assert sum(e.interes_centavos for e in eventos) == 2000
    assert sum(e.iva_centavos for e in eventos) == 420
    assert db.get(Cuota, 'cuota-1').estado == 'PAGADA'


def test_duplicado_y_conflicto_no_modifican_saldo(db):
    data = bapro(db)
    service = RespuestasService(db)
    aplicar(service, 'BAPRO', data)
    vista = service.previsualizar('BAPRO', 28, data, FECHA)
    assert vista['resumen']['duplicados'] == 1
    with pytest.raises(HTTPException):
        aplicar(service, 'BAPRO', data)
    changed = data[:144] + b'R10' + data[147:]
    assert service.previsualizar('BAPRO', 28, changed, FECHA)['filas'][0]['estado'] == 'CONFLICTO'
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 12420


@pytest.mark.parametrize('cambio', ['cbu', 'referencia', 'importe', 'reversion', 'repetida'])
def test_filas_inseguras_no_imputables(db, cambio):
    data = bapro(db)
    if cambio == 'cbu': data = data[:42] + b'9' + data[43:]
    if cambio == 'referencia': data = data[:92] + b'99' + data[94:]
    if cambio == 'importe': data = data[:61] + b'0000000001' + data[71:]
    if cambio == 'reversion': data = b'55' + data[2:]
    if cambio == 'repetida': data = data + b'\n' + data
    vista = RespuestasService(db).previsualizar('BAPRO', 28, data, FECHA)
    assert vista['resumen']['cobrados'] == 0
    assert vista['resumen']['revisar'] == len(vista['filas'])


def test_rechazo_sin_pago_no_reduce_deuda(db):
    aplicar(RespuestasService(db), 'BAPRO', bapro(db, codigos=['R10']))
    c = db.get(Cuota, 'cuota-1')
    assert c.estado == 'RECHAZADA' and c.monto_pagado_centavos == 0
    assert c.prestamo.saldo_deudor_actual_centavos == 10000


def test_vista_obsoleta_se_rechaza(db):
    data = bapro(db)
    service = RespuestasService(db)
    vista = service.previsualizar('BAPRO', 28, data, FECHA)
    c = db.get(Cuota, 'cuota-1'); c.monto_pagado_centavos = 100; db.commit()
    with pytest.raises(HTTPException) as exc:
        service.confirmar('BAPRO', 28, data, FECHA, {}, vista['revision'], 'x.txt', 'op')
    assert exc.value.status_code == 409
    assert db.query(RespuestaBancaria).count() == 0


def test_error_hace_rollback_de_todo(db, monkeypatch):
    data = bapro(db)
    def fallar(_): raise RuntimeError('fallo simulado antes de commit')
    monkeypatch.setattr('app.features.respuestas_bancarias.service.recalcular_saldo', fallar)
    with pytest.raises(RuntimeError): aplicar(RespuestasService(db), 'BAPRO', data)
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0
    assert db.query(RespuestaBancaria).count() == 0
    assert db.query(RespuestaBancariaDetalle).count() == 0
    assert db.query(PresentacionBaproAuditoria).one().codigo_respuesta is None


@pytest.mark.parametrize('longitud', [128, 172])
def test_bna_sin_presentacion_solo_revision(db, longitud):
    data = bna(longitud=longitud)
    service = RespuestasService(db)
    vista = service.previsualizar('BNA', 28, data, FECHA)
    assert vista['resumen']['cobrados'] == 0
    assert not vista['filas'][0]['candidatos']
    assert vista['banco'] == 'NACION' and not vista['confirmacion_habilitada']
    with pytest.raises(HTTPException) as exc:
        aplicar(service, 'BNA', data)
    assert exc.value.status_code == 409
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0


def test_bna_no_permite_asignar_otro_socio_o_sucursal(db):
    with pytest.raises(HTTPException) as exc:
        RespuestasService(db).previsualizar('BNA', 28, bna(), FECHA, {'2': 'cuota-1'})
    assert exc.value.status_code == 400


def test_bna_estado_especial_queda_revision_y_pie_aplicados_separado():
    rows = parsear('BNA', bna((12420, 100, 500), ('0', '9', '7'), 172))
    assert len(rows) == 3 and rows[2]['revision']


@pytest.mark.parametrize('data', [b'', b'archivo incorrecto', bna().replace(b'PD', b'PE', 1), bna()[:-1], bna().replace(b'000000000012420000001', b'000000000012421000001')])
def test_archivos_invalidos_no_se_ignoran(data):
    with pytest.raises(ValueError): parsear('BNA', data)


def test_prorrateo_acumulado_conserva_total(db):
    c = db.get(Cuota, 'cuota-1')
    anterior = (0, 0, 0)
    for pagado in range(1, c.cuota_total_centavos + 1):
        actual = desglose_cobrado(c, pagado)
        assert sum(actual) == pagado
        assert all(a >= b for a, b in zip(actual, anterior))
        # El cierre total conserva exactamente el contrato.
        anterior = actual
    assert anterior == (10000, 2000, 420)


def test_cobro_manual_despues_de_parcial_no_descuenta_capital_dos_veces(db):
    from app.features.prestamos.repository import PrestamoRepository
    from app.features.prestamos.service import PrestamoService
    aplicar(RespuestasService(db), 'BAPRO', bapro(db, (6210,)))
    service = PrestamoService(PrestamoRepository(db), None, None, None, coopya_db=None)
    service.pagar_cuota('prestamo-1', 1)
    cuota = db.get(Cuota, 'cuota-1')
    assert cuota.monto_pagado_centavos == 12420
    assert cuota.prestamo.saldo_deudor_actual_centavos == 0
    cc = construir_cuenta_corriente_local(cuota.prestamo.socio, [cuota.prestamo])
    assert len(cc['movimientos']) == 2
    assert sum(m['montoPesos'] for m in cc['movimientos']) == 124.2


def test_cancelado_no_admite_cobro(db):
    data = bapro(db)
    db.get(Prestamo, 'prestamo-1').estado = 'CANCELADO'
    db.get(Cuota, 'cuota-1').estado = 'CANCELADA'
    db.commit()
    assert RespuestasService(db).previsualizar('BAPRO', 28, data, FECHA)['resumen']['cobrados'] == 0


def test_dos_confirmaciones_concurrentes_solo_cobran_una_vez(db, tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    data = bapro(db)
    engine = create_engine(f'sqlite:///{tmp_path / "concurrencia.db"}', connect_args={'timeout': 10})
    # Copia de datos sintéticos a una base aislada con conexiones independientes.
    with db.get_bind().connect() as origen, engine.connect() as destino:
        origen.connection.driver_connection.backup(destino.connection.driver_connection)
    with Session(engine) as session:
        vista = RespuestasService(session).previsualizar('BAPRO', 28, data, FECHA)
    barrera = Barrier(2)
    def confirmar():
        with Session(engine, autoflush=False) as session:
            barrera.wait()
            try:
                RespuestasService(session).confirmar('BAPRO', 28, data, FECHA, {}, vista['revision'], 'test.txt', 'op')
                return 200
            except HTTPException as exc:
                return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(pool.map(lambda _: confirmar(), range(2)))
    assert sorted(resultados) == [200, 409]
    with Session(engine) as session:
        assert session.query(RespuestaBancariaDetalle).count() == 1
        assert session.get(Cuota, 'cuota-1').monto_pagado_centavos == 12420
    engine.dispose()


def test_api_sin_sesion_rechaza_historial():
    from fastapi import FastAPI
    from app.features.respuestas_bancarias.controller import router
    from fastapi.testclient import TestClient
    api = FastAPI()
    api.include_router(router, prefix='/api/v1')
    with TestClient(api, raise_server_exceptions=False) as client:
        assert client.get('/api/v1/respuestas-bancarias').status_code == 401


def test_http_vista_confirmacion_historial_y_cc_local(db):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.core.database import get_db
    from app.features.respuestas_bancarias.controller import router, operador
    api = FastAPI()
    api.include_router(router)
    api.dependency_overrides[get_db] = lambda: db
    api.dependency_overrides[operador] = lambda: 'operador-prueba'
    data = bapro(db)
    with TestClient(api) as client:
        campos = {'banco': 'BAPRO', 'lote': '28', 'fecha_cobro': FECHA.isoformat()}
        preview = client.post('/respuestas-bancarias/previsualizar', data=campos, files={'file': ('test.txt', data)})
        assert preview.status_code == 200, preview.text
        assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0
        campos['revision'] = preview.json()['revision']
        respuesta = client.post('/respuestas-bancarias/confirmar', data=campos, files={'file': ('test.txt', data)})
        assert respuesta.status_code == 200, respuesta.text
        carga = client.get('/respuestas-bancarias').json()[0]
        assert carga['operador'] == 'operador-prueba'
        detalles = client.get('/respuestas-bancarias/' + carga['id']).json()
        assert detalles[0]['capital_centavos'] == 10000
        cuenta = client.get('/respuestas-bancarias/cuenta-corriente/1')
        assert cuenta.status_code == 200, cuenta.text
        assert cuenta.json()['totales']['saldo'] == 0
        original = client.get('/respuestas-bancarias/' + carga['id'] + '/archivo')
        assert original.status_code == 200 and original.content == data


def test_confirmacion_deshabilitada_no_escribe(db, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, 'RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED', False)
    data = bapro(db)
    service = RespuestasService(db)
    assert not service.previsualizar('BAPRO', 28, data, FECHA)['confirmacion_habilitada']
    with pytest.raises(HTTPException) as exc:
        aplicar(service, 'BAPRO', data)
    assert exc.value.status_code == 503
    assert db.query(RespuestaBancaria).count() == 0


def test_identificador_cliente_no_se_infiere_de_referencia(db):
    data = bapro(db)
    cambiado = data[:10] + b'00000000000002' + data[24:]
    assert RespuestasService(db).previsualizar('BAPRO', 28, cambiado, FECHA)['resumen']['cobrados'] == 0


def test_fila_conflictiva_aborta_lote_completo(db):
    data = bapro(db, (6210, 6210))
    filas = data.split(b'\r\n')
    # Una cuota válida y otra con importe distinto del presentado.
    filas[1] = filas[1][:61] + b'0000000001' + filas[1][71:]
    with pytest.raises(HTTPException) as exc:
        aplicar(RespuestasService(db), 'BAPRO', b'\r\n'.join(filas))
    assert exc.value.status_code == 409
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0
    assert db.query(RespuestaBancaria).count() == 0


def test_no_segunda_carga_del_mismo_lote(db):
    data = bapro(db, (6210, 6210))
    filas = data.split(b'\r\n')
    aplicar(RespuestasService(db), 'BAPRO', filas[0])
    with pytest.raises(HTTPException) as exc:
        aplicar(RespuestasService(db), 'BAPRO', filas[1])
    assert exc.value.status_code == 409
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 6210


def test_contrato_preserva_uuid_y_socio_entero_sin_inventar_equivalencia(db):
    from app.features.respuestas_bancarias.contrato import exportar_obligaciones
    doc = exportar_obligaciones(db.get(Prestamo, 'prestamo-1'))
    assert doc['prestamo_id'] == 'prestamo-1'
    assert doc['socio_id_local'] == 1 and doc['id_persona_coopya'] is None
    assert doc['plan_id_coopya'] is None
    assert doc['obligaciones'][0]['importe_total'] == '124.20'
    assert doc['obligaciones'][0]['capital'] == '100.00'


def test_nacion_v2_moneda_numerica_y_pie_presentado():
    from app.features.respuestas_bancarias.contrato import filas_tvp
    data = bna((1500000, 950000), ('0', '9')).replace(b'PD', b'1D').replace(b'CA', b'02')
    filas = data.split(b'\r\n')
    filas[-1] = b'3' + b'000000002450000000002' + filas[-1][22:]
    rows = parsear('NACION', b'\r\n'.join(filas))
    assert rows[0]['convencion_pie'] == 'PRESENTADOS'
    tvp = filas_tvp('NACION', rows)
    assert tvp[0]['Det_Importe'] == '000000001500000'
    assert tvp[0]['Det_SistemaCuenta'] == '02'
    assert tvp[1]['CodigoRespuesta'] == '9'


def test_bapro_tvp_ceros_iniciales(db):
    from app.features.respuestas_bancarias.contrato import filas_tvp
    rows = parsear('BAPRO', bapro(db))
    tvp = filas_tvp('BAPRO', rows)
    assert tvp[0]['IdentificadorCliente'] == '1'
    assert tvp[0]['CodigoRespuesta'] == 'OK'
    assert not tvp[0]['EsReversion']


@pytest.mark.parametrize('banco', ['BAPRO', 'NACION'])
def test_ejemplos_v2_contra_tvp_documentado(banco):
    import json
    from pathlib import Path
    from app.features.respuestas_bancarias.contrato import filas_tvp
    carpeta = Path(__file__).resolve().parents[2] / 'docs' / 'coopya-v2' / 'ejemplos' / banco / 'caso-01'
    rows = parsear(banco, (carpeta / 'respuesta.txt').read_bytes())
    esperado = json.loads((carpeta / 'tvp_imputacion.json').read_text(encoding='utf-8-sig'))
    actual = filas_tvp(banco, rows)
    # El JSON V2 de Nación añade descripción, ausente del tipo tabla SQL real.
    assert actual == [{k: row[k] for k in actual[i]} for i, row in enumerate(esperado)]


def test_original_y_ledger_se_revierten_juntos(db, monkeypatch):
    data = bapro(db)
    def fallar():
        raise RuntimeError('fallo de commit')
    monkeypatch.setattr(db, 'commit', fallar)
    with pytest.raises(RuntimeError):
        aplicar(RespuestasService(db), 'BAPRO', data)
    assert db.query(RespuestaBancaria).count() == 0
    assert db.get(Cuota, 'cuota-1').monto_pagado_centavos == 0


def test_bna_con_presentacion_vincula_e_imputa(db):
    data = bna_con_presentacion(db)
    service = RespuestasService(db)
    vista = service.previsualizar('BNA', 28, data, FECHA)
    assert vista['resumen']['cobrados'] == 1
    assert vista['filas'][0]['estado'] == 'COBRAR'
    assert vista['filas'][0]['persona'] == 'Persona de prueba'
    assert vista['filas'][0]['cuota_id'] == 'cuota-1'
    aplicar(service, 'BNA', data)
    assert db.get(Cuota, 'cuota-1').estado == 'PAGADA'
    assert db.query(PresentacionBnaArchivo).filter_by(nro_archivo=28).one().estado == 'RENDIDO'
