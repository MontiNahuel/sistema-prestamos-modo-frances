import pytest
from app.features.presentaciones_bna.bna_layout import (
    BnaRegistroIndividual,
    ParseadorRespuestaBna,
    CodigosDeEstadoBna,
)
from app.features.presentaciones_bna.sucursales_service import obtener_mapa_sucursales_bna


def test_es_cbu_banco_nacion():
    assert BnaRegistroIndividual.es_cbu_banco_nacion("0110599530000044026979") is True
    assert BnaRegistroIndividual.es_cbu_banco_nacion("0140999801000012345678") is False
    assert BnaRegistroIndividual.es_cbu_banco_nacion("") is False
    assert BnaRegistroIndividual.es_cbu_banco_nacion(None) is False


def test_resolver_datos_bna():
    mapa = {"599": "0085", "350": "2350"}
    cbu = "0110599530000044026979"
    sucursal, sistema, cuenta = BnaRegistroIndividual.resolver_datos_bna(cbu, mapa)
    assert sucursal == "0085"
    assert sistema == "CA"
    assert cuenta == "00004402697"

    with pytest.raises(ValueError, match="no pertenece a Banco Nación"):
        BnaRegistroIndividual.resolver_datos_bna("0140999801000012345678", mapa)

    with pytest.raises(ValueError, match="No se encontró sucursal BNA"):
        BnaRegistroIndividual.resolver_datos_bna("0110999530000044026979", mapa)


def test_longitudes_registros_128_chars():
    cabecera = BnaRegistroIndividual.formatear_cabecera(
        casa="0085",
        producto="10",
        cuenta="0005502347",
        secuencia="1001",
        fecha_tope_aaaammdd="20261026",
        indicador_lote="REE",
    )
    assert len(cabecera) == 128
    assert cabecera.startswith("10085100005502347PE100120261026REE")

    detalle = BnaRegistroIndividual.formatear_detalle(
        sucursal_cliente="0085",
        nro_cuenta_cliente="00000440269",
        importe_centavos=1529345,
        concepto_debito="1935-1",
        sistema_cuenta="CA",
    )
    assert len(detalle) == 128
    assert detalle.startswith("20085CA00000440269000000001529345000000000")
    assert "1935-1" in detalle

    pie = BnaRegistroIndividual.formatear_pie(
        total_centavos=1529345,
        cantidad_registros=1,
    )
    assert len(pie) == 128
    assert pie.startswith("3000000001529345000001000000000000000000000")


def test_parseador_respuesta_bna():
    linea_ok = (
        "2"
        + "0085"
        + "CA"
        + "00000440269"
        + "000000001529345"
        + "20261026"
        + "0"
        + " " * 30
        + "1935-1    "
        + " " * 46
    )
    res_ok = ParseadorRespuestaBna.parsear_linea_detalle(linea_ok)
    assert res_ok is not None
    assert res_ok["es_ok"] is True
    assert res_ok["estado"] == "0"
    assert res_ok["nro_archivo"] == 1935
    assert res_ok["numero_operacion"] == 1
    assert res_ok["concepto_debito"] == "1935-1"

    linea_rechazo = (
        "2"
        + "0085"
        + "CA"
        + "00000440269"
        + "000000001529345"
        + "20261026"
        + "9"
        + "MONTO SUP. AL DISPONIBLE      "
        + "1935-2    "
        + " " * 46
    )
    res_rechazo = ParseadorRespuestaBna.parsear_linea_detalle(linea_rechazo)
    assert res_rechazo is not None
    assert res_rechazo["es_ok"] is False
    assert res_rechazo["estado"] == "9"
    assert res_rechazo["descripcion_rechazo"] == "MONTO SUP. AL DISPONIBLE"
    assert res_rechazo["numero_operacion"] == 2


def test_sucursales_seed_carga():
    mapa = obtener_mapa_sucursales_bna()
    assert len(mapa) >= 600
    assert "599" in mapa
    assert mapa["599"] == "0085"
