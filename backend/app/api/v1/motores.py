from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.motor_calculo import MotorCalculo
from app.schemas.motor_calculo import (
    MotorCalculoCreate,
    MotorCalculoUpdate,
    MotorCalculoResponse
)

router = APIRouter(prefix="/motores", tags=["Motores de Fórmulas"])


@router.get("", response_model=List[MotorCalculoResponse])
def listar_motores(solo_activos: bool = False, db: Session = Depends(get_db)):
    """Lista todos los motores de cálculo registrados."""
    query = db.query(MotorCalculo)
    if solo_activos:
        query = query.filter(MotorCalculo.activo == True)
    return query.order_by(MotorCalculo.id).all()


@router.get("/{id}", response_model=MotorCalculoResponse)
def obtener_motor(id: int, db: Session = Depends(get_db)):
    motor = db.query(MotorCalculo).filter(MotorCalculo.id == id).first()
    if not motor:
        raise HTTPException(status_code=404, detail="Motor de cálculo no encontrado")
    return motor


@router.post("", response_model=MotorCalculoResponse, status_code=status.HTTP_201_CREATED)
def crear_motor(data: MotorCalculoCreate, db: Session = Depends(get_db)):
    existente = db.query(MotorCalculo).filter(MotorCalculo.codigo == data.codigo).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un motor con ese código")

    nuevo = MotorCalculo(
        codigo=data.codigo,
        nombre=data.nombre,
        descripcion=data.descripcion,
        convencion_tasa=data.convencion_tasa.value,
        base_dias=data.base_dias.value,
        modalidad_iva=data.modalidad_iva.value,
        ajuste_residual=data.ajuste_residual.value,
        activo=data.activo,
        es_sistema=False
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put("/{id}", response_model=MotorCalculoResponse)
def actualizar_motor(id: int, data: MotorCalculoUpdate, db: Session = Depends(get_db)):
    motor = db.query(MotorCalculo).filter(MotorCalculo.id == id).first()
    if not motor:
        raise HTTPException(status_code=404, detail="Motor de cálculo no encontrado")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            # Si es un Enum, guardamos su valor
            setattr(motor, field, getattr(val, "value", val))

    db.commit()
    db.refresh(motor)
    return motor


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_motor(id: int, db: Session = Depends(get_db)):
    motor = db.query(MotorCalculo).filter(MotorCalculo.id == id).first()
    if not motor:
        raise HTTPException(status_code=404, detail="Motor de cálculo no encontrado")
    if motor.es_sistema:
        raise HTTPException(status_code=400, detail="Los motores estándar del sistema no pueden eliminarse")

    db.delete(motor)
    db.commit()
    return None
