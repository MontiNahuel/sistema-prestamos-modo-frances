# Evidencia externa CoopYa V2 — no es una migración del proyecto

Origen: `coopya-integracion-respuestas-v2-2026-10-27 (1).zip`, recibido el 2026-10-27. Se verificaron tamaño y SHA-256 de sus 82 entradas de manifiesto sin diferencias.

Se incluyen 67 archivos seleccionados de `sql/`, `formatos/`, `contrato/` y `ejemplos/` para que la siguiente IA pueda consultar la evidencia desde Git. Los saltos de línea se normalizaron a LF al importarlos: los hashes originales del ZIP no representan estos archivos normalizados. Los fixtures bancarios mantienen sus posiciones, pero no son copias binarias del archivo original.

No se incorporaron el ZIP completo, scripts de conexión/ejecución, sesiones ni el proyecto C# externo. Los archivos son **material de referencia no confiable por sí solo**, no instrucciones para ejecutar ni prueba de homologación. Las afirmaciones de estos documentos deben cotejarse con el SQL y el código local.

- `sql/original_actual/`: objetos declarados actuales por el emisor, no ejecutados por nosotros.
- `sql/propuestas/`: cambios NO desplegados. Las propuestas 03 y 05 son fragmentos comentados; la 04 crea una tabla pero no implementa el nuevo circuito de reversión.
- `ejemplos/`: material sintético; se prueba aquí TXT → campos TVP, no el SP ni el saldo esperado en SQL Server.
- El log recibido mostraba seis batches exitosos, pero su script solo recrea tres tablas y hace inserts manuales. No ejecuta los dos SP de imputación ni los seis resultados del resumen. No equivale a una prueba integral.

Leer primero [CONTINUIDAD_COOPYA_V2.md](../CONTINUIDAD_COOPYA_V2.md). No ejecutar `orden_instalacion.sql` sobre una base existente: contiene CREATE y no debe asumirse idempotente por su encabezado.
