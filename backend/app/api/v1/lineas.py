from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.linea_prestamo import LineaPrestamo
from app.models.motor_calculo import MotorCalculo
from app.schemas.linea_prestamo import (
    LineaPrestamoCreate,
    LineaPrestamoUpdate,
    LineaPrestamoResponse
)

router = APIRouter(prefix="/lineas", tags=["Líneas de Préstamos"])


@router.get("", response_model=List[LineaPrestamoResponse])
def listar_lineas(solo_activas: bool = False, db: Session = Depends(get_db)):
    """Lista todas las líneas de crédito registradas."""
    query = db.query(LineaPrestamo)
    if solo_activas:
        query = query.filter(LineaPrestamo.activo == True)
    return query.order_by(LineaPrestamo.id).all()


@router.get("/{id}", response_model=LineaPrestamoResponse)
def obtener_linea(id: int, db: Session = Depends(get_db)):
    linea = db.query(LineaPrestamo).filter(LineaPrestamo.id == id).first()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de crédito no encontrada")
    return linea


@router.post("", response_model=LineaPrestamoResponse, status_code=status.HTTP_201_CREATED)
def crear_linea(data: LineaPrestamoCreate, db: Session = Depends(get_db)):
    existente = db.query(LineaPrestamo).filter(LineaPrestamo.codigo == data.codigo).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una línea con ese código")

    motor = db.query(MotorCalculo).filter(MotorCalculo.id == data.motor_id).first()
    if not motor:
        raise HTTPException(status_code=400, detail="El motor de cálculo especificado no existe")

    nueva = LineaPrestamo(**data.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.put("/{id}", response_model=LineaPrestamoResponse)
def actualizar_linea(id: int, data: LineaPrestamoUpdate, db: Session = Depends(get_db)):
    linea = db.query(LineaPrestamo).filter(LineaPrestamo.id == id).first()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de crédito no encontrada")

    if data.motor_id is not None:
        motor = db.query(MotorCalculo).filter(MotorCalculo.id == data.motor_id).first()
        if not motor:
            raise HTTPException(status_code=400, detail="El motor de cálculo especificado no existe")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            setattr(linea, field, val)

    db.commit()
    db.refresh(linea)
    return linea


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_linea(id: int, db: Session = Depends(get_db)):
    linea = db.query(LineaPrestamo).filter(LineaPrestamo.id == id).first()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de crédito no encontrada")

    db.delete(linea)
    db.commit()
    return None
