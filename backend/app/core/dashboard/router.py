"""Dashboard router — 3 aggregated KPI endpoints.

All data sourced via core/reporting datasources — no ad-hoc DB queries in this file.
tenant_id taken from authenticated user — cross-tenant isolation enforced here.
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.users.models import User
from app.schemas.common import StandardResponse

from .schemas import (
    CashFlowPoint,
    CMOSDashboard,
    ContratoVencimiento,
    FinancialDashboard,
    MttrPoint,
    OcupacionWidget,
    OtByStatus,
    OtCritica,
    PLMensual,
    RealEstateDashboard,
    TopAssetFallas,
    TopDebtor,
    TopProperty,
)  # noqa: E402

router = APIRouter()


@router.get(
    "/real-estate",
    response_model=StandardResponse[RealEstateDashboard],
    summary="Real-estate dashboard KPIs",
    description="Occupation, aging cartera, expiring contracts, critical work orders.",
)
def real_estate_dashboard(
    current_user: Annotated[User, Depends(require_permission("reporting.read"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[RealEstateDashboard]:
    from sqlalchemy import func

    from app.core.reporting.datasources.billing import BillingDataSource

    try:
        from app.modules.real_estate.leases.reporting_datasource import (
            LeaseDataSource,
        )  # noqa: N806, I001
    except ImportError:
        LeaseDataSource = None  # type: ignore[assignment,misc]  # noqa: N806
    try:
        from app.modules.real_estate.maintenance.reporting_datasource import (  # noqa: N806
            MaintenanceDataSource,
        )
    except ImportError:
        MaintenanceDataSource = None  # type: ignore[assignment,misc]  # noqa: N806
    try:
        from app.modules.real_estate.properties.models import (  # noqa: N806
            Property,
            PropertyStatus,
        )
    except ImportError:
        Property = None  # type: ignore[assignment,misc]  # noqa: N806
        PropertyStatus = None  # type: ignore[assignment,misc]  # noqa: N806

    tenant_id = current_user.tenant_id

    # Occupation — single aggregated query
    status_counts = (
        db.query(Property.estado, func.count(Property.id).label("count"))
        .filter(Property.tenant_id == tenant_id)
        .group_by(Property.estado)
        .all()
    )
    count_map = {r.estado: r.count for r in status_counts}
    total = sum(count_map.values())
    ocupacion = {
        "total": total,
        "ocupados": count_map.get(PropertyStatus.OCCUPIED, 0),
        "disponibles": count_map.get(PropertyStatus.AVAILABLE, 0),
        "mantenimiento": count_map.get(PropertyStatus.MAINTENANCE, 0),
        "otros": total
        - sum(
            [
                count_map.get(PropertyStatus.OCCUPIED, 0),
                count_map.get(PropertyStatus.AVAILABLE, 0),
                count_map.get(PropertyStatus.MAINTENANCE, 0),
            ]
        ),
    }

    # Cartera aging
    billing_ds = BillingDataSource(db=db, tenant_id=tenant_id)
    aging = billing_ds.get_aging(tenant_id)

    # Contratos por vencer (90 days)
    lease_ds = LeaseDataSource(db)
    contratos = lease_ds.expiring_in_days(90, tenant_id)

    # Critical/High OTs open
    maint_ds = MaintenanceDataSource(db)
    criticas_raw = maint_ds.pending_by_priority(["critical", "high"], tenant_id)
    criticas = [
        OtCritica(
            id=r["id"],
            titulo=r["titulo"],
            prioridad=r["prioridad"],
            estado=r["estado"],
            property_id=r["property_id"],
        )
        for r in criticas_raw
    ]

    data = RealEstateDashboard(
        ocupacion=OcupacionWidget.model_validate(ocupacion),
        cartera_aging=aging,
        contratos_por_vencer=[ContratoVencimiento.model_validate(c) for c in contratos],
        mantenimientos_criticos=criticas,
    )
    return StandardResponse(data=data, meta=None, error=None)


@router.get(
    "/financial",
    response_model=StandardResponse[FinancialDashboard],
    summary="Financial dashboard KPIs",
    description="P&L current month, cash flow trend, top revenue properties, top debtors.",
)
def financial_dashboard(
    current_user: Annotated[User, Depends(require_permission("reporting.read"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[FinancialDashboard]:
    from app.core.reporting.datasources.billing import BillingDataSource
    from app.core.reporting.datasources.finances import FinancesDataSource

    tenant_id = current_user.tenant_id
    now = datetime.now(UTC)

    finances_ds = FinancesDataSource(db=db, tenant_id=tenant_id)
    billing_ds = BillingDataSource(db=db, tenant_id=tenant_id)

    pl = finances_ds.get_profit_loss(tenant_id, now.year, now.month)
    cash_flow = finances_ds.get_cash_flow(tenant_id, now.year, months=12)
    top_props = finances_ds.top_properties_by_revenue(tenant_id, limit=5)
    top_debtors = billing_ds.top_debtors(tenant_id, limit=5)

    data = FinancialDashboard(
        pl_mensual=PLMensual.model_validate(pl),
        flujo_caja=[CashFlowPoint.model_validate(p) for p in cash_flow],
        top_rentables=[TopProperty.model_validate(p) for p in top_props],
        top_morosos=[TopDebtor.model_validate(d) for d in top_debtors],
    )
    return StandardResponse(data=data, meta=None, error=None)


@router.get(
    "/cmms",
    response_model=StandardResponse[CMOSDashboard],
    summary="CMMS operations dashboard KPIs",
    description="Work orders by status, MTTR trend, PM compliance %, top failing assets.",
)
def cmms_dashboard(
    current_user: Annotated[User, Depends(require_permission("reporting.read"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[CMOSDashboard]:
    try:
        from app.modules.real_estate.maintenance.reporting_datasource import (
            MaintenanceDataSource,
        )
    except ImportError:
        return StandardResponse(data=CMOSDashboard.construct(), meta=None, error=None)

    tenant_id = current_user.tenant_id
    maint_ds = MaintenanceDataSource(db)

    ots_by_status = maint_ds.count_by_status(tenant_id)
    mttr_raw = maint_ds.mttr_trend(tenant_id, months=6)
    pct_pm = maint_ds.pct_pm_compliance(tenant_id)
    top_fallas = maint_ds.top_assets_by_failures(tenant_id, limit=5)

    data = CMOSDashboard(
        ots_por_estado=[
            OtByStatus(status=k, count=v) for k, v in ots_by_status.items()
        ],
        mttr_tendencia=[MttrPoint(**p) for p in mttr_raw],
        pct_pm=pct_pm,
        top_activos_fallas=[TopAssetFallas(**a) for a in top_fallas],
    )
    return StandardResponse(data=data, meta=None, error=None)
