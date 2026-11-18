"""Pruebas de separación de desglose en Cuenta Corriente y seguridad referencial de tipo_bancos."""
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main  # noqa: F401 - registra todos los modelos en Base.metadata
from app.core.database import Base
from app.features.personas.cuenta_corriente import (
    construir_cuenta_corriente_local,
    fusionar_cuenta_corriente,
    normalizar_cuenta_corriente_central,
)
from app.features.prestamos.model import Cuota, Prestamo
from app.features.socios.model import MedioDePago, Socio, TipoBanco
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService
from app.services.seed_service import seed_tipo_bancos


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_fusion_cuenta_corriente_separa_prestamos_y_elimina_espejos_duplicados(db):
    socio = Socio(id=164000, nombre_completo="CHIRINO, SILVIA MARCELA", documento="21840808")
    db.add(socio)
    prestamo = Prestamo(
        id="p-frances-1",
        numero_prestamo=123,
        persona_id=164000,
        persona_nombre="CHIRINO SILVIA MARCELA",
        persona_doc="21840808",
        monto_solicitado_centavos=10000000,
        plazo_meses=2,
        tna_pactada=Decimal("0.6000"),
        tem_pactada=Decimal("0.050000"),
        alicuota_iva=Decimal("0.2100"),
        total_capital_centavos=10000000,
        total_interes_centavos=900000,
        total_iva_centavos=189000,
        total_a_pagar_centavos=11089000,
        saldo_deudor_actual_centavos=10000000,
        estado="ACTIVO",
    )
    db.add(prestamo)
    db.add_all([
        Cuota(
            id="c-1",
            prestamo_id="p-frances-1",
            numero_cuota=1,
            fecha_vencimiento=date(2026, 11, 10),
            saldo_inicial_centavos=10000000,
            capital_centavos=4800000,
            interes_centavos=500000,
            iva_interes_centavos=105000,
            cuota_pura_centavos=5300000,
            cuota_total_centavos=5405000,
            saldo_final_centavos=5200000,
            estado="PAGADA",
            monto_pagado_centavos=5405000,
            fecha_pago=datetime(2026, 11, 10, tzinfo=timezone.utc),
            movimiento_coopya_id=506276,
            desglose_coopya_id=159076,
        ),
        Cuota(
            id="c-2",
            prestamo_id="p-frances-1",
            numero_cuota=2,
            fecha_vencimiento=date(2026, 12, 10),
            saldo_inicial_centavos=5200000,
            capital_centavos=5200000,
            interes_centavos=400000,
            iva_interes_centavos=84000,
            cuota_pura_centavos=5600000,
            cuota_total_centavos=5684000,
            saldo_final_centavos=0,
            estado="PENDIENTE",
            monto_pagado_centavos=0,
            movimiento_coopya_id=506277,
            desglose_coopya_id=159077,
        ),
    ])
    db.commit()

    local_cc = construir_cuenta_corriente_local(socio, [prestamo])
    assert len(local_cc["desglosePrestamos"]) == 2
    assert local_cc["desgloseCentral"] == []
    assert local_cc["desglosePrestamos"][0]["numeroPrestamo"] == 123
    assert local_cc["desglosePrestamos"][0]["capitalPesos"] == 48000.0

    # CoopYa devuelve cuotas centrales reales + espejos MANUAL del préstamo francés
    coopya_cc = {
        "persona": {"id": 164000, "apellido": "CHIRINO", "nombre": "SILVIA", "numeroDoc": "21840808"},
        "totales": {
            "saldo": 10000.0, "obligacionMensual": 5500.0, "totalObligaciones": 15500.0,
            "importeCobrado": 54050.0, "importeRechazado": 0.0, "importePendiente": 62340.0,
            "movimientos": 3, "cobrados": 1, "rechazados": 0, "pendientes": 2, "manuales": 0, "algunaConMora": False,
        },
        "conceptos": [{"concepto": "CUOTA_SOCIAL", "planNombre": "Cuota Social", "valorMensual": 5500.0}],
        "periodos": [],
        "movimientos": [
            {"id": 490181, "banco": "BAPRO", "origen": "BAPRO", "concepto": "CUOTA_SOCIAL", "montoPesos": 5500.0, "estado": "PENDIENTE"},
            {"id": 506276, "banco": "MANUAL", "origen": "MANUAL", "concepto": "SERVICIO", "motivo": "Préstamo Francés #p-france - Cuota 1/2", "montoPesos": 54050.0, "estado": "COBRADO", "esManual": 0},
            {"id": 506277, "banco": "MANUAL", "origen": "MANUAL", "concepto": "SERVICIO", "motivo": "Préstamo Francés #p-france - Cuota 2/2", "montoPesos": 56840.0, "estado": "PENDIENTE", "esManual": 0},
        ],
        "desglose": [
            {"id": 129141, "idMovimiento": 490181, "banco": "BAPRO", "concepto": "CUOTA_SOCIAL", "planNombre": "Pack Premium", "numeroCuota": 7, "importePresentado": 5500.0, "importeCobrado": 0.0, "importePendiente": 5500.0, "estado": "PENDIENTE", "origen": "BANCARIO"},
            {"id": 159076, "idMovimiento": 506276, "banco": "MANUAL", "concepto": "SERVICIO", "planNombre": None, "numeroCuota": 1, "cantidadCuotas": 2, "importePresentado": 54050.0, "importeCobrado": 54050.0, "importePendiente": 0.0, "estado": "COBRADO", "origen": "MANUAL", "motivo": "Cuota 1/2 Sistema Francés"},
            {"id": 999999, "idMovimiento": 888888, "banco": "MANUAL", "concepto": "SERVICIO", "planNombre": None, "numeroCuota": 2, "cantidadCuotas": 2, "importePresentado": 56840.0, "importeCobrado": 0.0, "importePendiente": 56840.0, "estado": "PENDIENTE", "origen": "MANUAL", "motivo": "Cuota 2/2 Sistema Francés (Cap: $52,000.00)"},
        ],
    }

    fusion = fusionar_cuenta_corriente(coopya_cc, local_cc)

    # Cuotas de préstamos separadas y limpias
    assert len(fusion["desglosePrestamos"]) == 2
    assert all(d["origen"] == "SISTEMA_FRANCES" for d in fusion["desglosePrestamos"])

    # Sistema central contiene únicamente CUOTA_SOCIAL real, sin préstamos ni espejos MANUAL
    assert len(fusion["desgloseCentral"]) == 1
    assert fusion["desgloseCentral"][0]["concepto"] == "CUOTA_SOCIAL"

    # Movimientos no duplica los espejos de CoopYa
    assert [m["id"] for m in fusion["movimientos"]] == [490181, "c-1"]

    # Totales no duplican los $54.050 ni las cuotas espejo
    assert fusion["totales"]["cobrados"] == 1
    assert fusion["totales"]["importeCobrado"] == 54050.0
    assert fusion["totales"]["pendientes"] == 2  # 1 BAPRO + 1 cuota préstamo pendiente


def test_normalizar_central_sin_prestamos_locales():
    coopya_cc = {
        "movimientos": [
            {"id": 10, "banco": "ICBC", "concepto": "CUOTA_SOCIAL", "montoPesos": 5500.0, "estado": "COBRADO"},
            {"id": 11, "banco": "MANUAL", "motivo": "Préstamo Francés #abc - Cuota 1/3", "montoPesos": 1000.0, "estado": "PENDIENTE"},
        ],
        "desglose": [
            {"id": 1, "banco": "ICBC", "concepto": "CUOTA_SOCIAL", "origen": "BANCARIO", "importePresentado": 5500.0, "importeCobrado": 5500.0, "importePendiente": 0.0, "estado": "COBRADO"},
            {"id": 2, "banco": "MANUAL", "concepto": "SERVICIO", "origen": "MANUAL", "motivo": "Cuota 1/3 Sistema Francés", "importePresentado": 1000.0, "importeCobrado": 0.0, "importePendiente": 1000.0, "estado": "PENDIENTE"},
        ],
    }
    res = normalizar_cuenta_corriente_central(coopya_cc)
    assert res["desglosePrestamos"] == []
    assert len(res["desgloseCentral"]) == 1
    assert res["desgloseCentral"][0]["concepto"] == "CUOTA_SOCIAL"
    assert [m["id"] for m in res["movimientos"]] == [10]


def test_sincronizar_socio_cbu_no_falla_fk_si_tipo_bancos_vacio_y_seed_es_idempotente(db):
    service = SocioService(SocioRepository(db))

    # 1. Caso exacto del bug reportado: tipo_bancos vacío + CBU 014 (BAPRO)
    assert db.query(TipoBanco).count() == 0
    socio = service.sincronizar_socio_titular(
        persona_id=165602,
        nombre_completo="SOCIO PRUEBA BAPRO",
        documento="30111222",
        cbu="0140152903700553604203",
    )
    db.commit()
    assert socio.id == 165602
    medio = db.query(MedioDePago).filter_by(socio_id=165602).one()
    assert medio.banco_id is None  # No viola FK con un 5 inexistente

    # 2. Seed idempotente puebla los 39 bancos oficiales
    seed_tipo_bancos(db)
    seed_tipo_bancos(db)
    assert db.query(TipoBanco).count() == 39

    # 3. Ahora CBU 014 resuelve BAPRO (id 5) y CBU 011 resuelve NACION (id 3)
    service.sincronizar_socio_titular(
        persona_id=165603,
        nombre_completo="SOCIO BAPRO OK",
        documento="30111223",
        cbu="0140152903700553604203",
    )
    service.sincronizar_socio_titular(
        persona_id=165604,
        nombre_completo="SOCIO NACION OK",
        documento="30111224",
        cbu="0110599520000012345678",
    )
    # banco_id inexistente explícito tampoco rompe FK
    service.sincronizar_socio_titular(
        persona_id=165605,
        nombre_completo="SOCIO BANCO DESCONOCIDO",
        documento="30111225",
        cbu="9990000000000000000000",
        banco_id=999,
    )
    db.commit()

    assert db.query(MedioDePago).filter_by(socio_id=165603).one().banco_id == 5
    assert db.query(MedioDePago).filter_by(socio_id=165604).one().banco_id == 3
    assert db.query(MedioDePago).filter_by(socio_id=165605).one().banco_id is None


def test_buscar_personas_por_nro_socio(monkeypatch):
    from fastapi.testclient import TestClient
    from main import app
    from app.integrations.coopya_client import coopya_client
    from app.integrations.coopya_db_client import coopya_db_client

    llamadas = []

    async def fake_buscar_personas(
        nombre_apellido="",
        documento="",
        id_persona=None,
        nro_socio=None,
        token=None,
    ):
        llamadas.append(
            {
                "nombre_apellido": nombre_apellido,
                "documento": documento,
                "id_persona": id_persona,
                "nro_socio": nro_socio,
            }
        )
        catalogo = [
            {"idPersona": 165601, "nroSocio": 4321, "apellido": "MONTI", "nombre": "NAHUEL", "numeroDoc": "44798591", "cuil": "20447985919", "estadoNombre": "Activo", "calle": "", "localidadId": 1, "mediosDePago": []},
            {"idPersona": 165999, "nroSocio": 9999, "apellido": "OTRO", "nombre": "SOCIO", "numeroDoc": "30111222", "cuil": "20301112229", "estadoNombre": "Activo", "calle": "", "localidadId": 1, "mediosDePago": []},
        ]
        if id_persona is not None:
            return [p for p in catalogo if p["idPersona"] == id_persona]
        return catalogo

    monkeypatch.setattr(coopya_client, "buscar_personas", fake_buscar_personas)

    client = TestClient(app)

    # 1. Resolución vía SQL dbo.Personas (NroSocio -> IdPersona)
    monkeypatch.setattr(coopya_db_client, "buscar_persona_ids_por_nro_socio", lambda n: [165601] if n == 4321 else [])
    res_db = client.post("/api/v1/personas/buscar", json={"nroSocio": 4321})
    assert res_db.status_code == 200
    assert len(res_db.json()) == 1
    assert res_db.json()[0]["idPersona"] == 165601
    assert res_db.json()[0]["nroSocio"] == 4321
    assert llamadas[-1]["id_persona"] == 165601

    # 2. NroSocio inexistente en SQL retorna lista vacía sin falsos positivos
    res_vacio = client.post("/api/v1/personas/buscar", json={"nroSocio": 7777})
    assert res_vacio.status_code == 200
    assert res_vacio.json() == []

    # 3. Fallback cuando CoopYa DB no está disponible: filtra por nroSocio devuelto por la API
    monkeypatch.setattr(coopya_db_client, "buscar_persona_ids_por_nro_socio", lambda _n: None)
    res_fb = client.post("/api/v1/personas/buscar", json={"nroSocio": 4321})
    assert res_fb.status_code == 200
    assert [p["idPersona"] for p in res_fb.json()] == [165601]
    assert llamadas[-1]["nro_socio"] == 4321
