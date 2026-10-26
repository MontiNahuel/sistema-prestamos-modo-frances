import os
import logging
from datetime import date
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("OracleClient")

try:
    import oracledb
    ORACLEDB_INSTALLED = True
except ImportError:
    oracledb = None
    ORACLEDB_INSTALLED = False


class OracleClient:
    """Cliente para persistencia en base de datos legacy Oracle 10g mediante modo thick."""

    _thick_initialized: bool = False

    def __init__(
        self,
        user: Optional[str] = None,
        password: Optional[str] = None,
        dsn: Optional[str] = None,
        lib_dir: Optional[str] = None,
        tabla: Optional[str] = None,
        enabled: Optional[bool] = None
    ):
        self.user = user or settings.ORACLE_USER
        self.password = password or settings.ORACLE_PASSWORD
        self.dsn = dsn or settings.ORACLE_DSN
        self.lib_dir = lib_dir or settings.ORACLE_CLIENT_LIB_DIR
        self.tabla = tabla or settings.ORACLE_TABLA_PERSONAS
        self.enabled = enabled if enabled is not None else settings.ORACLE_ENABLED
        self._init_thick_mode()

    def _init_thick_mode(self) -> None:
        """Inicializa el modo thick de oracledb cargando las bibliotecas del cliente Oracle."""
        if not ORACLEDB_INSTALLED or OracleClient._thick_initialized:
            return

        try:
            if self.lib_dir and os.path.exists(self.lib_dir):
                oracledb.init_oracle_client(lib_dir=self.lib_dir)
            else:
                oracledb.init_oracle_client()
            OracleClient._thick_initialized = True
            logger.info("Oracle Client inicializado exitosamente en modo THICK.")
        except oracledb.ProgrammingError:
            OracleClient._thick_initialized = True
        except Exception as e:
            logger.warning(
                f"No se pudo inicializar Oracle Client en modo thick ({str(e)}). "
                "Operará en modo simulado/mock hasta configurar el Instant Client."
            )

    def insertar_persona(self, datos: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserta una persona en PRESTAPROD.PERSONA calculando automáticamente MAX(idpersona) + 1.
        Mapea las 28 columnas históricas con valores por defecto y captura errores ORA específicos.
        """
        doc_raw = str(datos.get("documento", "")).replace(".", "").strip()
        doc_num = int(doc_raw) if doc_raw.isdigit() else 0
        cuil_raw = str(datos.get("cuil", "")).replace("-", "").replace(".", "").strip()
        cuil_num = int(cuil_raw) if cuil_raw.isdigit() else None

        # Si Oracle está deshabilitado explícitamente o no está instalado, opera en Mock
        if not self.enabled or not ORACLEDB_INSTALLED or not OracleClient._thick_initialized:
            logger.info(f"[Oracle MOCK] Inserción simulada para DNI {doc_num} en {self.tabla}")
            return {"oracle_id": 999999, "tabla": self.tabla, "estado": "INSERT_SIMULADO_OK", "mock": True}

        sql_insert = f"""
            INSERT INTO {self.tabla} (
                idpersona, iddocumento_tipo, documento_nro, cuil, apellido, nombre,
                fechanacimiento, calle, calle_nro, piso, depto, idcodigopostal,
                idprovincia, telefono_nro, idtipopersona, idestadopersona, fechaalta,
                fechabaja, observacion, idsexo, numeroente, idprestador, idregistro,
                idusuario, telefono_area, telefono_observacion, remuneracion, mail
            ) VALUES (
                :idpersona, :iddocumento_tipo, :documento_nro, :cuil, :apellido, :nombre,
                :fechanacimiento, :calle, :calle_nro, :piso, :depto, :idcodigopostal,
                :idprovincia, :telefono_nro, :idtipopersona, :idestadopersona, :fechaalta,
                :fechabaja, :observacion, :idsexo, :numeroente, :idprestador, :idregistro,
                :idusuario, :telefono_area, :telefono_observacion, :remuneracion, :mail
            )
        """

        try:
            with oracledb.connect(user=self.user, password=self.password, dsn=self.dsn) as conn:
                with conn.cursor() as cursor:
                    # 1. Autocalcular siguiente ID correlativo
                    cursor.execute(f"SELECT NVL(MAX(idpersona), 0) + 1 FROM {self.tabla}")
                    next_id = int(cursor.fetchone()[0])

                    # 2. Parámetros normalizados para PRESTAPROD.PERSONA
                    params = {
                        "idpersona": next_id,
                        "iddocumento_tipo": int(datos.get("id_documento_tipo", 1)),
                        "documento_nro": doc_num,
                        "cuil": cuil_num,
                        "apellido": str(datos.get("apellido", "")).strip()[:50].upper(),
                        "nombre": str(datos.get("nombre", "")).strip()[:50].upper(),
                        "fechanacimiento": datos.get("fecha_nacimiento"),
                        "calle": datos.get("calle", "")[:50] if datos.get("calle") else None,
                        "calle_nro": datos.get("calle_nro", "")[:20] if datos.get("calle_nro") else None,
                        "piso": datos.get("piso", "")[:5] if datos.get("piso") else None,
                        "depto": datos.get("depto", "")[:5] if datos.get("depto") else None,
                        "idcodigopostal": datos.get("id_codigo_postal"),
                        "idprovincia": datos.get("id_provincia"),
                        "telefono_nro": datos.get("telefono", "")[:40] if datos.get("telefono") else None,
                        "idtipopersona": int(datos.get("id_tipo_persona", 1)),
                        "idestadopersona": int(datos.get("id_estado_persona", 1)),
                        "fechaalta": date.today(),
                        "fechabaja": date(1900, 1, 1),
                        "observacion": "Alta desde Microservicio Prestamos",
                        "idsexo": str(datos.get("sexo", "M"))[:1].upper(),
                        "numeroente": None,
                        "idprestador": 1,
                        "idregistro": None,
                        "idusuario": self.user.upper()[:10],
                        "telefono_area": datos.get("telefono_area", "")[:5] if datos.get("telefono_area") else None,
                        "telefono_observacion": None,
                        "remuneracion": 0.0,
                        "mail": datos.get("email", "")[:50] if datos.get("email") else None
                    }

                    # 3. Ejecutar y confirmar
                    cursor.execute(sql_insert, params)
                    conn.commit()

                    return {"oracle_id": next_id, "tabla": self.tabla, "estado": "INSERT_REAL_OK", "mock": False}

        except oracledb.DatabaseError as e:
            err_obj, = e.args
            code = err_obj.code
            msg = err_obj.message
            if code == 1031:
                raise RuntimeError(
                    f"ORA-01031: Privilegios insuficientes. Conexión con Oracle 10g exitosa, "
                    f"pero el usuario '{self.user}' carece de permisos de INSERT en {self.tabla}."
                )
            elif code == 1:
                raise RuntimeError(f"ORA-00001: Conflicto de clave única o documento duplicado en Oracle: {msg}")
            elif code == 2291:
                raise RuntimeError(f"ORA-02291: Clave foránea no válida en Oracle: {msg}")
            elif code == 12899:
                raise RuntimeError(f"ORA-12899: Longitud de campo superada en Oracle: {msg}")
            else:
                raise RuntimeError(f"Error Oracle [{code}]: {msg}")


oracle_client = OracleClient()
