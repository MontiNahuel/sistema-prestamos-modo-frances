from datetime import datetime, date
from decimal import Decimal
import pytest
from main import app  # Inicializa todos los modelos de SQLAlchemy
from app.features.prestamos.model import Prestamo, Cuota
from app.features.socios.model import Socio, MedioDePago, TipoBanco
from app.features.empresas.model import EmpresaOriginante
from app.features.presentaciones_bapro.bapro_layout import (
    BaproRegistroIndividual,
    RepartidorDePartes,
    ParseadorRespuestaBapro,
    CodigosDeRechazo,
)
from app.features.presentaciones_bapro.service import PresentacionBaproService
from app.features.presentaciones_bapro.schemas import GenerarPresentacionBaproRequest


def test_bapro_layout_formatear_linea():
    linea = BaproRegistroIndividual.formatear_linea(
        fecha_vencimiento_ddmmaaaa="28102026",
        identificador_cliente=147598,
        cbu="0140055703713750696968",
        importe_centavos=3366000,
        numero_operacion=1,
        nro_lista=15521,
        cuit_empresa="30690754386",
        descripcion_transaccion="SERVICI014",
        nombre_empresa="COOPCREDITOYALTD",
    )
    assert len(linea) == 163
    esperada = (
        "7128102026000000147598                "
        "P0140055703713750696968000336600030690754386"
        "SERVICI01415521000001                                            "
        "COOPCREDITOYALTD"
    )
    assert linea == esperada
    assert linea.startswith("7128102026000000147598")
    assert "15521000001" in linea
    assert linea.endswith("COOPCREDITOYALTD")


def test_bapro_layout_cbu_invalido_rechaza():
    with pytest.raises(ValueError, match="no pertenece a Banco Provincia"):
        BaproRegistroIndividual.formatear_linea(
            fecha_vencimiento_ddmmaaaa="05122026",
            identificador_cliente=1,
            cbu="0070303703694950708052",  # Banco Galicia
            importe_centavos=10000,
            numero_operacion=1,
        )


def test_repartidor_de_partes_invariante_centavos():
    # 5500.01 = 550001 centavos
    partes = RepartidorDePartes.repartir(550001, 2)
    assert len(partes) == 2
    assert partes[0] == 275000
    assert partes[1] == 275001
    assert sum(partes) == 550001


def test_parseador_respuesta_bapro_ok():
    # 163 chars: código 72, pos 144..147 vacío
    linea = (
        "720512202600000000077519              "
        "P0140303703694950708052000055000030690754386"
        "SERVICI014cs0000000005601                                     "
        "   COOPCREDITOYALTD"
    )
    parsed = ParseadorRespuestaBapro.parsear_linea(linea)
    assert parsed is not None
    assert parsed["codigo_interno"] == "72"
    assert parsed["es_ok"] is True
    assert parsed["codigo_respuesta"] == "OK"
    assert parsed["numero_operacion"] == 5601
    assert parsed["importe_centavos"] == 550000


def test_parseador_respuesta_bapro_rechazo():
    # 163 chars con R10 (falta de fondos)
    linea = (
        "720512202600000000077519              "
        "P0140303703694950708052000055000030690754386"
        "SERVICI014cs0000000005601                                     "
        "R10COOPCREDITOYALTD"
    )
    parsed = ParseadorRespuestaBapro.parsear_linea(linea)
    assert parsed is not None
    assert parsed["es_ok"] is False
    assert parsed["codigo_respuesta"] == "R10"
    assert "fondos" in parsed["descripcion_motivo"].lower()


def test_flujo_completo_presentacion_y_rendicion_bapro():
    import uuid
    from app.core.database import SessionLocal
    db_session = SessionLocal()
    try:
        # 1. Crear Socio con CBU BAPRO
        socio_id = 1000000 + (uuid.uuid4().int % 8000000)
        socio = Socio(
            id=socio_id,
            nombre_completo=f"TEST BAPRO SOCIO {socio_id}",
            documento=str(socio_id),
        )
        db_session.add(socio)
        db_session.flush()

        mp = MedioDePago(
            socio_id=socio.id,
            tipo=2,
            valor="0140123456789012345678",
            predeterminado=True,
        )
        db_session.add(mp)

        # 2. Crear Préstamo y Cuota con IDs únicos
        p_id = str(uuid.uuid4())
        c_id = str(uuid.uuid4())

        prestamo = Prestamo(
            id=p_id,
            persona_id=socio.id,
            persona_nombre=socio.nombre_completo,
            persona_doc=socio.documento,
            monto_solicitado_centavos=10000000,
            plazo_meses=1,
            tna_pactada=Decimal("75.0"),
            tem_pactada=Decimal("6.25"),
            alicuota_iva=Decimal("0.21"),
            total_capital_centavos=10000000,
            total_interes_centavos=2000000,
            total_iva_centavos=420000,
            total_a_pagar_centavos=10420000,
            saldo_deudor_actual_centavos=10000000,
            estado="ACTIVO",
        )
        db_session.add(prestamo)
        db_session.flush()

        cuota = Cuota(
            id=c_id,
            prestamo_id=prestamo.id,
            numero_cuota=1,
            fecha_vencimiento=date(2026, 12, 10),
            saldo_inicial_centavos=10000000,
            capital_centavos=8000000,
            interes_centavos=2000000,
            iva_interes_centavos=420000,
            cuota_pura_centavos=10000000,
            cuota_total_centavos=10420000,
            saldo_final_centavos=0,
            estado="PENDIENTE",
        )
        db_session.add(cuota)

        # 3. Empresa Originante
        empresa = db_session.query(EmpresaOriginante).filter_by(cuit="30690754386").first()
        if not empresa:
            empresa = EmpresaOriginante(
                cuit="30690754386",
                razon_social="COOPCREDITOYALTD",
                prefijo_archivo="EBT_COOPCREDITOYALTDA",
                predeterminado=True,
            )
            db_session.add(empresa)
        db_session.commit()

        service = PresentacionBaproService(db_session)

        # 4. Búsqueda de Cuotas Presentables
        busqueda = service.buscar_cuotas_presentables(incluir_presentadas=True)
        cuota_item = next((c for c in busqueda.presentables if c.cuota_id == cuota.id), None)
        assert cuota_item is not None
        assert cuota_item.presentable is True
        assert cuota_item.cbu == "0140123456789012345678"

        # 5. Generación de Presentación
        req = GenerarPresentacionBaproRequest(
            cuota_ids=[cuota.id],
            fecha_impacto="10122026",
            empresa_originante_id=empresa.id,
            numero_operacion_inicial=8001,
        )
        res_gen, contenido_bytes = service.generar_presentacion_bapro(req)
        assert res_gen.total_registros == 1
        assert res_gen.total_monto == Decimal("104200.00")

        # Verificar cuota en estado PRESENTADA
        db_session.refresh(cuota)
        assert cuota.estado == "PRESENTADA"

        # 6. Procesar Rendición Bancaria (Respuesta OK)
        from app.core.config import settings
        settings.RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED = True
        from app.features.respuestas_bancarias.service import RespuestasService
        linea_resp = b'72' + contenido_bytes[2:]
        respuestas = RespuestasService(db_session)
        vista = respuestas.previsualizar('BAPRO', res_gen.nro_archivo, linea_resp, date.today())
        res_resp = respuestas.confirmar('BAPRO', res_gen.nro_archivo, linea_resp,
            date.today(), {}, vista['revision'], 'respuesta-test.txt', 'test')
        assert res_resp['cobrados'] == 1
        assert res_resp['rechazados'] == 0

        # Verificar cuota en estado PAGADA
        db_session.refresh(cuota)
        assert cuota.estado == "PAGADA"
        assert cuota.monto_pagado_centavos == 10420000
        assert cuota.fecha_pago is not None
    finally:
        db_session.close()
