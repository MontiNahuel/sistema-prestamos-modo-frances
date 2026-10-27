import os
import json
import logging
from typing import Dict

logger = logging.getLogger("SucursalesBnaService")

_CACHE_SUCURSALES: Dict[str, str] = {}


def obtener_mapa_sucursales_bna() -> Dict[str, str]:
    """
    Retorna el diccionario de mapeo {COD_BCRA: SucursalBNA}.
    Intenta consultar CoopYaBeta; si no está disponible, utiliza el archivo semilla local.
    """
    global _CACHE_SUCURSALES
    if _CACHE_SUCURSALES:
        return _CACHE_SUCURSALES

    # 1. Intentar cargar desde el archivo semilla local
    json_path = os.path.join(os.path.dirname(__file__), "sucursales_bna_seed.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _CACHE_SUCURSALES = {str(k).strip().zfill(3): str(v).strip().zfill(4) for k, v in data.items()}
                logger.info(f"Cargadas {len(_CACHE_SUCURSALES)} sucursales BNA desde semilla local.")
        except Exception as ex:
            logger.warning(f"Error al leer semilla local de sucursales BNA: {ex}")

    # 2. Intentar actualizar desde CoopYaBeta si es posible
    try:
        import pyodbc
        from app.core.config import settings

        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={settings.COOPYA_DB_SERVER};"
            f"DATABASE={settings.COOPYA_DB_NAME};"
            f"UID=CoopYaProd;PWD=Yacoop*2025;"
            f"TrustServerCertificate=yes;"
            f"Connection Timeout=3;"
        )
        conn = pyodbc.connect(conn_str)
        try:
            cur = conn.cursor()
            cur.execute("EXEC ObtenerTodasSucursalesBNA")
            rows = cur.fetchall()
            for r in rows:
                if r[0] and r[1]:
                    _CACHE_SUCURSALES[str(r[0]).strip().zfill(3)] = str(r[1]).strip().zfill(4)
            logger.info(f"Sincronizadas {len(_CACHE_SUCURSALES)} sucursales BNA desde CoopYaBeta.")
        finally:
            conn.close()
    except Exception:
        # Falla silenciosa si no hay conexión externa; se mantiene la semilla local
        pass

    return _CACHE_SUCURSALES
