"""Verificación reproducible sin conectar a bases ni servicios externos.

Ejecutar desde backend: .venv/Scripts/python scripts/verificar_aislado.py
Los archivos temporales contienen exclusivamente datos sintéticos.
"""
import os
import socket
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch


def solo_loopback(original):
    def conectar(sock, direccion):
        # Windows usa TCP loopback para socketpair interno de asyncio.
        if not isinstance(direccion, tuple) or direccion[0] not in ('127.0.0.1', '::1'):
            raise RuntimeError('Red externa bloqueada en pruebas')
        return original(sock, direccion)
    return conectar


def main():
    backend = Path(__file__).resolve().parents[1]
    os.chdir(backend)
    sys.path.insert(0, str(backend))
    with TemporaryDirectory(prefix='prestamos-verificacion-') as carpeta:
        os.environ.update(
            DATABASE_URL='sqlite:///' + (Path(carpeta) / 'pruebas.db').as_posix(),
            COOPYA_DB_ENABLED='False', ORACLE_ENABLED='False',
            ORACLE_CLIENT_LIB_DIR='',
            RESPUESTAS_BANCARIAS_CONFIRMACION_ENABLED='True',
        )
        with patch.object(socket.socket, 'connect', solo_loopback(socket.socket.connect)), \
             patch.object(socket.socket, 'connect_ex', solo_loopback(socket.socket.connect_ex)):
            import main as application  # Registra todos los modelos, sin lifespan.
            from app.core.database import Base, engine, SessionLocal
            from app.services.seed_service import seed_motores_y_lineas
            from sqlalchemy import BigInteger, Integer
            import pytest
            # SQLite solo autoincrementa una PK declarada exactamente INTEGER.
            # Adaptación del harness; el esquema SQL Server no se modifica.
            for table in Base.metadata.tables.values():
                for column in table.primary_key.columns:
                    if isinstance(column.type, BigInteger):
                        column.type = column.type.with_variant(Integer(), 'sqlite')
            Base.metadata.create_all(engine)
            with SessionLocal() as db:
                seed_motores_y_lineas(db)
            try:
                return pytest.main(sys.argv[1:] or [
                    'tests/test_respuestas_bancarias.py',
                    'tests/test_sistema_frances.py', 'tests/test_variantes_motores.py',
                    'tests/test_presentaciones_bapro_flow.py',
                    'tests/test_presentaciones_bapro_repository.py',
                    'tests/test_bapro_filtros_nuevos.py', '-q', '--tb=short',
                ])
            finally:
                engine.dispose()


if __name__ == '__main__':
    raise SystemExit(main())
