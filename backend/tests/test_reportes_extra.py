"""Pruebas de integracion y contrato para Reportes Extra (Oracle)."""

from fastapi.testclient import TestClient

from app.features.reportes_extra import service as reportes_extra_service
from app.features.reportes_extra.service import SQL_CATALINAS_COBROS
from main import app


def test_catalinas_cobros_envia_parametros_y_resume_correctamente(monkeypatch):
    capturado = {}

    def fake_ejecutar_consulta(sql, params=None):
        capturado["sql"] = sql
        capturado["params"] = params
        columnas = [
            "periodo_haber",
            "dni",
            "nombre_persona",
            "estado",
            "importe_cobro",
            "idcobro",
            "fecha_cobro",
            "idprestamo",
        ]
        filas = [
            (
                "202606",
                "28701648",
                "PEREZ JUAN",
                "YA SE COBRO",
                12500.5,
                901,
                "2026-06-15",
                4412,
            ),
            (
                "202606",
                "34776005",
                "GOMEZ ANA",
                "TODAVIA NO SE COBRO (Error 68: SIN FONDOS)",
                8400.0,
                902,
                "2026-06-15",
                4413,
            ),
            (
                "202607",
                "28701648",
                "PEREZ JUAN",
                "SIN LOTE CARGADO (Cuota 3 - ACTIVO)",
                12500.5,
                None,
                None,
                4412,
            ),
        ]
        return columnas, filas

    monkeypatch.setattr(
        reportes_extra_service.oracle_client,
        "ejecutar_consulta",
        fake_ejecutar_consulta,
    )

    client = TestClient(app)
    resp = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={
            "periodo_desde": "202605",
            "periodo_hasta": "202706",
            "dnis": " 28701648 , 34776005 ",
            "tolerancia_pct": 0.05,
            "ver_sin_lote": "s",
        },
    )

    assert resp.status_code == 200
    body = resp.json()

    assert capturado["sql"] == SQL_CATALINAS_COBROS
    assert "prestaprod.cobro" in capturado["sql"]
    assert "prestaprod.prestamocuotas" in capturado["sql"]
    assert capturado["params"] == {
        "periodo_desde": "202605",
        "periodo_hasta": "202706",
        "dnis": "28701648,34776005",
        "tolerancia_pct": 0.05,
        "ver_sin_lote": "S",
    }

    assert body["resumen"] == {
        "total_filas": 3,
        "cobrados": 1,
        "no_cobrados": 1,
        "sin_lote": 1,
        "importe_total": 33401.0,
        "importe_cobrados": 12500.5,
        "importe_no_cobrados": 8400.0,
        "importe_sin_lote": 12500.5,
    }
    assert len(body["filas"]) == 3
    assert body["filas"][0]["fecha_cobro"] == "2026-06-15"
    assert body["filas"][2]["idcobro"] is None


def test_catalinas_cobros_acepta_parametros_opcionales_nulos(monkeypatch):
    capturado = {}

    def fake_ejecutar_consulta(sql, params=None):
        capturado["params"] = params
        return (
            [
                "periodo_haber",
                "dni",
                "nombre_persona",
                "estado",
                "importe_cobro",
                "idcobro",
                "fecha_cobro",
                "idprestamo",
            ],
            [],
        )

    monkeypatch.setattr(
        reportes_extra_service.oracle_client,
        "ejecutar_consulta",
        fake_ejecutar_consulta,
    )

    client = TestClient(app)
    resp = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={
            "periodo_desde": "202605",
            "periodo_hasta": "",
            "dnis": "   ",
            "tolerancia_pct": 0.1,
            "ver_sin_lote": "N",
        },
    )

    assert resp.status_code == 200
    assert capturado["params"] == {
        "periodo_desde": "202605",
        "periodo_hasta": None,
        "dnis": None,
        "tolerancia_pct": 0.1,
        "ver_sin_lote": "N",
    }
    assert resp.json()["resumen"]["total_filas"] == 0


def test_catalinas_cobros_valida_parametros_invalidos():
    client = TestClient(app)

    resp_rango = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={
            "periodo_desde": "202606",
            "periodo_hasta": "202605",
        },
    )
    assert resp_rango.status_code == 422

    resp_periodo = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={
            "periodo_desde": "202613",
        },
    )
    assert resp_periodo.status_code == 422

    resp_dni = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={
            "periodo_desde": "202605",
            "dnis": "28701648, DROP TABLE",
        },
    )
    assert resp_dni.status_code == 422


def test_catalinas_cobros_propaga_error_oracle_como_502(monkeypatch):
    def fake_error_oracle(sql, params=None):
        raise RuntimeError("Error Oracle [1017]: ORA-01017: invalid username/password")

    monkeypatch.setattr(
        reportes_extra_service.oracle_client,
        "ejecutar_consulta",
        fake_error_oracle,
    )

    client = TestClient(app)
    resp = client.post(
        "/api/v1/reportes-extra/catalinas-cobros",
        json={"periodo_desde": "202605"},
    )

    assert resp.status_code == 502
    assert "ORA-01017" in resp.json()["detail"]
