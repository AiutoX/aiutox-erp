"""Dashboard response schemas — Sprint 5."""

from typing import Any

from pydantic import BaseModel, Field


class OcupacionWidget(BaseModel):
    total: int
    ocupados: int
    disponibles: int
    mantenimiento: int
    otros: int


class AgingBucket(BaseModel):
    count: int
    total: float


class CarteraAging(BaseModel):
    bucket_0_30: AgingBucket = Field(alias="0_30")
    bucket_31_60: AgingBucket = Field(alias="31_60")
    bucket_61_90: AgingBucket = Field(alias="61_90")
    bucket_over_90: AgingBucket = Field(alias="over_90")

    model_config = {"populate_by_name": True}


class ContratoVencimiento(BaseModel):
    id: str
    property_id: str
    canon_actual: float
    fecha_fin: str
    estado: str
    dias_restantes: int


class OtCritica(BaseModel):
    id: str
    titulo: str
    prioridad: str
    estado: str
    property_id: str


class RealEstateDashboard(BaseModel):
    ocupacion: OcupacionWidget
    cartera_aging: dict[str, Any]
    contratos_por_vencer: list[ContratoVencimiento]
    mantenimientos_criticos: list[OtCritica]


class PLMensual(BaseModel):
    year: int
    month: int
    total_income: float
    total_expenses: float
    net_result: float


class CashFlowPoint(BaseModel):
    period: str
    income: float
    expenses: float
    net: float


class TopProperty(BaseModel):
    property_id: str
    total_revenue: float


class TopDebtor(BaseModel):
    entity_id: str
    entity_type: str
    total_debt: float
    charge_count: int


class FinancialDashboard(BaseModel):
    pl_mensual: PLMensual
    flujo_caja: list[CashFlowPoint]
    top_rentables: list[TopProperty]
    top_morosos: list[TopDebtor]


class OtByStatus(BaseModel):
    status: str
    count: int


class MttrPoint(BaseModel):
    period: str
    avg_hours: float


class TopAssetFallas(BaseModel):
    asset_id: str
    failures: int


class CMOSDashboard(BaseModel):
    ots_por_estado: list[OtByStatus]
    mttr_tendencia: list[MttrPoint]
    pct_pm: float | None
    top_activos_fallas: list[TopAssetFallas]
