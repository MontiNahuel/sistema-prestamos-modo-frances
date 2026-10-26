import uuid
from datetime import datetime
from decimal import Decimal
from main import app  # Inicializa todos los modelos de SQLAlchemy
from app.core.database import SessionLocal
from app.features.presentaciones_bapro.model import (
    PresentacionBaproArchivo,
    PresentacionBaproAuditoria,
    DniExcluidoBapro,
    PresentacionFiltroMasivoBapro,
)
from app.features.presentaciones_bapro.repository import (
    PresentacionBaproRepository,
    DniExcluidoBaproRepository,
    PresentacionFiltroMasivoBaproRepository,
)


def test_presentacion_bapro_archivo_y_detalles():
    db = SessionLocal()
    repo = PresentacionBaproRepository(db)

    # Nro de archivo aleatorio único para testing
    nro_archivo_test = 990000 + (uuid.uuid4().int % 9000)

    try:
        # 1. Crear archivo / lote de cabecera
        archivo = PresentacionBaproArchivo(
            nro_archivo=nro_archivo_test,
            ruta=f"Presentaciones/Bapro/{nro_archivo_test}/{nro_archivo_test}.txt",
            tipo="BAPRO",
            total_registros=1,
            total_monto=Decimal("15000.50"),
            usuario_id=1,
            estado="GENERADO",
            nombre_archivo=f"{nro_archivo_test}.txt",
        )
        archivo_creado = repo.crear_archivo(archivo)
        assert archivo_creado.id is not None
        assert archivo_creado.nro_archivo == nro_archivo_test

        # 2. Insertar detalle de auditoría
        detalle = PresentacionBaproAuditoria(
            presentacion_archivo_id=archivo_creado.id,
            cuota_id=None,
            id_persona=1,
            nro_archivo=nro_archivo_test,
            numero_operacion=1,
            codigo_interno="71",
            fecha_vencimiento="10112026",
            identificador_cliente="00000000000001",
            tipo_dato="P",
            bloque1_cbu="01400000",
            bloque2_cbu="00000000000001",
            importe="0001500050",
            monto_pesos=Decimal("15000.50"),
            cuit_empresa="30690754386",
            descripcion_transaccion="SERVICI014",
            referencia_debito="PR0000000000001",
            nombre_archivo=f"{nro_archivo_test}.txt",
        )
        repo.insertar_detalles([detalle])

        # 3. Buscar por nro_archivo
        recuperado = repo.obtener_archivo_por_nro(nro_archivo_test)
        assert recuperado is not None
        assert len(recuperado.detalles) == 1
        assert recuperado.detalles[0].referencia_debito == "PR0000000000001"

        # 4. Actualizar estado
        actualizado = repo.actualizar_estado(recuperado.id, "ENVIADO")
        assert actualizado.estado == "ENVIADO"

    finally:
        # Cleanup
        db.query(PresentacionBaproAuditoria).filter_by(nro_archivo=nro_archivo_test).delete()
        db.query(PresentacionBaproArchivo).filter_by(nro_archivo=nro_archivo_test).delete()
        db.commit()
        db.close()


def test_dni_excluidos_repository():
    db = SessionLocal()
    repo = DniExcluidoBaproRepository(db)
    dni_test = f"99{uuid.uuid4().hex[:6]}"

    try:
        # 1. Agregar exclusión
        creado = repo.agregar(dni_test, motivo="Embargo judicial test")
        assert creado.id is not None
        assert creado.dni == dni_test

        # 2. Verificar exclusión
        assert repo.es_excluido(dni_test) is True
        assert dni_test in repo.obtener_todos_dnis()

        # 3. Eliminar
        eliminado = repo.eliminar(dni_test)
        assert eliminado is True
        assert repo.es_excluido(dni_test) is False

    finally:
        repo.eliminar(dni_test)
        db.close()


def test_filtro_masivo_repository():
    db = SessionLocal()
    repo = PresentacionFiltroMasivoBaproRepository(db)
    usuario_id_test = 9999

    try:
        # 1. Guardar selección
        ids_personas = [101, 102, 103]
        total = repo.guardar_seleccion(usuario_id_test, ids_personas)
        assert total == 3

        # 2. Obtener selección
        guardados = repo.obtener_ids_personas(usuario_id_test)
        assert set(guardados) == {101, 102, 103}

        # 3. Limpiar
        limpiados = repo.limpiar_usuario(usuario_id_test)
        assert limpiados == 3
        assert len(repo.obtener_ids_personas(usuario_id_test)) == 0

    finally:
        repo.limpiar_usuario(usuario_id_test)
        db.close()
