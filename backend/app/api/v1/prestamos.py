import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.prestamo import Prestamo, Cuota
from app.models.linea_prestamo import LineaPrestamo
from app.models.motor_calculo import MotorCalculo
from app.schemas.prestamo import PrestamoCreate, PrestamoResponse, CuotaResponse
from app.domain.calculadoras.sistema_frances import CalculadoraFrances, MotorConfig
from app.domain.enums import ConvencionTasa, BaseDias, ModalidadIva, AjusteResidual

router = APIRouter(prefix="/prestamos", tags=["Préstamos Otorgados"])


@router.post("", response_model=PrestamoResponse, status_code=201, summary="Otorgar un nuevo préstamo oficial")
def otorgar_prestamo(req: PrestamoCreate, db: Session = Depends(get_db)):
    """
    Otorga un préstamo formalmente: calcula el plan de amortización exacto en centavos,
    lo persiste en SQL Server junto con todas sus cuotas, y retorna el legajo completo.
    """
    cfg = MotorConfig()
    linea_nombre = None
    motor_nombre = "Francés Tradicional"

    # 1. Validar línea si se especificó
    if req.linea_id:
        linea = db.query(LineaPrestamo).filter(LineaPrestamo.id == req.linea_id).first()
        if not linea:
            raise HTTPException(status_code=404, detail="La línea de préstamo especificada no existe.")
        if not linea.activo:
            raise HTTPException(status_code=400, detail="La línea de préstamo seleccionada está inactiva.")

        # Validaciones de límites comerciales
        if req.monto_solicitado_centavos < linea.monto_minimo_centavos or req.monto_solicitado_centavos > linea.monto_maximo_centavos:
            raise HTTPException(
                status_code=400,
                detail=f"El monto debe estar entre ${linea.monto_minimo_centavos / 100:,.2f} y ${linea.monto_maximo_centavos / 100:,.2f}."
            )
        if req.plazo_meses < linea.plazo_minimo_meses or req.plazo_meses > linea.plazo_maximo_meses:
            raise HTTPException(
                status_code=400,
                detail=f"El plazo debe estar entre {linea.plazo_minimo_meses} y {linea.plazo_maximo_meses} cuotas."
            )

        linea_nombre = linea.nombre
        if linea.motor:
            motor_nombre = linea.motor.nombre
            cfg = MotorConfig(
                convencion_tasa=ConvencionTasa(linea.motor.convencion_tasa),
                base_dias=BaseDias(linea.motor.base_dias),
                modalidad_iva=ModalidadIva(linea.motor.modalidad_iva),
                ajuste_residual=AjusteResidual(linea.motor.ajuste_residual)
            )

    elif req.motor_id:
        motor = db.query(MotorCalculo).filter(MotorCalculo.id == req.motor_id).first()
        if motor:
            motor_nombre = motor.nombre
            cfg = MotorConfig(
                convencion_tasa=ConvencionTasa(motor.convencion_tasa),
                base_dias=BaseDias(motor.base_dias),
                modalidad_iva=ModalidadIva(motor.modalidad_iva),
                ajuste_residual=AjusteResidual(motor.ajuste_residual)
            )

    # 2. Calcular cronograma financiero oficial con el motor
    try:
        plan = CalculadoraFrances.calcular(
            monto_centavos=req.monto_solicitado_centavos,
            plazo_meses=req.plazo_meses,
            tasa_anual=req.tna_pactada,
            alicuota_iva=req.alicuota_iva,
            config=cfg,
            fecha_primer_vencimiento=req.fecha_primer_vencimiento
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Persistir en base de datos
    prestamo_id = str(uuid.uuid4())
    nuevo_prestamo = Prestamo(
        id=prestamo_id,
        persona_id=req.persona_id,
        persona_nombre=req.persona_nombre,
        persona_doc=req.persona_doc,
        linea_id=req.linea_id,
        linea_nombre=linea_nombre,
        motor_nombre=motor_nombre,
        monto_solicitado_centavos=req.monto_solicitado_centavos,
        plazo_meses=req.plazo_meses,
        tna_pactada=req.tna_pactada,
        tem_pactada=plan.tem,
        alicuota_iva=req.alicuota_iva,
        total_capital_centavos=plan.total_capital_centavos,
        total_interes_centavos=plan.total_interes_centavos,
        total_iva_centavos=plan.total_iva_centavos,
        total_a_pagar_centavos=plan.total_a_pagar_centavos,
        saldo_deudor_actual_centavos=plan.total_capital_centavos,
        estado="ACTIVO",
        fecha_alta=datetime.utcnow(),
        observaciones=req.observaciones
    )
    db.add(nuevo_prestamo)

    # 4. Insertar cada cuota del cronograma
    for c in plan.cronograma:
        nueva_cuota = Cuota(
            id=str(uuid.uuid4()),
            prestamo_id=prestamo_id,
            numero_cuota=c.numero_cuota,
            fecha_vencimiento=c.fecha_vencimiento,
            saldo_inicial_centavos=c.saldo_inicial_centavos,
            capital_centavos=c.capital_centavos,
            interes_centavos=c.interes_centavos,
            iva_interes_centavos=c.iva_interes_centavos,
            cuota_pura_centavos=c.cuota_pura_centavos,
            cuota_total_centavos=c.cuota_total_centavos,
            saldo_final_centavos=c.saldo_final_centavos,
            estado="PENDIENTE",
            monto_pagado_centavos=0
        )
        db.add(nueva_cuota)

    db.commit()
    db.refresh(nuevo_prestamo)
    return nuevo_prestamo


@router.get("", response_model=List[PrestamoResponse], summary="Listar préstamos otorgados")
def listar_prestamos(
    persona_id: Optional[int] = Query(None, description="Filtrar por ID de persona"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (ACTIVO, FINALIZADO, CANCELADO)"),
    buscar: Optional[str] = Query(None, description="Búsqueda por nombre o documento del socio"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retorna el listado histórico de préstamos otorgados por la institución con paginación y filtros.
    """
    query = db.query(Prestamo)

    if persona_id is not None:
        query = query.filter(Prestamo.persona_id == persona_id)

    if estado:
        query = query.filter(Prestamo.estado == estado.upper())

    if buscar:
        termino = f"%{buscar.strip()}%"
        query = query.filter((Prestamo.persona_nombre.ilike(termino)) | (Prestamo.persona_doc.ilike(termino)))

    prestamos = query.order_by(Prestamo.fecha_alta.desc()).offset(offset).limit(limit).all()
    return prestamos


@router.get("/{prestamo_id}", response_model=PrestamoResponse, summary="Obtener detalle y cuotas de un préstamo")
def obtener_prestamo(prestamo_id: str, db: Session = Depends(get_db)):
    """
    Retorna la información completa de un préstamo junto con todas sus cuotas y estados de pago.
    """
    prestamo = db.query(Prestamo).options(joinedload(Prestamo.cuotas)).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado.")
    return prestamo


@router.post("/{prestamo_id}/cancelar", response_model=PrestamoResponse, summary="Cancelar un préstamo otorgado")
def cancelar_prestamo(prestamo_id: str, db: Session = Depends(get_db)):
    """
    Cancela un préstamo y sus cuotas pendientes.
    """
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado.")

    prestamo.estado = "CANCELADO"
    db.commit()
    db.refresh(prestamo)
    return prestamo


@router.post("/{prestamo_id}/cuotas/{numero_cuota}/pagar", response_model=PrestamoResponse, summary="Registrar cobro de una cuota")
def pagar_cuota(prestamo_id: str, numero_cuota: int, db: Session = Depends(get_db)):
    """
    Registra el pago de una cuota del préstamo y actualiza el saldo deudor.
    """
    prestamo = db.query(Prestamo).options(joinedload(Prestamo.cuotas)).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado.")

    cuota = next((c for c in prestamo.cuotas if c.numero_cuota == numero_cuota), None)
    if not cuota:
        raise HTTPException(status_code=404, detail=f"Cuota #{numero_cuota} no encontrada.")

    if cuota.estado == "PAGADA":
        raise HTTPException(status_code=400, detail="Esta cuota ya se encuentra pagada.")

    cuota.estado = "PAGADA"
    cuota.fecha_pago = datetime.utcnow()
    cuota.monto_pagado_centavos = cuota.cuota_total_centavos

    # Reducir saldo deudor
    prestamo.saldo_deudor_actual_centavos = max(0, prestamo.saldo_deudor_actual_centavos - cuota.capital_centavos)

    # Verificar si todas están pagadas
    if all(c.estado == "PAGADA" for c in prestamo.cuotas):
        prestamo.estado = "FINALIZADO"
        prestamo.saldo_deudor_actual_centavos = 0

    db.commit()
    db.refresh(prestamo)
    return prestamo
