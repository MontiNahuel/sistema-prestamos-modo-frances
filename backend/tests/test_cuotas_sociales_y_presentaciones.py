from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base
from app.domain.enums import TipoCuotaPresentacion
from app.features.cuotas_sociales.model import CuotaSocial
from app.features.cuotas_sociales.service import CuotaSocialService
from app.features.empresas.model import EmpresaOriginante
from app.features.personas.cuenta_corriente import construir_cuenta_corriente_local
from app.features.presentaciones_bapro.bapro_layout import BaproRegistroIndividual
from app.features.presentaciones_bapro.schemas import GenerarPresentacionBaproRequest
from app.features.presentaciones_bapro.service import PresentacionBaproService
from app.features.presentaciones_bna.bna_layout import BnaRegistroIndividual
from app.features.presentaciones_bna.schemas import GenerarPresentacionBnaRequest
from app.features.presentaciones_bna.service import PresentacionBnaService
from app.features.prestamos.model import Cuota, Prestamo
from app.features.prestamos.repository import PrestamoRepository
from app.features.prestamos.schemas import PrestamoCreate
from app.features.prestamos.service import PrestamoService
from app.features.respuestas_bancarias.controller import detalle as obtener_detalle_respuesta
from app.features.respuestas_bancarias.service import RespuestasService
from app.features.socios.model import Socio
from app.features.socios.repository import SocioRepository
from app.features.socios.service import SocioService


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as session:
        session.add(
            EmpresaOriginante(
                cuit="30690754386",
                razon_social="COOPCREDITOYALTD",
                prefijo_archivo="EBT_CS_",
                descripcion_transaccion="SERVICI014",
                activo=True,
                predeterminado=True,
            )
        )
        session.commit()
        yield session
    engine.dispose()


def _crear_prestamo(db: Session, persona_id: int, cbu: str, incluir_cs: bool = True, valor_cs: int = 550000, primer_venc: date = date(2026, 11, 10)) -> Prestamo:
    srv = PrestamoService(
        repository=PrestamoRepository(db),
        linea_repository=None,
        motor_repository=None,
        socio_service=SocioService(SocioRepository(db)),
        coopya_db=None,
    )
    return srv.otorgar_prestamo(
        PrestamoCreate(
            persona_id=persona_id,
            persona_nombre="SOCIO, PRUEBA",
            persona_doc="28111222",
            cbu=cbu,
            monto_solicitado_centavos=1_200_000,
            plazo_meses=2,
            tna_pactada=Decimal("0.60"),
            alicuota_iva=Decimal("0.21"),
            fecha_primer_vencimiento=primer_venc,
            incluir_cuota_social=incluir_cs,
            cuota_social_centavos=valor_cs,
        )
    )


def test_cuota_social_activa_al_otorgar_no_duplica_y_respeta_baja(db: Session):
    p1 = _crear_prestamo(db, persona_id=701, cbu="0140055703713750696968", primer_venc=date(2026, 11, 10))
    cs_srv = CuotaSocialService(db)
    estado = cs_srv.obtener_estado_socio(701, generar_actual=False)
    assert estado.activa is True
    assert estado.valor_centavos == 550000
    assert estado.prestamo_id == p1.id
    assert len(estado.cuotas) == 1
    assert estado.cuotas[0].periodo == "2026-11"

    # Un segundo préstamo en el mismo mes no duplica el período
    _crear_prestamo(db, persona_id=701, cbu="0140055703713750696968", primer_venc=date(2026, 11, 10))
    assert db.query(CuotaSocial).filter_by(socio_id=701, periodo="2026-11").count() == 1

    # Generación automática mes a mes hasta enero 2027 crea 2026-12 y 2027-01
    creadas = cs_srv.asegurar_periodos_hasta(fecha_hasta=date(2027, 1, 31), socio_id=701)
    assert creadas == 2
    periodos = [c.periodo for c in cs_srv.obtener_estado_socio(701, generar_actual=False).cuotas]
    assert periodos == ["2027-01", "2026-12", "2026-11"]

    # Baja anula pendientes y bloquea nuevas generaciones
    baja = cs_srv.dar_baja_socio(701)
    assert baja.activa is False
    assert baja.fecha_baja is not None
    assert all(c.estado == "ANULADA" for c in baja.cuotas)
    assert cs_srv.asegurar_periodos_hasta(fecha_hasta=date(2027, 6, 30), socio_id=701) == 0


def test_bapro_tres_modos_e_imputacion_conjunta_prestamo_y_cuota_social(db: Session, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED", True)
    monkeypatch.setattr(PresentacionBaproService, "STORAGE_DIR", str(tmp_path))

    p = _crear_prestamo(db, persona_id=702, cbu="0140055703713750696968", primer_venc=date(2026, 11, 10))
    bapro = PresentacionBaproService(db)

    solo_prestamo = bapro.buscar_cuotas_presentables(
        fecha_hasta="2026-11-30",
        tipo_cuota=TipoCuotaPresentacion.CUOTA_PRESTAMO,
    )
    assert solo_prestamo.total_presentables == 1
    assert solo_prestamo.presentables[0].tipo_item == "CUOTA_PRESTAMO"

    solo_social = bapro.buscar_cuotas_presentables(
        fecha_hasta="2026-11-30",
        tipo_cuota=TipoCuotaPresentacion.CUOTA_SOCIAL,
    )
    assert solo_social.total_presentables == 1
    assert solo_social.presentables[0].tipo_item == "CUOTA_SOCIAL"
    assert solo_social.presentables[0].monto_centavos == 550000

    ambos = bapro.buscar_cuotas_presentables(
        fecha_hasta="2026-11-30",
        tipo_cuota=TipoCuotaPresentacion.PRESTAMO_Y_CUOTA_SOCIAL,
    )
    assert ambos.total_presentables == 2
    cuota_id = next(it.cuota_id for it in ambos.presentables if it.tipo_item == "CUOTA_PRESTAMO")
    cs_id = next(it.cuota_social_id for it in ambos.presentables if it.tipo_item == "CUOTA_SOCIAL")

    gen_resp, _ = bapro.generar_presentacion_bapro(
        GenerarPresentacionBaproRequest(
            cuota_ids=[cuota_id],
            cuota_social_ids=[cs_id],
            nro_lista=515,
            fecha_impacto="2026-11-10",
        )
    )
    assert gen_resp.total_registros == 2

    cuota_obj = db.get(Cuota, cuota_id)
    cs_obj = db.get(CuotaSocial, cs_id)
    assert cuota_obj.estado == "PRESENTADA"
    assert cs_obj.estado == "PRESENTADA"

    # Respuesta bancaria conjunta (op 1: cuota préstamo, op 2: cuota social)
    lineas_resp = []
    for num_op, imp in [(1, cuota_obj.cuota_total_centavos), (2, cs_obj.valor_centavos)]:
        base_linea = BaproRegistroIndividual.formatear_linea(
            "10112026",
            702,
            "0140055703713750696968",
            imp,
            num_op,
            515,
        )
        lineas_resp.append("72" + base_linea[2:])
    payload_bytes = ("\r\n".join(lineas_resp) + "\r\n").encode("ascii")

    resp_srv = RespuestasService(db)
    vista = resp_srv.previsualizar("BAPRO", 515, payload_bytes, date(2026, 1, 10))
    assert vista["resumen"]["revisar"] == 0, vista["filas"]
    assert vista["resumen"]["cobrados"] == 2
    aplicado = resp_srv.confirmar("BAPRO", 515, payload_bytes, date(2026, 1, 10), None, vista["revision"], "bapro.txt", "tester")
    assert aplicado["cobrados"] == 2

    db.refresh(cuota_obj)
    db.refresh(cs_obj)
    assert cuota_obj.estado == "PAGADA"
    assert cs_obj.estado == "PAGADA"
    assert cs_obj.monto_pagado_centavos == 550000

    # El detalle no falla al renderizar Cuota Social sin cuota_id
    detalles_api = obtener_detalle_respuesta(aplicado["id"], db=db, usuario="tester")
    assert any(d["tipo_concepto"] == "CUOTA_SOCIAL" and d["cuota_social_centavos"] == 550000 for d in detalles_api)

    # Cuenta corriente mantiene desgloseCuotasSociales separado de desglosePrestamos
    socio = db.get(Socio, 702)
    cc = construir_cuenta_corriente_local(socio, [p])
    assert len(cc["desglosePrestamos"]) == 2
    assert all(d["concepto"] == "PRESTAMO_FRANCES" for d in cc["desglosePrestamos"])
    assert len(cc["desgloseCuotasSociales"]) == 1
    assert cc["desgloseCuotasSociales"][0]["estado"] == "COBRADO"


def test_bna_tres_modos_e_imputacion_mixta(db: Session, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED", True)
    monkeypatch.setattr(PresentacionBnaService, "STORAGE_DIR", str(tmp_path))

    cbu_bna = "0110599530000044026979"  # Sucursal 599 -> 0085 en sucursales BNA
    _crear_prestamo(db, persona_id=703, cbu=cbu_bna, primer_venc=date(2026, 12, 10))
    bna = PresentacionBnaService(db)
    bna.mapa_sucursales = {"599": "0085"}

    res_mix = bna.buscar_cuotas_presentables(
        fecha_hasta="2026-12-31",
        tipo_cuota=TipoCuotaPresentacion.PRESTAMO_Y_CUOTA_SOCIAL,
    )
    assert res_mix.total_presentables == 2
    cuota_id = next(it.cuota_id for it in res_mix.presentables if it.tipo_item == "CUOTA_PRESTAMO")
    cs_id = next(it.cuota_social_id for it in res_mix.presentables if it.tipo_item == "CUOTA_SOCIAL")

    gen, _ = bna.generar_presentacion_bna(
        GenerarPresentacionBnaRequest(
            cuota_ids=[cuota_id],
            cuota_social_ids=[cs_id],
            nro_lista=601,
            fecha_impacto="2026-12-10",
        )
    )
    assert gen.total_registros == 2

    cuota_obj = db.get(Cuota, cuota_id)
    cs_obj = db.get(CuotaSocial, cs_id)
    assert cuota_obj.estado == "PRESENTADA"
    assert cs_obj.estado == "PRESENTADA"

    # Armar respuesta BNA (Tipo 1 PD devolución + 2 detalles con código '0' OK + Tipo 3 pie)
    cabecera = ("1" + "0085" + "10" + "0005502347" + "P" + "D" + "1201" + "20261210" + "REE").ljust(128)
    d1 = ("2" + "0085CA00004402697" + str(cuota_obj.cuota_total_centavos).zfill(15) + "00000000" + "0" + "".ljust(30) + "601-1".ljust(10)).ljust(128)
    d2 = ("2" + "0085CA00004402697" + str(cs_obj.valor_centavos).zfill(15) + "00000000" + "0" + "".ljust(30) + "601-2".ljust(10)).ljust(128)
    total_cobrado = cuota_obj.cuota_total_centavos + cs_obj.valor_centavos
    pie = ("3" + str(total_cobrado).zfill(15) + str(2).zfill(6) + ("0" * 15) + ("0" * 6)).ljust(128)
    txt_bna = ("\r\n".join([cabecera, d1, d2, pie]) + "\r\n").encode("ascii")

    resp_srv = RespuestasService(db)
    vista = resp_srv.previsualizar("BNA", 601, txt_bna, date(2026, 1, 10))
    assert vista["resumen"]["revisar"] == 0, vista["filas"]
    assert vista["resumen"]["cobrados"] == 2
    aplicado = resp_srv.confirmar("BNA", 601, txt_bna, date(2026, 1, 10), None, vista["revision"], "bna.txt", "tester")
    assert aplicado["cobrados"] == 2

    db.refresh(cuota_obj)
    db.refresh(cs_obj)
    assert cuota_obj.estado == "PAGADA"
    assert cs_obj.estado == "PAGADA"


def test_endpoints_cuotas_sociales_y_presentaciones(db: Session):
    from fastapi.testclient import TestClient
    from main import app
    from app.core.database import get_db

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        db.add(Socio(id=808, nombre_completo="PEREZ, ANA", documento="32111222"))
        db.commit()

        act = client.post(
            "/api/v1/cuotas-sociales/socio/808/activar",
            json={"valor_centavos": 550000, "fecha_primer_vencimiento": "2026-12-10"},
        )
        assert act.status_code == 200, act.text
        data_act = act.json()
        assert data_act["activa"] is True
        assert data_act["valor_centavos"] == 550000
        assert len(data_act["cuotas"]) == 1

        bus_bapro = client.post(
            "/api/v1/presentaciones-bapro/buscar-cuotas",
            json={"fecha_hasta": "2027-01-31", "tipo_cuota": "CUOTA_SOCIAL"},
        )
        assert bus_bapro.status_code == 200, bus_bapro.text
        items_bapro = bus_bapro.json()["presentables"] + bus_bapro.json()["excluidas"]
        assert len([i for i in items_bapro if i["socio_id"] == 808 and i["tipo_item"] == "CUOTA_SOCIAL"]) == 2

        bus_bna = client.get(
            "/api/v1/presentaciones-bna/cuotas-pendientes",
            params={"fecha_hasta": "2027-01-31", "tipo_cuota": "CUOTA_SOCIAL"},
        )
        assert bus_bna.status_code == 200, bus_bna.text
        items_bna = bus_bna.json()["presentables"] + bus_bna.json()["excluidas"]
        assert len([i for i in items_bna if i["socio_id"] == 808 and i["tipo_item"] == "CUOTA_SOCIAL"]) == 2

        baja = client.post("/api/v1/cuotas-sociales/socio/808/baja", json={})
        assert baja.status_code == 200, baja.text
        assert baja.json()["activa"] is False
    finally:
        app.dependency_overrides.clear()


def test_query_cuota_social_activa_compila_sintaxis_sql_server_valida():
    from sqlalchemy import select, true
    from sqlalchemy.dialects import mssql
    stmt = select(Socio).where(Socio.cuota_social_activa == true())
    sql_compiled = str(stmt.compile(dialect=mssql.dialect()))
    assert "IS 1" not in sql_compiled
    assert "= 1" in sql_compiled


def test_obtener_cuenta_corriente_no_traga_error_local_y_incluye_cuota_social(db: Session, monkeypatch):
    import asyncio
    from fastapi import HTTPException
    from app.features.personas.service import PersonasService

    class FakeCoopYa:
        async def obtener_cuenta_corriente_resumen(self, id_persona, token=None):
            return {"totales": {"saldo": 0, "obligacionMensual": 0, "totalObligaciones": 0, "importeCobrado": 0, "importeRechazado": 0, "importePendiente": 0, "movimientos": 0, "cobrados": 0, "rechazados": 0, "pendientes": 0, "manuales": 0, "algunaConMora": False}, "desglose": [], "movimientos": [], "periodos": [], "conceptos": []}

    _crear_prestamo(db, persona_id=909, cbu="0140055703713750696968", primer_venc=date(2026, 12, 10))
    ps = PersonasService(client=FakeCoopYa(), socio_repo=SocioRepository(db))
    cc = asyncio.run(ps.obtener_cuenta_corriente(909))
    assert len(cc["desglosePrestamos"]) == 2
    assert len(cc["desgloseCuotasSociales"]) == 1

    def fallar(*args, **kwargs):
        raise RuntimeError("error simulado SQL")

    monkeypatch.setattr("app.features.personas.service.construir_cuenta_corriente_local", fallar)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(ps.obtener_cuenta_corriente(909))
    assert exc.value.status_code == 500
