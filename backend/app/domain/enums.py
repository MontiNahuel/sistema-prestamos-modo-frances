from enum import Enum


class ConvencionTasa(str, Enum):
    TNA_PROPORCIONAL = "TNA_PROPORCIONAL"       # i = TNA / 12 (Mensual proporcional)
    TEA_COMPUESTA = "TEA_COMPUESTA"             # i = (1 + TEA)^(1/12) - 1 (Mensual equivalente)
    TNA_DIAS_REALES = "TNA_DIAS_REALES"         # i_k = TNA * (dias / 365)


class BaseDias(str, Enum):
    COMERCIAL_30_360 = "COMERCIAL_30_360"       # Meses de 30 días fijos (base 360)
    ACTUAL_365 = "ACTUAL_365"                   # Días reales de calendario (base 365)
    ACTUAL_360 = "ACTUAL_360"                   # Días reales de calendario (base 360)


class ModalidadIva(str, Enum):
    IVA_DECRECIENTE = "IVA_DECRECIENTE"         # Cuota pura fija, IVA decrece con interés
    CUOTA_TOTAL_PLANA = "CUOTA_TOTAL_PLANA"     # Cuota total fija (Capital + Interés + IVA constante)
    EXENTO = "EXENTO"                           # Sin IVA (0.00%)


class AjusteResidual(str, Enum):
    ULTIMA_CUOTA = "ULTIMA_CUOTA"               # Absorbe centavo residual en la cuota n
    PRIMERA_CUOTA = "PRIMERA_CUOTA"             # Absorbe centavo residual en la cuota 1
