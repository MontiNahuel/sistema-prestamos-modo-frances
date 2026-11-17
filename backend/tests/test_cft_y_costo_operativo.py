from datetime import date
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from main import app
from app.core.config import settings
from app.core.database import Base
from app.domain.calculadoras.cft import calcular_cft_flujos
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import ConvencionTasa, ModalidadIva, TipoCostoOperativo
from app.features.empresas.model import EmpresaOriginante
from app.features.presentaciones_bapro.bapro_layout import BaproRegistroIndividual
from app.features.presentaciones_bapro.service import PresentacionBaproService
from app.features.presentaciones_bapro.schemas import GenerarPresentacionBaproRequest
from app.features.prestamos.cobros import desglose_cobrado_completo
from app.features.prestamos.model import Cuota, Prestamo
from app.features.prestamos.repository import PrestamoRepository
from app.features.prestamos.schemas import PrestamoCreate
from app.features.prestamos.service import PrestamoService
from app.features.respuestas_bancarias.service import RespuestasService
from app.features.socios.model import MedioDePago, Socio
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService

client = TestClient(app)


@pytest.fixture
def db_aislada():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as session:
        session.add(
            EmpresaOriginante(
                cuit="30690754386",
                razon_social="COOPCREDITOYALTD",
                prefijo_archivo="EBT_TEST_",
                descripcion_transaccion="SERVICI014",
                activo=True,
                predeterminado=True,
            )
        )
        session.commit()
        yield session
    engine.dispose()


def test_cft_sin_iva_ni_costo_operativo_coincide_con_tna_y_tea():
    plan = CalculadoraFrances.calcular(
        monto_centavos=10_000_000,
        plazo_meses=12,
        tasa_anual=Decimal("0.60"),
        alicuota_iva=Decimal("0.21"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TNA_PROPORCIONAL, modalidad_iva=ModalidadIva.EXENTO),
    )
    assert plan.total_costo_operativo_centavos == 0
    assert abs(float(plan.cft_tna) - float(plan.tna)) < 0.0005
    assert abs(float(plan.cft_tea) - float(plan.tea)) < 0.0005


def test_cft_y_costo_operativo_fijo_y_porcentaje():
    base = CalculadoraFrances.calcular(
        monto_centavos=10_000_000,
        plazo_meses=6,
        tasa_anual=Decimal("0.60"),
        alicuota_iva=Decimal("0.21"),
    )
    assert base.cft_tea > base.tea
    assert base.cft_tna > base.tna

    fijo = CalculadoraFrances.calcular(
        monto_centavos=10_000_000,
        plazo_meses=6,
        tasa_anual=Decimal("0.60"),
        alicuota_iva=Decimal("0.21"),
        costo_operativo_tipo=TipoCostoOperativo.FIJO,
        costo_operativo_centavos=150_000,  # $1.500 por cuota
    )
    assert fijo.total_costo_operativo_centavos == 900_000
    assert fijo.total_a_pagar_centavos == base.total_a_pagar_centavos + 900_000
    assert fijo.cft_tea > base.cft_tea
    assert fijo.cronograma[-1].saldo_final_centavos == 0
    for c_base, c_fijo in zip(base.cronograma, fijo.cronograma):
        assert c_fijo.capital_centavos == c_base.capital_centavos
        assert c_fijo.costo_operativo_centavos == 150_000
        assert (
            c_fijo.capital_centavos + c_fijo.interes_centavos + c_fijo.iva_interes_centavos + c_fijo.costo_operativo_centavos
            == c_fijo.cuota_total_centavos
        )

    porcentaje = CalculadoraFrances.calcular(
        monto_centavos=10_000_000,
        plazo_meses=6,
        tasa_anual=Decimal("0.60"),
        alicuota_iva=Decimal("0.21"),
        costo_operativo_tipo=TipoCostoOperativo.PORCENTAJE,
        costo_operativo_porcentaje=Decimal("0.015"),  # 1.5% s/capital = $1.500 por cuota
    )
    assert porcentaje.total_costo_operativo_centavos == 900_000
    assert porcentaje.cft_tea == fijo.cft_tea


def test_cft_tasa_cero_sin_cargos():
    cft_tna, cft_tea = calcular_cft_flujos(100_000, [50_000, 50_000])
    assert cft_tna == Decimal("0")
    assert cft_tea == Decimal("0")


def test_romi_comercial_con_costo_operativo_mantiene_exactitud_y_sube_cft():
    plan_sin = CalculadoraFrances.calcular(
        monto_centavos=15_000_000,
        plazo_meses=9,
        tasa_anual=Decimal("4.1459"),
        alicuota_iva=Decimal("0.21"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365),
    )
    plan_con = CalculadoraFrances.calcular(
        monto_centavos=15_000_000,
        plazo_meses=9,
        tasa_anual=Decimal("4.1459"),
        alicuota_iva=Decimal("0.21"),
        config=MotorConfig(convencion_tasa=ConvencionTasa.TASA_ROMI_COMERCIAL_365),
        costo_operativo_tipo=TipoCostoOperativo.FIJO,
        costo_operativo_centavos=200_000,
    )
    assert plan_con.total_costo_operativo_centavos == 1_800_000
    assert plan_con.cft_tea > plan_sin.cft_tea
    for c in plan_con.cronograma:
        assert (
            c.capital_centavos + c.interes_centavos + c.iva_interes_centavos + c.costo_operativo_centavos
            == c.cuota_total_centavos
        )


def test_api_simulacion_costo_operativo_vacio_toma_cero():
    resp_none = client.post(
        "/api/v1/simulaciones",
        json={
            "monto_centavos": 5_000_000,
            "plazo_meses": 3,
            "tna": 0.60,
            "alicuota_iva": 0.21,
            "costo_operativo_tipo": "FIJO",
            "costo_operativo_centavos": None,
            "costo_operativo_porcentaje": None,
        },
    )
    assert resp_none.status_code == 200, resp_none.text
    d0 = resp_none.json()
    assert d0["total_costo_operativo_centavos"] == 0
    assert Decimal(str(d0["cft_tea"])) > Decimal(str(d0["tea"]))

    resp_con_costo = client.post(
        "/api/v1/simulaciones",
        json={
            "monto_centavos": 5_000_000,
            "plazo_meses": 3,
            "tna": 0.60,
            "alicuota_iva": 0.21,
            "costo_operativo_tipo": "PORCENTAJE",
            "costo_operativo_porcentaje": 0.02,  # 2% mensual = $1.000/cuota
        },
    )
    assert resp_con_costo.status_code == 200
    d1 = resp_con_costo.json()
    assert d1["total_costo_operativo_centavos"] == 300_000
    assert Decimal(str(d1["cft_tea"])) > Decimal(str(d0["cft_tea"]))


def test_prorrateo_monotono_con_costo_operativo():
    c = Cuota(
        id="q1",
        prestamo_id="p1",
        numero_cuota=1,
        saldo_inicial_centavos=10000,
        capital_centavos=10000,
        interes_centavos=2000,
        iva_interes_centavos=420,
        costo_operativo_centavos=1500,
        cuota_pura_centavos=12000,
        cuota_total_centavos=13920,
        saldo_final_centavos=0,
        monto_pagado_centavos=0,
    )
    anterior = (0, 0, 0, 0)
    for pagado in range(1, c.cuota_total_centavos + 1):
        actual = desglose_cobrado_completo(c, pagado)
        assert sum(actual) == pagado
        assert all(a >= b for a, b in zip(actual, anterior))
        anterior = actual
    assert anterior == (10000, 2000, 420, 1500)


def test_conciliacion_respuesta_bapro_con_costo_operativo(db_aislada, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED", True)
    monkeypatch.setattr(PresentacionBaproService, "STORAGE_DIR", str(tmp_path))

    srv_prestamo = PrestamoService(
        repository=PrestamoRepository(db_aislada),
        linea_repository=None,
        motor_repository=None,
        socio_service=SocioService(SocioRepository(db_aislada)),
        coopya_db=None,
    )
    prestamo = srv_prestamo.otorgar_prestamo(
        PrestamoCreate(
            persona_id=501,
            persona_nombre="GOMEZ, LAURA",
            persona_doc="30123456",
            cbu="0140055703713750696968",
            monto_solicitado_centavos=1_000_000,
            plazo_meses=2,
            tna_pactada=Decimal("0.60"),
            alicuota_iva=Decimal("0.21"),
            fecha_primer_vencimiento=date(2026, 12, 10),
            costo_operativo_tipo=TipoCostoOperativo.FIJO,
            costo_operativo_centavos=100_000,
            incluir_cuota_social=False,
        )
    )
    assert prestamo.total_costo_operativo_centavos == 200_000
    assert Decimal(str(prestamo.cft_tea)) > Decimal("0")

    cuota_1 = sorted(prestamo.cuotas, key=lambda x: x.numero_cuota)[0]
    assert cuota_1.costo_operativo_centavos == 100_000

    bapro_srv = PresentacionBaproService(db_aislada)
    _, _ = bapro_srv.generar_presentacion_bapro(
        GenerarPresentacionBaproRequest(cuota_ids=[cuota_1.id], nro_lista=401, fecha_impacto="2026-12-10")
    )
    base_linea = BaproRegistroIndividual.formatear_linea(
        "10122026",
        501,
        "0140055703713750696968",
        cuota_1.cuota_total_centavos,
        1,
        401,
    )
    linea_ok = "72" + base_linea[2:]
    assert len(linea_ok) == 163

    resp_srv = RespuestasService(db_aislada)
    vista = resp_srv.previsualizar("BAPRO", 401, linea_ok.encode("ascii"), date(2026, 1, 10))
    assert vista["resumen"]["revisar"] == 0, vista["filas"]
    assert vista["resumen"]["cobrados"] == 1
    res = resp_srv.confirmar("BAPRO", 401, linea_ok.encode("ascii"), date(2026, 1, 10), None, vista["revision"], "r.txt", "tester")
    assert res["cobrados"] == 1
    db_aislada.refresh(cuota_1)
    assert cuota_1.estado == "PAGADA"
    detalle = cuota_1.respuestas_bancarias[0]
    assert detalle.costo_operativo_centavos == 100_000
    assert (
        detalle.capital_centavos + detalle.interes_centavos + detalle.iva_centavos + detalle.costo_operativo_centavos
        == cuota_1.cuota_total_centavos
    )
