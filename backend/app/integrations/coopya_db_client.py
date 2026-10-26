import ctypes
from ctypes import wintypes
from contextlib import contextmanager
import logging
from typing import List, Dict, Any, Optional
import pyodbc
from app.core.config import settings

logger = logging.getLogger("CoopYaDbClient")


class CoopYaDbClient:
    """Cliente para sincronización transaccional con la base de datos de CoopYa (CoopYaBeta / CoopYaProd)."""

    def __init__(
        self,
        server: Optional[str] = None,
        database: Optional[str] = None,
        user: Optional[str] = None,
        domain: Optional[str] = None,
        password: Optional[str] = None,
        enabled: Optional[bool] = None
    ):
        self.server = server or settings.COOPYA_DB_SERVER
        self.database = database or settings.COOPYA_DB_NAME
        self.user = user or settings.COOPYA_DB_USER
        self.domain = domain or settings.COOPYA_DB_DOMAIN
        self.password = password or settings.COOPYA_DB_PASSWORD
        self.enabled = enabled if enabled is not None else settings.COOPYA_DB_ENABLED

    @contextmanager
    def _connection(self):
        """Abre conexión con SQL Server impersonando al usuario de dominio CoopYa."""
        if not self.enabled:
            logger.info("CoopYa DB client está deshabilitado. Omitiendo conexión.")
            yield None
            return

        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        logon_type = 9  # LOGON32_LOGON_NEW_CREDENTIALS
        provider = 0    # LOGON32_PROVIDER_DEFAULT

        token = wintypes.HANDLE()
        ok = advapi32.LogonUserW(
            self.user,
            self.domain,
            self.password,
            logon_type,
            provider,
            ctypes.byref(token)
        )
        if not ok:
            err = kernel32.GetLastError()
            raise RuntimeError(f"Fallo al autenticar en dominio {self.domain}\\{self.user}. Error: {err}")

        try:
            advapi32.ImpersonateLoggedOnUser(token)
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                "Trusted_Connection=yes;"
                "TrustServerCertificate=yes;"
                "Connection Timeout=15;"
            )
            conn = pyodbc.connect(conn_str)
            try:
                yield conn
            finally:
                conn.close()
        finally:
            advapi32.RevertToSelf()
            kernel32.CloseHandle(token)

    def impactar_cuotas_prestamo(
        self,
        persona_id: int,
        prestamo_id: str,
        cuotas: List[Dict[str, Any]]
    ) -> List[Dict[str, int]]:
        """
        Inserta el cronograma del Sistema Francés en CoopYa:
        - Cada cuota se registra en PersonasRepositorio (movimiento deudor pendiente).
        - Se desglose en CuentaCorrienteDesglose con NumeroCuota, CantidadCuotas e Importe variable.
        Retorna la lista de IDs vinculados [(numero_cuota, movimiento_id, desglose_id), ...].
        """
        if not self.enabled:
            return [{"numero_cuota": c["numero_cuota"], "movimiento_id": None, "desglose_id": None} for c in cuotas]

        total_cuotas = len(cuotas)
        vinculos = []

        with self._connection() as conn:
            if not conn:
                return vinculos

            cursor = conn.cursor()
            try:
                for c in cuotas:
                    monto_str = str(c["cuota_total_centavos"]).zfill(20)
                    venc = c["fecha_vencimiento"]
                    periodo_str = venc.strftime("%Y-%m-01") if venc else None
                    venc_str = venc.strftime("%Y-%m-%d") if venc else None
                    num = c["numero_cuota"]
                    importe_pesos = round(c["cuota_total_centavos"] / 100.0, 2)
                    cap_pesos = round(c["capital_centavos"] / 100.0, 2)
                    int_pesos = round(c["interes_centavos"] / 100.0, 2)
                    iva_pesos = round(c["iva_interes_centavos"] / 100.0, 2)

                    motivo_repo = f"Préstamo Francés #{prestamo_id[:8]} - Cuota {num}/{total_cuotas}"
                    motivo_des = (
                        f"Cuota {num}/{total_cuotas} Sistema Francés "
                        f"(Cap: ${cap_pesos:,.2f}, Int: ${int_pesos:,.2f}, IVA: ${iva_pesos:,.2f})"
                    )

                    # 1. Insertar movimiento en PersonasRepositorio
                    cursor.execute("""
                        INSERT INTO dbo.PersonasRepositorio (
                            IdPersona, Banco, Monto, FechaImpacto, Resultado, FechaInsert,
                            TipoMovimiento, Concepto, PeriodoCubierto, Motivo
                        ) OUTPUT INSERTED.Id VALUES (?, 'MANUAL', ?, ?, NULL, GETDATE(), NULL, 'SERVICIO', ?, ?);
                    """, (persona_id, monto_str, venc_str, periodo_str, motivo_repo))
                    mov_id = int(cursor.fetchone()[0])

                    # 2. Insertar desglose en CuentaCorrienteDesglose
                    cursor.execute("""
                        INSERT INTO dbo.CuentaCorrienteDesglose (
                            IdPersona, Banco, IdMovimiento, Concepto,
                            NumeroCuota, CantidadCuotas, PeriodoObligacion,
                            ImporteTeorico, ImportePresentado, ImporteCobrado,
                            FechaGeneracion, Origen, Motivo
                        ) OUTPUT INSERTED.Id VALUES (?, 'MANUAL', ?, 'SERVICIO', ?, ?, ?, ?, ?, 0.00, GETDATE(), 'MANUAL', ?);
                    """, (persona_id, mov_id, num, total_cuotas, periodo_str, importe_pesos, importe_pesos, motivo_des))
                    des_id = int(cursor.fetchone()[0])

                    vinculos.append({
                        "numero_cuota": num,
                        "movimiento_id": mov_id,
                        "desglose_id": des_id
                    })

                conn.commit()
                logger.info(f"Sincronizadas {len(vinculos)} cuotas en {self.database} para Persona #{persona_id}.")
                return vinculos

            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al sincronizar cuotas en {self.database}: {e}")
                raise RuntimeError(f"Error sincronizando cuotas en CoopYa: {e}")

    def registrar_cobro_cuota(self, movimiento_id: int, monto_pesos: float) -> bool:
        """Marca una cuota como COBRADA en CoopYa actualizando PersonasRepositorio y CuentaCorrienteDesglose."""
        if not self.enabled or not movimiento_id:
            return False

        with self._connection() as conn:
            if not conn:
                return False
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    UPDATE dbo.PersonasRepositorio
                    SET Resultado = 'OK', FechaModif = GETDATE()
                    WHERE Id = ?;
                """, (movimiento_id,))

                cursor.execute("""
                    UPDATE dbo.CuentaCorrienteDesglose
                    SET ImporteCobrado = ?
                    WHERE IdMovimiento = ?;
                """, (monto_pesos, movimiento_id))

                conn.commit()
                logger.info(f"Cuota (Movimiento #{movimiento_id}) cobrada exitosamente en {self.database}.")
                return True
            except Exception as e:
                conn.rollback()
                logger.error(f"Fallo al marcar cuota #{movimiento_id} como cobrada en CoopYa: {e}")
                raise RuntimeError(f"Error registrando pago en CoopYa: {e}")

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


coopya_db_client = CoopYaDbClient()
