import re
from typing import List, Optional, Tuple


class BaproRegistroIndividual:
    """Generador posicional de registros BAPRO (163 caracteres fijos)."""

    CODIGO_BANCO_PROVINCIA = "014"
    LONGITUD_LINEA = 163

    @staticmethod
    def normalizar_cbu(valor: Optional[str]) -> str:
        """Extrae únicamente los dígitos y ajusta a 22 caracteres exactos."""
        digitos = "".join(ch for ch in (valor or "") if ch.isdigit())
        if len(digitos) < 22:
            return digitos.zfill(22)
        elif len(digitos) > 22:
            return digitos[:22]
        return digitos

    @classmethod
    def es_cbu_banco_provincia(cls, valor: Optional[str]) -> bool:
        """Verifica que el CBU sea de Banco Provincia (código 014)."""
        cbu = cls.normalizar_cbu(valor)
        return cbu.startswith(cls.CODIGO_BANCO_PROVINCIA)

    @classmethod
    def formatear_linea(
        cls,
        fecha_vencimiento_ddmmaaaa: str,
        identificador_cliente: int,
        cbu: str,
        importe_centavos: int,
        numero_operacion: int,
        nro_lista: Optional[int] = None,
        cuit_empresa: str = "30690754386",
        descripcion_transaccion: str = "SERVICI014",
        nombre_empresa: str = "COOPCREDITOYALTD",
    ) -> str:
        """Formatea un renglón de débito posicional de exactamente 163 caracteres según layout BAPRO préstamos."""
        cbu_norm = cls.normalizar_cbu(cbu)
        if not cbu_norm.startswith(cls.CODIGO_BANCO_PROVINCIA):
            raise ValueError(f"El CBU '{cbu}' no pertenece a Banco Provincia (código 014)")

        p1_2 = "71"
        p3_10 = fecha_vencimiento_ddmmaaaa.ljust(8, "0")[:8]
        # Pos 11-38 (28 chars): Seis ceros + IdPersona (zfill 6) + 16 espacios
        p11_38 = f"000000{str(identificador_cliente).zfill(6)}".ljust(28, " ")[:28]
        p39 = "P"
        p40_61 = cbu_norm[:22]
        p62_71 = str(max(0, importe_centavos)).zfill(10)[:10]
        p72_82 = "".join(ch for ch in cuit_empresa if ch.isdigit()).ljust(11, "0")[:11]
        p83_92 = (descripcion_transaccion or "SERVICI014").ljust(10, " ")[:10]
        # Pos 93-147 (55 chars): Nro Lista + Nro Registro secuencial (zfill 6) + 44 espacios
        prefijo_lista = str(nro_lista) if nro_lista is not None else ""
        ref_debito = f"{prefijo_lista}{str(numero_operacion).zfill(6)}"
        p93_147 = ref_debito.ljust(55, " ")[:55]
        p148_163 = (nombre_empresa or "COOPCREDITOYALTD").ljust(16, " ")[:16]

        linea = f"{p1_2}{p3_10}{p11_38}{p39}{p40_61}{p62_71}{p72_82}{p83_92}{p93_147}{p148_163}"
        if len(linea) != cls.LONGITUD_LINEA:
            raise ValueError(
                f"Error de formato BAPRO: la línea resultante tiene {len(linea)} chars (esperados: {cls.LONGITUD_LINEA})"
            )
        return linea


class RepartidorDePartes:
    """Reparte centavos entre N partes sin redondeo flotante ni pérdida de dinero."""

    @staticmethod
    def repartir(total_centavos: int, partes: int = 2) -> List[int]:
        if partes <= 0:
            raise ValueError("La cantidad de partes debe ser mayor a cero")
        if total_centavos < 0:
            raise ValueError("El importe no puede ser negativo")

        base = total_centavos // partes
        resultado = [base] * (partes - 1)
        resultado.append(total_centavos - (base * (partes - 1)))
        return resultado


class ParseadorRespuestaBapro:
    """Parsea archivos de retorno/rendición enviados por Banco Provincia."""

    @staticmethod
    def parsear_linea(linea: str) -> Optional[dict]:
        linea_limpia = linea.rstrip("\r\n")
        if len(linea_limpia) < 163:
            return None

        codigo_interno = linea_limpia[0:2].strip()
        if codigo_interno not in ("72", "52", "54", "55", "68", "69"):
            return None

        fecha_vencimiento = linea_limpia[2:10].strip()
        num_secuencial = linea_limpia[10:24].strip().lstrip("0")
        cbu = linea_limpia[39:61].strip()
        importe_str = linea_limpia[61:71].strip()
        cuit = linea_limpia[71:82].strip()
        referencia_debito = linea_limpia[92:107].strip()
        codigo_respuesta_raw = linea_limpia[144:147].strip()

        # Si el código interno es de rechazo directo
        if codigo_interno in ("52", "54", "55", "68", "69"):
            codigo_respuesta = codigo_interno
            es_ok = False
        elif not codigo_respuesta_raw or codigo_respuesta_raw.upper() == "OK":
            codigo_respuesta = "OK"
            es_ok = True
        else:
            codigo_respuesta = codigo_respuesta_raw.upper()
            es_ok = False

        numero_op = None
        digits_only = re.sub(r"\D", "", referencia_debito)
        if digits_only:
            numero_op = int(digits_only[-6:]) if len(digits_only) >= 6 else int(digits_only)

        return {
            "codigo_interno": codigo_interno,
            "fecha_vencimiento": fecha_vencimiento,
            "identificador_cliente": int(num_secuencial) if num_secuencial.isdigit() else None,
            "cbu": cbu,
            "importe_centavos": int(importe_str) if importe_str.isdigit() else 0,
            "cuit_empresa": cuit,
            "referencia_debito": referencia_debito,
            "numero_operacion": numero_op,
            "codigo_respuesta": codigo_respuesta,
            "es_ok": es_ok,
            "descripcion_motivo": CodigosDeRechazo.describir(codigo_respuesta),
        }


class CodigosDeRechazo:
    """Catálogo oficial de códigos de respuesta y rechazo BAPRO / BCRA."""

    TABLA = {
        "": "Sin respuesta del banco",
        "OK": "Aceptado / Cobrado exitosamente",
        "R02": "Cuenta cerrada o suspendida",
        "R03": "Cuenta inexistente",
        "R04": "Número de cuenta inválido",
        "R08": "Orden de no pagar",
        "R10": "Falta de fondos",
        "R13": "Sucursal / Entidad / Destino inexistente",
        "R14": "Identificador del cliente en la empresa erróneo",
        "R15": "Baja de servicio",
        "R17": "Error de formato",
        "R18": "Fecha de compensación errónea",
        "R19": "Importe erróneo",
        "R20": "Moneda distinta a la cuenta débito",
        "R23": "Sucursal no habilitada",
        "R24": "Transacción duplicada",
        "R28": "Rechazo 1er vencimiento",
        "R29": "Reversión ya efectuada",
        "R34": "Cliente no adherido",
        "R75": "Fecha inválida",
        "R86": "Identificador de la empresa erróneo",
        "R94": "Día no laborable",
        "52": "Resultado de débito (BAPRO)",
        "54": "Rechazo de reversión del originante (BAPRO)",
        "55": "Reversión desde la receptora (BAPRO)",
        "68": "Rechazo de reversal (BAPRO)",
        "69": "Reversión desde el banco (BAPRO)",
    }

    @classmethod
    def describir(cls, codigo: Optional[str]) -> str:
        c = (codigo or "").strip().upper()
        return cls.TABLA.get(c, f"Código no reconocido: {codigo}")
