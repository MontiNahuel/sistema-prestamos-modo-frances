from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.socio import Socio
from app.features.socios.model import MedioDePago

client = TestClient(app)


def test_upsert_socio_al_otorgar_prestamo():
    # 1. Obtener línea
    lineas = client.get("/api/v1/lineas").json()
    assert len(lineas) > 0
    linea = lineas[0]

    nuevo_persona_id = 88888
    nombre_inicial = "MARIA GONZALEZ"
    doc_inicial = "35999888"

    payload = {
        "persona_id": nuevo_persona_id,
        "persona_nombre": nombre_inicial,
        "persona_doc": doc_inicial,
        "linea_id": linea["id"],
        "monto_solicitado_centavos": 2000000,
        "plazo_meses": 3,
        "tna_pactada": float(linea["tasa_default"]),
        "alicuota_iva": float(linea["alicuota_iva"]),
        "observaciones": "Prueba de sincronización de socio"
    }

    # 2. Otorgar préstamo a nuevo socio
    resp = client.post("/api/v1/prestamos", json=payload)
    assert resp.status_code == 201
    prestamo_1 = resp.json()

    # Verificar que el socio fue persistido en la tabla socios
    db = SessionLocal()
    try:
        socio_db = db.query(Socio).filter(Socio.id == nuevo_persona_id).first()
        assert socio_db is not None
        assert socio_db.nombre_completo == nombre_inicial
        assert socio_db.documento == doc_inicial
        assert len(socio_db.prestamos) >= 1
    finally:
        db.close()

    # 3. Otorgar un segundo préstamo con datos actualizados (simulando actualización en CoopYa)
    nombre_actualizado = "MARIA GONZALEZ DE LOPEZ"
    payload_2 = {
        **payload,
        "persona_nombre": nombre_actualizado,
        "monto_solicitado_centavos": 3000000,
        "plazo_meses": 6
    }
    resp_2 = client.post("/api/v1/prestamos", json=payload_2)
    assert resp_2.status_code == 201

    # Verificar que el socio se actualizó (no se duplicó)
    db = SessionLocal()
    try:
        socios = db.query(Socio).filter(Socio.id == nuevo_persona_id).all()
        assert len(socios) == 1
        socio_actual = socios[0]
        assert socio_actual.nombre_completo == nombre_actualizado
        prestamos_socio = [p.id for p in socio_actual.prestamos]
        assert prestamo_1["id"] in prestamos_socio
        assert resp_2.json()["id"] in prestamos_socio
    finally:
        db.close()


def test_sincronizacion_cbu_al_otorgar_prestamo():
    lineas = client.get("/api/v1/lineas").json()
    assert len(lineas) > 0
    linea = lineas[0]

    persona_id = 77777
    cbu_test = "0140999988887777666655"
    payload = {
        "persona_id": persona_id,
        "persona_nombre": "CARLOS BAPRO TEST",
        "persona_doc": "28111222",
        "cbu": cbu_test,
        "linea_id": linea["id"],
        "monto_solicitado_centavos": 1500000,
        "plazo_meses": 3,
        "tna_pactada": float(linea["tasa_default"]),
        "alicuota_iva": float(linea["alicuota_iva"])
    }

    resp = client.post("/api/v1/prestamos", json=payload)
    assert resp.status_code == 201

    db = SessionLocal()
    try:
        medio = db.query(MedioDePago).filter(
            MedioDePago.socio_id == persona_id,
            MedioDePago.valor == cbu_test
        ).first()
        assert medio is not None
        assert medio.valor == cbu_test
        assert medio.banco_id == 5  # BAPRO
        assert medio.predeterminado is True
    finally:
        db.close()
