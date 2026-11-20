"""Esquemas de entrada y salida para Reportes Extra (Oracle)."""

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

PERIODO_RE = re.compile(r"^(19|20)\d{2}(0[1-9]|1[0-2])$")
DNI_TOKEN_RE = re.compile(r"^\d{6,10}$")


class ReporteExtraCatalinasRequest(BaseModel):
    """Parametros de entrada para la consulta de cobros Prestador 68 / Catalinas en Oracle."""

    periodo_desde: str = Field(..., description="Periodo haber inicial en formato AAAAMM")
    periodo_hasta: Optional[str] = Field(
        default=None,
        description="Periodo haber final en formato AAAAMM, o null para consultar un solo mes",
    )
    dnis: Optional[str] = Field(
        default=None,
        description="Lista de DNIs separados por coma o null para incluir todos",
    )
    tolerancia_pct: float = Field(
        default=0.05,
        ge=0.0,
        le=1.0,
        description="Margen de tolerancia vs cuota Catalinas en fraccion decimal (ej: 0.05 = 5%)",
    )
    ver_sin_lote: Literal["S", "N"] = Field(
        default="S",
        description="Indica si se muestran meses sin lote cargado ('S' o 'N')",
    )

    @field_validator("periodo_desde")
    @classmethod
    def validar_periodo_desde(cls, value: str) -> str:
        limpio = value.strip()
        if not PERIODO_RE.match(limpio):
            raise ValueError("periodo_desde debe tener formato AAAAMM valido (ej: 202605).")
        return limpio

    @field_validator("periodo_hasta", mode="before")
    @classmethod
    def validar_periodo_hasta(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        limpio = str(value).strip()
        if not limpio:
            return None
        if not PERIODO_RE.match(limpio):
            raise ValueError("periodo_hasta debe tener formato AAAAMM valido (ej: 202706).")
        return limpio

    @field_validator("dnis", mode="before")
    @classmethod
    def validar_dnis(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        limpio = str(value).strip()
        if not limpio:
            return None
        tokens = [token.strip() for token in limpio.split(",") if token.strip()]
        if not tokens:
            return None
        for token in tokens:
            if not DNI_TOKEN_RE.match(token):
                raise ValueError(
                    f"DNI invalido '{token}'. Ingrese DNIs numericos separados por coma."
                )
        normalizado = ",".join(tokens)
        if len(normalizado) > 4000:
            raise ValueError("La lista de DNIs excede el maximo permitido de 4000 caracteres.")
        return normalizado

    @field_validator("ver_sin_lote", mode="before")
    @classmethod
    def validar_ver_sin_lote(cls, value: str) -> str:
        normalizado = str(value).strip().upper()
        if normalizado not in ("S", "N"):
            raise ValueError("ver_sin_lote debe ser 'S' o 'N'.")
        return normalizado

    @model_validator(mode="after")
    def validar_rango_periodos(self) -> "ReporteExtraCatalinasRequest":
        if self.periodo_hasta is not None and self.periodo_hasta < self.periodo_desde:
            raise ValueError("periodo_hasta no puede ser anterior a periodo_desde.")
        return self


class CatalinasCobroItem(BaseModel):
    """Fila devuelta por la consulta de control Prestador 68 / Catalinas en Oracle."""

    periodo_haber: str
    dni: str
    nombre_persona: Optional[str] = None
    estado: str
    importe_cobro: float
    idcobro: Optional[int] = None
    fecha_cobro: Optional[str] = None
    idprestamo: Optional[int] = None


class ReporteExtraCatalinasResumen(BaseModel):
    """Totales resumidos del resultado del reporte extra en Oracle."""

    total_filas: int
    cobrados: int
    no_cobrados: int
    sin_lote: int
    importe_total: float
    importe_cobrados: float
    importe_no_cobrados: float
    importe_sin_lote: float


class ReporteExtraCatalinasResponse(BaseModel):
    """Respuesta completa del reporte extra Catalinas / Prestador 68."""

    parametros: ReporteExtraCatalinasRequest
    resumen: ReporteExtraCatalinasResumen
    filas: list[CatalinasCobroItem]
