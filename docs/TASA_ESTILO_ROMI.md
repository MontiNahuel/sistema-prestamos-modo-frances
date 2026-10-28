# tasa estilo-romi

Motor backend `TASA_ESTILO_ROMI`, disponible en el catálogo de motores al iniciar
el servicio. Simulaciones y otorgamiento usan el mismo motor; el frontend no
implementa fórmulas ni acarreo de decimales.

## Fórmula y tasa de entrada

Reproduce las fórmulas financieras de la hoja **Con Funcion**, columnas C:G,
del archivo `Calculo Desarrollo Presta Amort Fces 3.xls`: capital $20.000,
9 cuotas, TEM sin IVA 27,40%, IVA 21%, sin gastos, seguros ni ajustes adicionales.
No copia las otras hojas, que tienen otros parámetros y períodos de gracia.

La API conserva el contrato de tasas anuales: `tna` / `tna_pactada` se expresa
como fracción anual; la tasa mensual de este motor es **TNA / 12**. Para
reproducir TEM 0,274 se envía TNA **3,288** (328,80%). No enviar 0,274 como TNA.
La conversión anual de la hoja (TEM × 365 / 30) es otra convención y debe
normalizarse antes de comparar; la nueva variante cambia el acarreo, no la unidad
de entrada del contrato existente.

Para monto P, plazo n, tasa mensual i e IVA v:

- r = i × (1 + v).
- Cuota total = P × r × (1+r)^n / ((1+r)^n − 1).
- Capital de la cuota k = Cuota total / (1+r)^(n−k+1), equivalente a PAGOPRIN.
- Interés con IVA = Cuota total − Capital, equivalente a PAGOINT.
- Interés sin IVA = Interés con IVA / (1+v).
- IVA = Interés sin IVA × v.

Se usan 50 dígitos significativos con `Decimal`. No se redondean las cuotas
internas ni se utiliza el saldo en centavos para recalcular períodos siguientes.
Con tasa cero se divide el capital por el plazo. Romi usa períodos mensuales
30/360 y cuota total plana. Si se selecciona EXENTO, la alícuota efectiva es cero.
Las opciones de días reales o ajuste en primera cuota no cambian este cronograma.

## Exactitud y asientos en centavos

Cada cuota de la API incluye `calculo_exacto` con importes `*_pesos` expresados
como cadenas decimales, más los ajustes de conciliación en centavos. El plan de
simulación incluye también los totales exactos. Al otorgar, estos valores por
cuota se guardan en `cuotas.calculo_exacto` (JSON) sin convertirlos a float.

Los campos `*_centavos` existentes siguen siendo enteros para cobranzas,
presentaciones bancarias y cuenta corriente. Su conciliación es independiente:

1. Se redondean capital, interés, IVA y cuota exactos al centavo (HALF_UP).
2. El capital de la última cuota absorbe únicamente el residual de capital
   generado al proyectar las cuotas a centavos. Nunca se usa ese saldo para
   modificar las fórmulas exactas del préstamo.
3. Se registra en el interés el centavo de diferencia necesario para que
   capital + interés + IVA = cuota. El IVA mantiene su redondeo independiente.
4. A tasa cero no se generan intereses artificiales. Si un monto ínfimo o el
   redondeo impide conciliar una cuota sin interés negativo, se ajusta su importe
   cobrable y queda indicado en `ajuste_cuota_centavos`.

Los ajustes se exponen como `ajuste_capital_centavos`,
`ajuste_interes_centavos` y `ajuste_cuota_centavos`. No afectan `*_pesos`.
Por eso, un campo contable puede diferir un centavo del redondeo visual de una
celda. Pretender igualdad simultánea de cada celda y de sus sumas es imposible
cuando Excel muestra componentes redondeados pero suma sus decimales ocultos.

Ejemplo real, tercera cuota: Excel muestra capital $966,97, interés $5.131,58,
IVA $1.077,63 y total $7.176,19. Los tres componentes mostrados suman $7.176,18.
Romi conserva exactamente esos valores matemáticos en `calculo_exacto`, mientras
que el asiento suma un centavo al interés y registra el ajuste explícitamente.

En el caso de referencia las nueve cuotas cobrables, incluida la última, son
$7.176,19. Su suma es $64.585,71. La suma de los valores sin redondear es
$64.585,695345205... (redondeada al final: $64.585,70). Son magnitudes diferentes;
la API ofrece ambas. El motor anterior cobraba $7.176,04 en la última cuota.

## Uso por API

Se ofrecen dos variantes del motor en el catálogo:
1. `TASA_ESTILO_ROMI`: espera la tasa anual neta sin IVA (`TNA = TEM_sin_iva * 12`, ej: `3.288` o `3.3794`).
2. `TASA_ROMI_COMERCIAL_365`: espera la tasa anual comercial con IVA incluido de la planilla (`TNA = TEM_con_iva * 365 / 30`, ej: `4.1459`). Desgrava internamente a cuota plana exacta.

Ejemplo con `TASA_ROMI_COMERCIAL_365` (ej: $150.000 en 9 cuotas al 414,59% comercial con IVA):
```json
{
  "motor_id": 7,
  "monto_centavos": 15000000,
  "plazo_meses": 9,
  "tna": "4.1459",
  "alicuota_iva": "0.21"
}
```
Arroja las 9 cuotas fijas de **$55.045,00** con desglose idéntico a la planilla central.

Ejemplo con `TASA_ESTILO_ROMI`:
```json
{
  "motor_id": 123,
  "monto_centavos": 2000000,
  "plazo_meses": 9,
  "tna": "3.288",
  "alicuota_iva": "0.21"
}
```

Reemplazar `123` por el ID entero obtenido del catálogo.
Para otorgar se utiliza esa misma línea o motor y `tna_pactada: "3.288"` en
`POST /api/v1/prestamos`. No hay que realizar conversiones ni cálculos monetarios
en el frontend. Las tasas de otros motores mantienen su comportamiento.

## Verificación reproducible

- `backend/tests/fixtures/romi_con_funcion_excel.json`: extracción de los valores
  internos (`Value2`) y fórmulas de **C17:G25**, con nombre y SHA-256 del original.
  Se abrió Excel en solo lectura y con macros deshabilitadas. Son 45 celdas
  financieras de las nueve cuotas originales.
- `backend/tests/fixtures/romi_excel_financieras.json`: otras 191 cuotas calculadas
  con las funciones Pmt/Ppmt/Ipmt de Microsoft Excel, en siete escenarios con
  plazos de 1 a 120 meses, tasa cero, IVA cero, IVA 10,5% y tasas con decimales.
- Los tests exigen igualdad al centavo de los valores exactos expuestos y error
  absoluto menor a 1e-9 pesos en el caso original (1e-7 en los adicionales).
  Excel usa números binarios Double; no se promete identidad bit a bit con Decimal.
- Se prueban también sumas contables, cierre de capital, montos mínimos, catálogo
  idempotente, simulación por línea/motor, alta, persistencia, consulta y cobro.
- Las pruebas de API y migración usan SQLite aislado; no llaman a CoopYa ni bancos.

Resultado: **71 pruebas aprobadas**, incluyendo las variantes francesas existentes
y la regresión de respuestas bancarias. Se contrastaron **200 cuotas** con Excel:
9 del archivo original y 191 calculadas con sus funciones financieras.

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_tasa_estilo_romi.py tests/test_tasa_estilo_romi_api.py tests/test_sistema_frances.py tests/test_variantes_motores.py -q
```

## Instalación en una base existente

Antes de arrancar la versión actualizada, aplicar:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

La revisión `e28a7d19b604` agrega la columna JSON nullable `cuotas.calculo_exacto`.
Los préstamos anteriores conservan sus importes y tienen el campo en null.
Al reiniciar el backend se inserta el motor nuevo mediante la semilla idempotente.
`create_all` por sí solo no agrega columnas a tablas existentes.

Estado de verificación local: la migración se verificó con upgrade/downgrade
sobre SQLite y conserva las cuotas anteriores. No se aplicó a la base de uso:
la conexión configurada solicita **ODBC Driver 17 for SQL Server**, que no está
instalado en este equipo (error IM002). Instalar el controlador correspondiente
o configurar uno compatible antes de ejecutar la migración y reiniciar el backend.
