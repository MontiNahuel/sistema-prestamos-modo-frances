"""Consultas de personas para reportes de solo lectura en CoopYa SQL."""
from app.integrations.coopya_db_client import coopya_db_client


def consultar_personas_inactivas():
    """Incluye todas las personas inactivas, con el alta más reciente primero."""
    with coopya_db_client._connection() as conn:
        if conn is None:
            raise RuntimeError('Conexión deshabilitada')
        cursor = conn.cursor()
        # El estado pertenece a la persona. Activo en TipoEstados habilita
        # el catálogo y no indica si el socio está activo o inactivo.
        cursor.execute("""
            SELECT p.*, e.Nombre AS EstadoNombre
            FROM dbo.Personas p
            INNER JOIN dbo.TipoEstados e ON e.Id = p.Estado
            WHERE LTRIM(RTRIM(e.Nombre)) COLLATE Latin1_General_CI_AI
                IN (?, ?)
            ORDER BY p.FechaAlta DESC, p.Id DESC
        """, ('Inactivo', 'No Activo'))
        columnas = [col[0] for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor]
