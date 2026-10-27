"""Lectura del catálogo BNA existente. No modifica CoopYa ni Oracle."""
from app.integrations.coopya_db_client import coopya_db_client


def sucursales_bna() -> dict[str, str]:
    with coopya_db_client._connection() as conn:
        if conn is None:
            return {}
        cursor = conn.cursor()
        cursor.execute("""
            SELECT CAST(COD_BCRA AS VARCHAR(10)),
                LTRIM(RTRIM(SUBSTRING(COD__CASA, 1, CHARINDEX('/', COD__CASA) - 1)))
            FROM dbo.ArchivoBancoNacion
            WHERE COD_BCRA IS NOT NULL AND CHARINDEX('/', COD__CASA) > 1
        """)
        result = {}
        for bcra, casa in cursor.fetchall():
            key, value = str(bcra).strip().zfill(3), str(casa).strip().zfill(4)
            if key in result and result[key] != value:
                raise ValueError('Catálogo BNA con sucursales contradictorias.')
            result[key] = value
        return result


def cuenta_desde_cbu(cbu: str, sucursales: dict[str, str]):
    # ResolverDatosBNADesdeCBU, PresentacionesController de CoopYa.
    cbu = (cbu or '').strip()
    if len(cbu) != 22 or not cbu.isdigit() or not cbu.startswith('011'):
        return None
    casa = sucursales.get(cbu[4:7])
    return f'{casa}CA{cbu[10:21]}' if casa else None
