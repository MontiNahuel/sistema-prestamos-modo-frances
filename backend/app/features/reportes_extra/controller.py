"""Controlador HTTP para Reportes Extra sobre la base historica Oracle."""

from fastapi import APIRouter, Depends

from app.features.reportes_extra.schemas import (
    ReporteExtraCatalinasRequest,
    ReporteExtraCatalinasResponse,
)
from app.features.reportes_extra.service import ReportesExtraService

router = APIRouter(prefix="/reportes-extra", tags=["Reportes Extra"])


def get_reportes_extra_service() -> ReportesExtraService:
    """Instancia el servicio de reportes extra sobre Oracle."""
    return ReportesExtraService()


@router.post("/catalinas-cobros", response_model=ReporteExtraCatalinasResponse)
def consultar_cobros_catalinas(
    req: ReporteExtraCatalinasRequest,
    service: ReportesExtraService = Depends(get_reportes_extra_service),
) -> ReporteExtraCatalinasResponse:
    """Ejecuta el reporte de control de cobros Canal 12 / Prestador 68 en Oracle."""
    return service.consultar_cobros_catalinas(req)
