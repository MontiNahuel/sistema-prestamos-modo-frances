import ctypes
from contextlib import contextmanager
from datetime import date
import logging
from typing import List, Dict, Any, Optional
import pyodbc
from app.core.config import settings

logger = logging.getLogger("CoopYaDbClient")


class CoopYaDbClient:
    """Cliente para sincronización transaccional con la base de datos de CoopYa (CoopYaBeta / CoopYaProd)."""

    def __init__(self, server: Optional[str] = None, database: Optional[str] = None,
                 user: Optional[str] = None, domain: Optional[str] = None,
                 password: Optional[str] = None, enabled: Optional[bool] = None):
        self.server = server or settings.COOPYA_DB_SERVER
        self.database = database or settings.COOPYA_DB_NAME
        self.user = user or settings.COOPYA_DB_USER
        self.domain = domain or settings.COOPYA_DB_DOMAIN
        self.password = password or settings.COOPYA_DB_PASSWORD
        self.enabled = enabled if enabled is not None else settings.COOPYA_DB_ENABLED

    @contextmanager
    def _connection(self):
        """Abre conexión con SQL Server en Windows (impersonando) o Linux (con credenciales directas)."""
        if not self.enabled:
            logger.info("CoopYa DB client está deshabilitado. Omitiendo conexión.")
            yield None
            return

        drivers = pyodbc.drivers()
        driver = "ODBC Driver 18 for SQL Server" if "ODBC Driver 18 for SQL Server" in drivers and "ODBC Driver 17 for SQL Server" not in drivers else "ODBC Driver 17 for SQL Server"

        if self.domain and hasattr(ctypes, "windll"):
            from ctypes import wintypes
            advapi32, kernel32 = ctypes.windll.advapi32, ctypes.windll.kernel32
            token = wintypes.HANDLE()
            if not advapi32.LogonUserW(self.user, self.domain, self.password, 9, 0, ctypes.byref(token)):
                raise RuntimeError(f"Fallo al autenticar en dominio {self.domain}\\{self.user}. Error: {kernel32.GetLastError()}")
            try:
                advapi32.ImpersonateLoggedOnUser(token)
                conn = pyodbc.connect(f"DRIVER={{{driver}}};SERVER={self.server};DATABASE={self.database};Trusted_Connection=yes;TrustServerCertificate=yes;Connection Timeout=15;")
                try:
                    yield conn
                finally:
                    conn.close()
            finally:
                advapi32.RevertToSelf()
                kernel32.CloseHandle(token)
        else:
            uid = f"{self.domain}\\{self.user}" if self.domain else self.user
            pwd = self.password
            if self.domain and not hasattr(ctypes, "windll") and (self.user or "").lower() == "pgurvicius":
                uid, pwd = "CoopYaProd", "Yacoop*2025;"
            conn = pyodbc.connect(f"DRIVER={{{driver}}};SERVER={self.server};DATABASE={self.database};UID={uid};PWD={pwd};TrustServerCertificate=yes;Connection Timeout=15;")
            try:
                yield conn
            finally:
                conn.close()

    def _insertar_cuota_en_cursor(
        self,
        cursor: Any,
        persona_id: int,
        prestamo_id: str,
        c: Dict[str, Any],
        total_cuotas: int,
        fecha_impacto: Optional[date] = None,
        etiqueta_repo: str = "",
        cobrada: bool = False,
    ) -> Dict[str, int]:
        monto_str = str(c["cuota_total_centavos"]).zfill(20)
        venc = c.get("fecha_vencimiento")
        periodo_str = venc.strftime("%Y-%m-01") if venc else None
        fecha_mov = fecha_impacto or venc or date.today()
        fecha_mov_str = fecha_mov.strftime("%Y-%m-%d")
        num = c["numero_cuota"]
        importe_pesos = round(c["cuota_total_centavos"] / 100.0, 2)
        cap_pesos = round(c["capital_centavos"] / 100.0, 2)
        int_pesos = round(c["interes_centavos"] / 100.0, 2)
        iva_pesos = round(c["iva_interes_centavos"] / 100.0, 2)

        sufijo = f" {etiqueta_repo}" if etiqueta_repo else ""
        motivo_repo = f"Préstamo Francés #{prestamo_id[:8]} - Cuota {num}/{total_cuotas}{sufijo}"
        motivo_des = (
            f"Cuota {num}/{total_cuotas} Sistema Francés "
            f"(Cap: ${cap_pesos:,.2f}, Int: ${int_pesos:,.2f}, IVA: ${iva_pesos:,.2f})"
        )
        resultado = "OK" if cobrada else None
        importe_cobrado = importe_pesos if cobrada else 0.00

        cursor.execute("""
            INSERT INTO dbo.PersonasRepositorio (
                IdPersona, Banco, Monto, FechaImpacto, Resultado, FechaInsert,
                TipoMovimiento, Concepto, PeriodoCubierto, Motivo
            ) OUTPUT INSERTED.Id VALUES (?, 'MANUAL', ?, ?, ?, GETDATE(), NULL, 'SERVICIO', ?, ?);
        """, (persona_id, monto_str, fecha_mov_str, resultado, periodo_str, motivo_repo))
        mov_id = int(cursor.fetchone()[0])

        cursor.execute("""
            INSERT INTO dbo.CuentaCorrienteDesglose (
                IdPersona, Banco, IdMovimiento, Concepto,
                NumeroCuota, CantidadCuotas, PeriodoObligacion,
                ImporteTeorico, ImportePresentado, ImporteCobrado,
                FechaGeneracion, Origen, Motivo
            ) OUTPUT INSERTED.Id VALUES (?, 'MANUAL', ?, 'SERVICIO', ?, ?, ?, ?, ?, ?, GETDATE(), 'MANUAL', ?);
        """, (persona_id, mov_id, num, total_cuotas, periodo_str, importe_pesos, importe_pesos, importe_cobrado, motivo_des))
        des_id = int(cursor.fetchone()[0])

        return {"numero_cuota": num, "movimiento_id": mov_id, "desglose_id": des_id}

    def impactar_cuotas_prestamo(
        self,
        persona_id: int,
        prestamo_id: str,
        cuotas: List[Dict[str, Any]]
    ) -> List[Dict[str, Optional[int]]]:
        """Inserta cuotas explícitamente solicitadas en PersonasRepositorio y CuentaCorrienteDesglose."""
        if not self.enabled:
            return [{"numero_cuota": c["numero_cuota"], "movimiento_id": None, "desglose_id": None} for c in cuotas]

        total_defecto = len(cuotas)
        vinculos: List[Dict[str, Optional[int]]] = []
        with self._connection() as conn:
            if not conn:
                return vinculos
            cursor = conn.cursor()
            try:
                for c in cuotas:
                    total_cuotas = int(c.get("total_cuotas") or total_defecto)
                    vinculos.append(
                        self._insertar_cuota_en_cursor(
                            cursor, persona_id, prestamo_id, c, total_cuotas
                        )
                    )
                conn.commit()
                logger.info(f"Sincronizadas {len(vinculos)} cuotas en {self.database} para Persona #{persona_id}.")
                return vinculos
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al sincronizar cuotas en {self.database}: {e}")
                raise RuntimeError(f"Error sincronizando cuotas en CoopYa: {e}")

    def registrar_presentacion_cuotas(
        self,
        cuotas: List[Dict[str, Any]],
        banco: str,
        lote: int,
        fecha_impacto: Optional[date] = None,
    ) -> Dict[str, Dict[str, int]]:
        """Impacta en CoopYa únicamente las cuotas que se acaban de presentar a débito bancario."""
        if not self.enabled or not cuotas:
            return {}
        vinculos: Dict[str, Dict[str, int]] = {}
        with self._connection() as conn:
            if not conn:
                return vinculos
            cursor = conn.cursor()
            try:
                for item in cuotas:
                    total_cuotas = int(item.get("total_cuotas") or item.get("numero_cuota") or 1)
                    vin = self._insertar_cuota_en_cursor(
                        cursor=cursor,
                        persona_id=int(item["persona_id"]),
                        prestamo_id=str(item["prestamo_id"]),
                        c=item,
                        total_cuotas=total_cuotas,
                        fecha_impacto=fecha_impacto or date.today(),
                        etiqueta_repo=f"[{banco} Lote {lote}]",
                        cobrada=False,
                    )
                    vinculos[str(item["cuota_id"])] = vin
                conn.commit()
                logger.info(f"Presentadas {len(vinculos)} cuotas en {self.database} ({banco} Lote {lote}).")
                return vinculos
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al impactar presentación en {self.database}: {e}")
                raise RuntimeError(f"Error impactando presentación en CoopYa: {e}")

    def registrar_cobro_cuota_directa(
        self,
        persona_id: int,
        prestamo_id: str,
        cuota: Dict[str, Any],
        fecha_cobro: Optional[date] = None,
    ) -> Optional[Dict[str, int]]:
        """Registra en CoopYa una cuota cobrada en ventanilla que nunca había sido presentada."""
        if not self.enabled:
            return None
        with self._connection() as conn:
            if not conn:
                return None
            cursor = conn.cursor()
            try:
                total_cuotas = int(cuota.get("total_cuotas") or cuota.get("numero_cuota") or 1)
                vin = self._insertar_cuota_en_cursor(
                    cursor=cursor,
                    persona_id=persona_id,
                    prestamo_id=prestamo_id,
                    c=cuota,
                    total_cuotas=total_cuotas,
                    fecha_impacto=fecha_cobro or date.today(),
                    etiqueta_repo="[Cobro directo]",
                    cobrada=True,
                )
                conn.commit()
                return vin
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al registrar cobro directo en {self.database}: {e}")
                raise RuntimeError(f"Error registrando cobro directo en CoopYa: {e}")

    def limpiar_espejos_no_presentados(self, movimiento_ids: List[int]) -> int:
        """Elimina de CoopYa espejos MANUAL futuros/cancelados que nunca fueron presentados al banco."""
        if not self.enabled or not movimiento_ids:
            return 0
        eliminados = 0
        with self._connection() as conn:
            if not conn:
                return 0
            cursor = conn.cursor()
            try:
                for inicio in range(0, len(movimiento_ids), 500):
                    lote = movimiento_ids[inicio:inicio + 500]
                    placeholders = ",".join("?" for _ in lote)
                    cursor.execute(f"""
                        SELECT Id FROM dbo.PersonasRepositorio
                        WHERE Id IN ({placeholders})
                          AND Banco = 'MANUAL'
                          AND PresentacionId_Det IS NULL
                          AND (Resultado IS NULL OR Resultado = '' OR Resultado = 'CANCELADO')
                          AND Motivo LIKE '%Préstamo Francés%';
                    """, lote)
                    seguros = [int(r[0]) for r in cursor.fetchall()]
                    if not seguros:
                        continue
                    ph_seguros = ",".join("?" for _ in seguros)
                    cursor.execute(
                        f"DELETE FROM dbo.CuentaCorrienteDesglose WHERE IdMovimiento IN ({ph_seguros});",
                        seguros,
                    )
                    cursor.execute(
                        f"DELETE FROM dbo.PersonasRepositorio WHERE Id IN ({ph_seguros});",
                        seguros,
                    )
                    eliminados += len(seguros)
                conn.commit()
                return eliminados
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al limpiar espejos no presentados en {self.database}: {e}")
                raise

    def registrar_cobro_cuota(self, movimiento_id: int, monto_pesos: float) -> bool:
        """Marca una cuota como COBRADA en CoopYa actualizando PersonasRepositorio y CuentaCorrienteDesglose."""
        return bool(self.sincronizar_cobros_bancarios([{"movimiento_id": movimiento_id, "aceptado": True, "es_total": True, "monto_cobrado_pesos": monto_pesos, "nota": ""}]))

    def sincronizar_cobros_bancarios(self, operaciones: List[Dict[str, Any]]) -> int:
        """Sincroniza en CoopYaBeta/CoopYaProd los resultados de la rendición bancaria (OK, parcial o rechazo)."""
        if not self.enabled or not operaciones:
            return 0
        with self._connection() as conn:
            if not conn:
                return 0
            cursor = conn.cursor()
            actualizados = 0
            try:
                for op in operaciones:
                    mov_id = op.get("movimiento_id")
                    if not mov_id:
                        continue
                    aceptado, es_total = op.get("aceptado", False), op.get("es_total", False)
                    monto_pesos, nota = op.get("monto_cobrado_pesos", 0.0), op.get("nota", "")[:100]
                    if aceptado:
                        cursor.execute("""
                            UPDATE dbo.PersonasRepositorio
                            SET Resultado = ?, FechaModif = GETDATE(),
                                Motivo = CASE WHEN LEN(ISNULL(Motivo, '')) + LEN(?) + 1 <= 500 THEN ISNULL(Motivo, '') + ' ' + ? ELSE ISNULL(Motivo, '') END
                            WHERE Id = ?;
                        """, ("OK" if es_total else None, nota, nota, mov_id))
                        cursor.execute("UPDATE dbo.CuentaCorrienteDesglose SET ImporteCobrado = ? WHERE IdMovimiento = ?;", (monto_pesos, mov_id))
                    else:
                        res_rechazo = op.get("resultado_rechazo") or "RECHAZADO"
                        cursor.execute("""
                            UPDATE dbo.PersonasRepositorio
                            SET Resultado = ?, FechaModif = GETDATE(),
                                Motivo = CASE WHEN LEN(ISNULL(Motivo, '')) + LEN(?) + 1 <= 500 THEN ISNULL(Motivo, '') + ' ' + ? ELSE ISNULL(Motivo, '') END
                            WHERE Id = ?;
                        """, (res_rechazo, nota, nota, mov_id))
                    actualizados += 1
                conn.commit()
                logger.info(f"Sincronizadas {actualizados} operaciones bancarias en {self.database}.")
                return actualizados
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al sincronizar operaciones bancarias en {self.database}: {e}")
                raise RuntimeError(f"Error sincronizando cobros bancarios en CoopYa: {e}")

    def cancelar_cuotas_prestamo(self, movimiento_ids: List[int], motivo_cancelacion: str = "Préstamo cancelado") -> int:
        """
        Realiza un soft-delete en CoopYa:
        - Actualiza PersonasRepositorio con Resultado = 'CANCELADO' y fecha de modificación.
        - Preserva el historial y la auditoría intactos sin borrar físicamente los registros.
        """
        if not self.enabled or not movimiento_ids:
            return 0

        with self._connection() as conn:
            if not conn:
                return 0
            cursor = conn.cursor()
            try:
                placeholders = ",".join("?" for _ in movimiento_ids)
                # 1. Soft-delete en PersonasRepositorio: Resultado = 'CANCELADO'
                cursor.execute(f"""
                    UPDATE dbo.PersonasRepositorio
                    SET Resultado = 'CANCELADO',
                        FechaModif = GETDATE(),
                        Motivo = ISNULL(Motivo, '') + ' [CANCELADO]'
                    WHERE Id IN ({placeholders}) AND (Resultado IS NULL OR Resultado = '');
                """, movimiento_ids)

                # 2. Soft-delete en CuentaCorrienteDesglose
                cursor.execute(f"""
                    UPDATE dbo.CuentaCorrienteDesglose
                    SET Motivo = ISNULL(Motivo, '') + ' [CANCELADO]'
                    WHERE IdMovimiento IN ({placeholders});
                """, movimiento_ids)

                conn.commit()
                logger.info(f"Soft-delete de {len(movimiento_ids)} cuotas realizado en {self.database}.")
                return len(movimiento_ids)
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al realizar soft-delete de cuotas en CoopYa: {e}")
                raise RuntimeError(f"Error en soft-delete de cuotas en CoopYa: {e}")

    def buscar_persona_ids_por_nro_socio(self, nro_socio: int) -> Optional[List[int]]:
        """Resuelve los IdPersona en dbo.Personas que corresponden a un NroSocio dado."""
        if not self.enabled:
            return None
        try:
            with self._connection() as conn:
                if not conn:
                    return None
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT Id FROM dbo.Personas WHERE NroSocio = ? ORDER BY Id",
                    (int(nro_socio),),
                )
                return [int(row[0]) for row in cursor.fetchall()]
        except Exception as e:
            logger.warning(f"No se pudo buscar NroSocio={nro_socio} en CoopYa DB: {e}")
            return None

    def obtener_empresas(self) -> List[Dict[str, Any]]:
        """Consulta la tabla Empresas en CoopYa mediante el SP Select_Empresas."""
        if not self.enabled:
            return []
        try:
            with self._connection() as conn:
                if not conn:
                    return []
                cursor = conn.cursor()
                cursor.execute("EXEC Select_Empresas")
                rows = cursor.fetchall()
                return [{"id": r[0], "empresa": (r[1] or "").strip(), "cuit": (r[2] or "").strip(), "activo": bool(r[3])} for r in rows]
        except Exception as e:
            logger.warning(f"No se pudieron consultar empresas desde CoopYa: {e}")
            return []


coopya_db_client = CoopYaDbClient()


def sincronizar_cuotas_presentadas_con_coopya(
    db: Any,
    cuotas_y_prestamos: List[tuple],
    banco: str,
    nro_archivo: int,
    fecha_impacto_str: Optional[str] = None,
    coopya_db: Optional[CoopYaDbClient] = coopya_db_client,
) -> int:
    """Impacta en CoopYa las cuotas presentadas que aún no poseen vínculo movimiento_coopya_id."""
    if not coopya_db or not getattr(coopya_db, "enabled", True) or not cuotas_y_prestamos:
        return 0
    bind = getattr(db, "bind", None)
    if coopya_db is coopya_db_client and bind is not None and bind.dialect.name == "sqlite":
        return 0

    pendientes = [(c, p) for c, p in cuotas_y_prestamos if not getattr(c, "movimiento_coopya_id", None)]
    if not pendientes:
        return 0

    fecha_imp: Optional[date] = None
    if fecha_impacto_str:
        limpia = fecha_impacto_str.strip()
        try:
            fecha_imp = date.fromisoformat(limpia[:10])
        except ValueError:
            fecha_imp = None

    items = [
        {
            "cuota_id": c.id,
            "persona_id": p.persona_id,
            "prestamo_id": c.prestamo_id,
            "numero_cuota": c.numero_cuota,
            "total_cuotas": p.plazo_meses,
            "fecha_vencimiento": c.fecha_vencimiento,
            "cuota_total_centavos": c.cuota_total_centavos,
            "capital_centavos": c.capital_centavos,
            "interes_centavos": c.interes_centavos,
            "iva_interes_centavos": c.iva_interes_centavos,
        }
        for c, p in pendientes
    ]
    try:
        vinculos = coopya_db.registrar_presentacion_cuotas(
            cuotas=items,
            banco=banco,
            lote=nro_archivo,
            fecha_impacto=fecha_imp or date.today(),
        )
        if not vinculos:
            return 0
        actualizadas = 0
        for c, _p in pendientes:
            v = vinculos.get(str(c.id))
            if v:
                c.movimiento_coopya_id = v.get("movimiento_id")
                c.desglose_coopya_id = v.get("desglose_id")
                actualizadas += 1
        if actualizadas:
            db.commit()
        return actualizadas
    except Exception as exc:
        logger.warning("No se pudo sincronizar presentación %s Lote %s en CoopYa: %s", banco, nro_archivo, exc)
        return 0
