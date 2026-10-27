import re
from typing import Dict, List, Optional, Tuple


class BnaRegistroIndividual:
    """Generador posicional de registros BNA (128 caracteres fijos)."""

    CODIGO_BANCO_NACION = "011"
    LONGITUD_LINEA = 128

    @staticmethod
    def normalizar_cbu(valor: Optional[str]) -> str:
        """Extrae dígitos y normaliza a 22 caracteres exactos."""
        digitos = "".join(ch for ch in (valor or "") if ch.isdigit())
        if len(digitos) < 22:
            return digitos.zfill(22)
        elif len(digitos) > 22:
            return digitos[:22]
        return digitos

    @classmethod
    def es_cbu_banco_nacion(cls, valor: Optional[str]) -> bool:
        """Verifica que el CBU pertenezca al Banco de la Nación Argentina (código 011)."""
        cbu = cls.normalizar_cbu(valor)
        return cbu.startswith(cls.CODIGO_BANCO_NACION)

    @classmethod
    def resolver_datos_bna(
        cls, cbu: str, dict_sucursales: Dict[str, str]
    ) -> Tuple[str, str, str]:
        """
        Extrae y traduce sucursal, sistema y cuenta BNA a partir del CBU.
        - Sucursal BNA: posiciones 5 a 7 (índice 4..6) del CBU (COD_BCRA), traducido a casa BNA de 4 dígitos.
        - Sistema de Cuenta: 'CA' (Caja de Ahorro) por defecto.
        - Número de Cuenta: posiciones 11 a 21 (índice 10..20) del CBU (11 dígitos).
        """
        cbu_norm = cls.normalizar_cbu(cbu)
        if not cbu_norm.startswith(cls.CODIGO_BANCO_NACION):
            raise ValueError(f"El CBU '{cbu}' no pertenece a Banco Nación (código 011)")

        cod_bcra = cbu_norm[4:7]
        sucursal = dict_sucursales.get(cod_bcra)
        if not sucursal:
            # Fallback intentando buscar con lstrip o zfill
            sucursal = dict_sucursales.get(cod_bcra.lstrip("0")) or dict_sucursales.get(cod_bcra.zfill(3))
        if not sucursal:
            raise ValueError(f"No se encontró sucursal BNA para el código BCRA '{cod_bcra}' del CBU '{cbu}'")

        sucursal_bna = sucursal.strip().zfill(4)[:4]
        sistema_cuenta = "CA"
        nro_cuenta = cbu_norm[10:21].zfill(11)[:11]

        return sucursal_bna, sistema_cuenta, nro_cuenta

    @classmethod
    def formatear_cabecera(
        cls,
        casa: str = "0085",
        producto: str = "10",
        cuenta: str = "0005502347",
        secuencia: str = "0101",
        fecha_tope_aaaammdd: str = "20261026",
        indicador_lote: str = "REE",
        moneda: str = "P",
        identificador: str = "E",
    ) -> str:
        """Registro 1 - Cabecera BNA (128 caracteres fijos)."""
        p1 = "1"
        p2_5 = (casa or "0085").strip().zfill(4)[:4]
        p6_7 = (producto or "10").strip().zfill(2)[:2]
        p8_17 = (cuenta or "0005502347").strip().zfill(10)[:10]
        p18 = (moneda or "P")[:1]
        p19 = (identificador or "E")[:1]
        p20_23 = (secuencia or "0101").strip().zfill(4)[:4]
        p24_31 = (fecha_tope_aaaammdd or "").strip().zfill(8)[:8]
        p32_34 = (indicador_lote or "REE").ljust(3, " ")[:3]
        p35_128 = " " * 94

        linea = f"{p1}{p2_5}{p6_7}{p8_17}{p18}{p19}{p20_23}{p24_31}{p32_34}{p35_128}"
        if len(linea) != cls.LONGITUD_LINEA:
            raise ValueError(f"Cabecera BNA inválida: tiene {len(linea)} chars (esperados: {cls.LONGITUD_LINEA})")
        return linea

    @classmethod
    def formatear_detalle(
        cls,
        sucursal_cliente: str,
        nro_cuenta_cliente: str,
        importe_centavos: int,
        concepto_debito: str,
        sistema_cuenta: str = "CA",
        fecha_vencimiento: str = "00000000",
        estado: str = "0",
        descripcion_rechazo: str = "",
    ) -> str:
        """Registro 2 - Detalle BNA (128 caracteres fijos)."""
        p1 = "2"
        p2_5 = (sucursal_cliente or "").strip().zfill(4)[:4]
        p6_7 = (sistema_cuenta or "CA").ljust(2, " ")[:2]
        p8_18 = (nro_cuenta_cliente or "").strip().zfill(11)[:11]
        p19_33 = str(max(0, importe_centavos)).zfill(15)[:15]
        p34_41 = (fecha_vencimiento or "00000000").strip().zfill(8)[:8]
        p42 = (estado or "0")[:1]
        p43_72 = (descripcion_rechazo or "").ljust(30, " ")[:30]
        p73_82 = (concepto_debito or "").ljust(10, " ")[:10]
        p83_128 = " " * 46

        linea = f"{p1}{p2_5}{p6_7}{p8_18}{p19_33}{p34_41}{p42}{p43_72}{p73_82}{p83_128}"
        if len(linea) != cls.LONGITUD_LINEA:
            raise ValueError(f"Detalle BNA inválido: tiene {len(linea)} chars (esperados: {cls.LONGITUD_LINEA})")
        return linea

    @classmethod
    def formatear_pie(
        cls,
        total_centavos: int,
        cantidad_registros: int,
        total_no_aplicados_centavos: int = 0,
        cantidad_no_aplicados: int = 0,
    ) -> str:
        """Registro 3 - Pie BNA (128 caracteres fijos)."""
        p1 = "3"
        p2_16 = str(max(0, total_centavos)).zfill(15)[:15]
        p17_22 = str(max(0, cantidad_registros)).zfill(6)[:6]
        p23_37 = str(max(0, total_no_aplicados_centavos)).zfill(15)[:15]
        p38_43 = str(max(0, cantidad_no_aplicados)).zfill(6)[:6]
        p44_128 = " " * 85

        linea = f"{p1}{p2_16}{p17_22}{p23_37}{p38_43}{p44_128}"
        if len(linea) != cls.LONGITUD_LINEA:
            raise ValueError(f"Pie BNA inválido: tiene {len(linea)} chars (esperados: {cls.LONGITUD_LINEA})")
        return linea


class ParseadorRespuestaBna:
    """Parsea archivos de retorno/rendición enviados por Banco Nación."""

    @staticmethod
    def parsear_linea_detalle(linea: str) -> Optional[dict]:
        linea_limpia = linea.rstrip("\r\n")
        if len(linea_limpia) < 82:
            return None

        tipo = linea_limpia[0:1]
        if tipo != "2":
            return None

        sucursal = linea_limpia[1:5].strip()
        sistema = linea_limpia[5:7].strip()
        cuenta = linea_limpia[7:18].strip()
        importe_str = linea_limpia[18:33].strip()
        fecha_venc = linea_limpia[33:41].strip()
        estado = linea_limpia[41:42].strip()
        desc_rechazo = linea_limpia[42:72].strip()
        concepto = linea_limpia[72:82].strip()

        es_ok = (estado == "0")

        # Extraer nro_archivo y numero_operacion si el concepto tiene formato '{nro_archivo}-{num_op}'
        nro_archivo: Optional[int] = None
        num_op: Optional[int] = None
        if "-" in concepto:
            partes = concepto.split("-")
            if partes[0].isdigit():
                nro_archivo = int(partes[0])
            if partes[1].isdigit():
                num_op = int(partes[1])
        elif concepto.isdigit():
            num_op = int(concepto)

        return {
            "tipo_registro": tipo,
            "sucursal_cliente": sucursal,
            "sistema_cuenta": sistema,
            "nro_cuenta_cliente": cuenta,
            "importe_centavos": int(importe_str) if importe_str.isdigit() else 0,
            "fecha_vencimiento": fecha_venc,
            "estado": estado,
            "es_ok": es_ok,
            "descripcion_rechazo": desc_rechazo,
            "concepto_debito": concepto,
            "nro_archivo": nro_archivo,
            "numero_operacion": num_op,
            "descripcion_motivo": CodigosDeEstadoBna.describir(estado, desc_rechazo),
        }


class CodigosDeEstadoBna:
    """Catálogo y formateador de estados Banco Nación."""

    ESTADOS = {
        "0": "Aceptado / Cobrado exitosamente",
        "9": "Rechazado",
        "7": "Reversado",
    }

    @classmethod
    def describir(cls, estado: Optional[str], descripcion_banco: Optional[str] = None) -> str:
        e = (estado or "").strip()
        base = cls.ESTADOS.get(e, f"Estado desconocido ({e})")
        if descripcion_banco and descripcion_banco.strip():
            return f"{base} - {descripcion_banco.strip()}"
        return base
