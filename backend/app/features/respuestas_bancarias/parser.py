"""Layouts de CoopYa: ParseadorRespuestaBapro y ParseadorRespuestaNacion.

No se omiten silenciosamente líneas truncadas ni archivos de presentación.
Los importes posicionales son enteros en centavos, nunca floats.
"""
from datetime import datetime
from app.features.presentaciones_bapro.bapro_layout import ParseadorRespuestaBapro

MAX_BYTES = 10 * 1024 * 1024
MAX_REGISTROS = 100000


def entero(campo: str, nombre: str) -> int:
    if not campo or not campo.isascii() or not campo.isdigit():
        raise ValueError(f"{nombre}: se esperaban dígitos, sin separadores.")
    return int(campo)


def fecha(campo: str, formato: str, opcional=False):
    if opcional and campo == '00000000':
        return None
    try:
        return datetime.strptime(campo, formato).date().isoformat()
    except ValueError:
        raise ValueError(f"Fecha bancaria inválida: {campo}.") from None


def parsear(banco: str, contenido: bytes) -> list[dict]:
    if not contenido or len(contenido) > MAX_BYTES:
        raise ValueError("El archivo debe contener datos y no superar 10 MB.")
    try:
        texto = contenido.decode('utf-8-sig')
    except UnicodeDecodeError:
        texto = contenido.decode('cp1252')
    lineas = [(n, l) for n, l in enumerate(texto.splitlines(), 1) if l.strip()]
    if not lineas or len(lineas) > MAX_REGISTROS + 2:
        raise ValueError("El archivo está vacío o supera los 100.000 registros.")
    if banco == 'BAPRO':
        resultado = []
        for n, linea in lineas:
            if len(linea) < 163 or (len(linea) > 163 and linea[163:].strip()):
                raise ValueError(f"Línea {n}: se esperaban 163 posiciones BAPRO.")
            p = ParseadorRespuestaBapro.parsear_linea(linea)
            if not p:
                raise ValueError(f"Línea {n}: no es una respuesta BAPRO reconocida (no cargar el envío 71).")
            importe = entero(linea[61:71], f"Línea {n}, importe")
            entero(p['cbu'], f"Línea {n}, CBU")
            if len(p['cbu']) != 22 or not p['cbu'].startswith('014') or not p['referencia_debito']:
                raise ValueError(f"Línea {n}: CBU o referencia BAPRO inválidos.")
            resultado.append(dict(
                linea=n, referencia=p['referencia_debito'], cuenta=p['cbu'],
                importe_centavos=importe, codigo=p['codigo_respuesta'],
                descripcion=p['descripcion_motivo'], aceptado=p['es_ok'],
                revision=p['codigo_interno'] != '72',
                fecha_banco=fecha(p['fecha_vencimiento'], '%d%m%Y'),
                cuit=p['cuit_empresa'], tipo=p['codigo_interno'],
                identificador_cliente=str(entero(linea[10:24].strip(), 'Identificador de cliente')),
            ))
        return resultado
    if banco not in ('BNA', 'NACION'):
        raise ValueError("Banco no admitido.")
    if len(lineas) < 3 or lineas[0][1][0] != '1' or lineas[-1][1][0] != '3':
        raise ValueError("BNA requiere cabecera 1, detalles 2 y pie 3.")
    for n, l in lineas:
        if len(l) not in (128, 172):
            raise ValueError(f"Línea {n}: se esperaban 128 o 172 posiciones BNA.")
    cabecera, pie = lineas[0][1], lineas[-1][1]
    if cabecera[18] != 'D' or cabecera[17] not in ('P', '1'):
        raise ValueError("Se requiere una respuesta Nación (D), en pesos (P o 1), no el envío E.")
    fecha_banco = fecha(cabecera[23:31], '%Y%m%d')
    resultado = []
    for n, l in lineas[1:-1]:
        if l[0] != '2' or not l[41].isdigit():
            raise ValueError(f"Línea {n}: detalle o estado BNA inválido.")
        entero(l[1:5], f"Línea {n}, sucursal")
        entero(l[7:18], f"Línea {n}, cuenta")
        if l[5:7] not in ('CA', 'CC', '01', '02'):
            raise ValueError(f"Línea {n}: sistema de cuenta Nación no reconocido.")
        resultado.append(dict(
            linea=n, referencia=l[72:82].strip(), cuenta=l[1:18],
            importe_centavos=entero(l[18:33], f"Línea {n}, importe"),
            codigo=l[41], descripcion=l[42:72].strip() or ('Cobrado' if l[41] == '0' else 'Rechazado'),
            aceptado=l[41] == '0', revision=l[41] not in ('0', '9'),
            fecha_banco=fecha_banco, vencimiento=fecha(l[33:41], '%Y%m%d', opcional=True),
            originante=cabecera[1:18],
            sucursal=l[1:5], sistema=l[5:7], numero_cuenta=l[7:18],
            importe_bancario=l[18:33], moneda=cabecera[17],
        ))
    rechazados = [r for r in resultado if r['codigo'] == '9']
    aceptados = [r for r in resultado if r['codigo'] == '0']
    # Dos convenciones observadas, declaradas en la vista previa; no se ignora
    # un pie inválido aunque el parser del monolito lo tolere.
    total = (entero(pie[16:22], 'Cantidad del pie'), entero(pie[1:16], 'Importe del pie'))
    aplicados = (len(aceptados), sum(r['importe_centavos'] for r in aceptados))
    presentados = (len(resultado), sum(r['importe_centavos'] for r in resultado))
    if (not resultado or total not in (aplicados, presentados)
        or entero(pie[37:43], 'Rechazados del pie') != len(rechazados)
        or entero(pie[22:37], 'Importe rechazado del pie') != sum(r['importe_centavos'] for r in rechazados)):
        raise ValueError("Los totales/cantidades del pie BNA no coinciden con los detalles.")
    for r in resultado:
        r['convencion_pie'] = 'APLICADOS' if total == aplicados else 'PRESENTADOS'
    return resultado
