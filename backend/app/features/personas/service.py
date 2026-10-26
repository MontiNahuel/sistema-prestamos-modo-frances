from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.integrations.coopya_client import CoopYaClient, coopya_client
from app.integrations.oracle_client import OracleClient, oracle_client
from app.features.personas.schemas import PersonaCreateRequest, PersonaCreateResponse
from app.features.auditoria.repository import HistorialCambiosRepository
from app.features.auditoria.model import HistorialCambio
from app.features.socios.repository import SocioRepository
from app.features.socios.model import Socio
from app.features.prestamos.model import Prestamo
from app.features.personas.cuenta_corriente import (
    construir_cuenta_corriente_local,
    fusionar_cuenta_corriente
)


class PersonasService:
    """Orquesta el padrón de personas: Oracle (legacy), CoopYa (central) y medios de pago locales."""

    def __init__(
        self,
        client: CoopYaClient = coopya_client,
        oracle: OracleClient = oracle_client,
        auditoria_repo: Optional[HistorialCambiosRepository] = None,
        socio_repo: Optional[SocioRepository] = None
    ):
        self.client = client
        self.oracle = oracle
        self.auditoria_repo = auditoria_repo
        self.socio_repo = socio_repo

    async def buscar_personas(
        self,
        nombre_apellido: str = "",
        documento: str = "",
        id_persona: Optional[int] = None,
        token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            return await self.client.buscar_personas(
                nombre_apellido=nombre_apellido,
                documento=documento,
                id_persona=id_persona,
                token=token
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error consultando al sistema central: {str(e)}"
            )

    async def obtener_cuenta_corriente(
        self,
        id_persona: int,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Devuelve el estado de cuenta corriente espejo de CoopYa.
        Combina los conceptos centrales con las cuotas de préstamos locales.
        """
        coopya_res = None
        try:
            coopya_res = await self.client.obtener_cuenta_corriente_resumen(
                id_persona=id_persona,
                token=token
            )
        except Exception:
            pass

        local_res = None
        if self.socio_repo:
            try:
                socio = self.socio_repo.get_by_id(id_persona)
                if socio:
                    prestamos = (
                        self.socio_repo.db.query(Prestamo)
                        .filter(Prestamo.persona_id == id_persona)
                        .all()
                    )
                    local_res = construir_cuenta_corriente_local(socio, prestamos)
            except Exception:
                pass

        if coopya_res and local_res:
            return fusionar_cuenta_corriente(coopya_res, local_res)
        elif coopya_res:
            return coopya_res
        elif local_res:
            return local_res
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró información de cuenta corriente para la persona #{id_persona}"
            )

    async def crear_persona(
        self,
        req: PersonaCreateRequest,
        token: Optional[str] = None,
        usuario_operador: Optional[str] = "OPERADOR"
    ) -> PersonaCreateResponse:
        """
        Flujo de alta estricto:
        1. Mandamás primero: Inserta en PRESTAPROD.PERSONA de Oracle (modo thick).
           Si falla: Aborta inmediatamente, audita el error y NO impacta en CoopYa.
        2. Monolito después: Si Oracle fue exitoso, da de alta en CoopYa con sus medios de pago.
        3. Base local: Asienta al socio y crea el registro en medios_de_pago en PrestamosDB.
        """
        payload = req.model_dump()
        doc = req.documento.strip()
        nombre_completo = f"{req.apellido}, {req.nombre}".strip()

        # Resolver o inferir banco si viene CBU
        banco_id = req.banco_id
        banco_nombre = req.banco_nombre
        if self.socio_repo:
            if not banco_id and req.cbu and len(req.cbu) >= 3 and req.cbu[:3].isdigit():
                banco = self.socio_repo.get_banco_by_codigo(req.cbu[:3])
                if banco:
                    banco_id = banco.id
                    banco_nombre = banco.nombre
            elif banco_id and not banco_nombre:
                banco = self.socio_repo.get_banco_by_id(banco_id)
                if banco:
                    banco_nombre = banco.nombre
            elif not banco_id and banco_nombre:
                banco = self.socio_repo.get_banco_by_nombre(banco_nombre)
                if banco:
                    banco_id = banco.id

        payload["banco_id"] = banco_id
        payload["banco_nombre"] = banco_nombre

        # --- PASO 1: Oracle Legacy (Mandamás) ---
        try:
            oracle_res = self.oracle.insertar_persona(payload)
        except Exception as e:
            self._auditar(
                entidad_id=doc,
                accion="ERROR_ORACLE",
                usuario=usuario_operador,
                datos_nuevos={"error": str(e), "payload": payload},
                motivo="Fallo estricto en DB vieja Oracle. No se impactó CoopYa."
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Fallo en base legacy Oracle: {str(e)}. Operación abortada sin tocar CoopYa."
            )

        # --- PASO 2: Monolito CoopYa ---
        try:
            coopya_res = await self.client.crear_persona(payload, token=token)
        except Exception as e:
            self._auditar(
                entidad_id=doc,
                accion="DESINC_COOPYA",
                usuario=usuario_operador,
                datos_nuevos={"oracle": oracle_res, "error": str(e), "payload": payload},
                motivo="Persona creada en Oracle pero falló sincronización en CoopYa."
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Persona creada en base legacy Oracle pero falló el alta en CoopYa: {str(e)}"
            )

        # --- PASO 3: Base Local Microservicio (Socio y Medios de Pago) ---
        coopya_id = coopya_res.get("idPersona") or coopya_res.get("id")
        oracle_id = oracle_res.get("oracle_id")
        medio_de_pago_id = None

        if self.socio_repo and coopya_id:
            try:
                local_id = int(coopya_id)
                socio = self.socio_repo.get_by_id(local_id)
                if not socio:
                    socio = self.socio_repo.create(
                        Socio(
                            id=local_id,
                            nombre_completo=nombre_completo,
                            documento=doc
                        )
                    )
                else:
                    socio.nombre_completo = nombre_completo
                    socio.documento = doc
                    self.socio_repo.update(socio)

                # Persistir CBU / Alias en tabla medios_de_pago
                valor_medio = req.cbu or req.alias_cbu
                if valor_medio:
                    medio = self.socio_repo.add_medio_de_pago(
                        socio_id=local_id,
                        valor=valor_medio,
                        banco_id=banco_id,
                        tipo=2,
                        predeterminado=True,
                        titular_verificado=bool(req.cbu)
                    )
                    medio_de_pago_id = medio.id
            except Exception:
                pass

        # --- PASO 4: Auditoría de Éxito ---
        self._auditar(
            entidad_id=doc,
            accion="CREATE",
            usuario=usuario_operador,
            datos_nuevos={"oracle": oracle_res, "coopya": coopya_res, "banco": {"cbu": req.cbu, "banco_id": banco_id}},
            motivo="Alta exitosa de persona en Oracle (legacy) y CoopYa con medios de pago locales"
        )

        return PersonaCreateResponse(
            success=True,
            documento=doc,
            nombre_completo=nombre_completo,
            oracle_id=oracle_id,
            coopya_id=coopya_id,
            cbu=req.cbu,
            alias_cbu=req.alias_cbu,
            banco_id=banco_id,
            banco_nombre=banco_nombre,
            medio_de_pago_id=medio_de_pago_id,
            oracle_ok=True,
            coopya_ok=True,
            mensaje=f"Persona {nombre_completo} dada de alta exitosamente en Oracle y CoopYa."
        )

    def _auditar(
        self,
        entidad_id: str,
        accion: str,
        usuario: Optional[str],
        datos_nuevos: Dict[str, Any],
        motivo: str
    ) -> None:
        if not self.auditoria_repo:
            return
        try:
            self.auditoria_repo.create(
                HistorialCambio(
                    entidad_nombre="personas",
                    entidad_id=entidad_id,
                    accion=accion,
                    usuario_operador=usuario or "SISTEMA",
                    datos_nuevos=datos_nuevos,
                    motivo=motivo
                )
            )
        except Exception:
            pass
