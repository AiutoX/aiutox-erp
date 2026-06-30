"""
API Router con lazy loading y carga condicional de módulos de negocio.

Los módulos de negocio en app.modules.* sólo se registran si están
habilitados en backend/config/modules.json.  Módulos core (app.api.v1.*)
siempre se cargan.
"""

import importlib
import json
from pathlib import Path

from fastapi import APIRouter

# Cache para el router
_api_router = None


def _load_modules_enabled() -> dict[str, bool]:
    """Lee modules.json y retorna {module_id: enabled}.

    Módulos no listados se consideran habilitados por defecto.
    """
    config_path = (
        Path(__file__).resolve().parent.parent.parent.parent / "config" / "modules.json"
    )
    if not config_path.exists():
        return {}
    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)
    return {m["key"]: m.get("enabled", True) for m in data}


# Business modules physically in app.modules.* that support conditional loading.
# Each entry: (module_id, dotted_import_path, url_prefix, openapi_tags)
_BUSINESS_MODULE_ROUTERS: list[tuple[str, str, str, list[str]]] = [
    ("products", "aiutox_module_products.api", "/products", ["products"]),
    ("inventory", "app.modules.inventory.api", "/inventory", ["inventory"]),
    ("crm", "app.modules.crm.api", "/crm", ["crm"]),
    (
        "real_estate",
        "app.modules.real_estate.api",
        "/real-estate",
        ["properties", "leases", "maintenance"],
    ),
    ("tasks", "app.core.tasks.api", "/tasks", ["tasks"]),
    (
        "data_collection",
        "app.modules.data_collection.api",
        "/data-collection",
        ["data_collection"],
    ),
]


def get_api_router() -> APIRouter:
    """Obtiene el API router con lazy loading."""
    global _api_router

    if _api_router is not None:
        return _api_router

    print("[INFO] Creando API router (lazy loading)...")

    # ── Core infrastructure routers (always loaded) ──────────────────────────
    from app.api.v1 import (
        activities,
        activity_icons,
        admin_modules,
        approvals,
        auth,
        automation,
        billing,
        calendar,
        comments,
        config,
        contact_methods,
        contacts,
        files,
        finances,
        flow_runs,
        folders,
        import_export,
        integrations,
        licenses,
        notifications,
        organizations,
        preferences,
        pubsub,
        reporting,
        search,
        sse,
        tags,
        templates,
        tenants,
        tiers,
        users,
        views,
        workflows,
    )
    from app.features.tasks.statuses import router as task_statuses_router

    try:
        from app.modules.gamification.api import router as gamification_router

        _gamification_available = True
    except ImportError:
        gamification_router = None  # type: ignore[assignment]
        _gamification_available = False

    _api_router = APIRouter()

    _api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
    _api_router.include_router(users.router, prefix="/users", tags=["users"])
    _api_router.include_router(config.router, prefix="/config", tags=["config"])
    _api_router.include_router(pubsub.router, prefix="/pubsub", tags=["pubsub"])
    _api_router.include_router(
        automation.router, prefix="/automation", tags=["automation"]
    )
    _api_router.include_router(
        preferences.router, prefix="/preferences", tags=["preferences"]
    )
    _api_router.include_router(
        reporting.router, prefix="/reporting", tags=["reporting"]
    )
    _api_router.include_router(
        notifications.router, prefix="/notifications", tags=["notifications"]
    )
    _api_router.include_router(files.router, prefix="/files", tags=["files"])
    _api_router.include_router(
        flow_runs.router, prefix="/flow-runs", tags=["flow-runs"]
    )
    _api_router.include_router(folders.router, prefix="/folders", tags=["folders"])
    _api_router.include_router(
        activities.router, prefix="/activities", tags=["activities"]
    )
    _api_router.include_router(activity_icons.router, tags=["activity-icons"])
    _api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
    _api_router.include_router(
        task_statuses_router, prefix="/task-statuses", tags=["task-statuses"]
    )
    _api_router.include_router(
        workflows.router, prefix="/workflows", tags=["workflows"]
    )
    _api_router.include_router(search.router, prefix="/search", tags=["search"])
    _api_router.include_router(
        integrations.router, prefix="/integrations", tags=["integrations"]
    )
    _api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
    if _gamification_available:
        _api_router.include_router(
            gamification_router, prefix="/gamification", tags=["gamification"]
        )
    _api_router.include_router(
        import_export.router, prefix="/import-export", tags=["import-export"]
    )
    _api_router.include_router(views.router, prefix="/views", tags=["views"])
    _api_router.include_router(
        approvals.router, prefix="/approvals", tags=["approvals"]
    )
    _api_router.include_router(
        templates.router, prefix="/templates", tags=["templates"]
    )
    _api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
    if billing.router is not None:
        _api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
    if finances.router is not None:
        _api_router.include_router(
            finances.router, prefix="/finances", tags=["finances"]
        )

    from app.core.dashboard.router import router as dashboard_router

    _api_router.include_router(
        dashboard_router, prefix="/dashboard", tags=["dashboard"]
    )
    _api_router.include_router(contacts.router)
    _api_router.include_router(organizations.router, tags=["organizations"])
    _api_router.include_router(
        contact_methods.router, prefix="/contact-methods", tags=["contact-methods"]
    )
    _api_router.include_router(sse.router, tags=["sse"])
    _api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
    _api_router.include_router(tiers.router, prefix="/tenants", tags=["tiers"])
    _api_router.include_router(licenses.router, tags=["licenses"])
    _api_router.include_router(admin_modules.router, tags=["admin-modules"])

    from app.core.automation.ai.router import router as ai_router

    _api_router.include_router(ai_router, prefix="/ai", tags=["ai"])

    from app.core.automation.ai.agent_router import router as agent_router

    _api_router.include_router(agent_router, prefix="/ai", tags=["ai-agents"])

    from app.core.reports.router import router as reports_router

    _api_router.include_router(reports_router, prefix="/reports", tags=["reports"])

    from app.core.marketplace.api import router as marketplace_router

    _api_router.include_router(
        marketplace_router, prefix="/marketplace", tags=["marketplace"]
    )

    from app.core.work_items.api import router as work_items_router

    _api_router.include_router(
        work_items_router, prefix="/work_items", tags=["work-items"]
    )

    from app.core.insights.api import router as insights_router

    _api_router.include_router(insights_router, prefix="/insights", tags=["insights"])

    from app.core.widgets.api import router as widgets_router
    from app.core.widgets.api import user_widgets_router

    _api_router.include_router(widgets_router, prefix="/widgets", tags=["widgets"])
    _api_router.include_router(
        user_widgets_router, prefix="/users/me/widgets", tags=["widgets"]
    )

    # ── Business module routers (gated by modules.json) ──────────────────────
    modules_enabled = _load_modules_enabled()
    loaded: list[str] = []
    skipped: list[str] = []

    for module_id, import_path, prefix, tags_list in _BUSINESS_MODULE_ROUTERS:
        if not modules_enabled.get(module_id, True):
            skipped.append(module_id)
            continue
        try:
            mod = importlib.import_module(import_path)
            _api_router.include_router(mod.router, prefix=prefix, tags=tags_list)  # type: ignore[arg-type]
            loaded.append(module_id)
        except Exception as exc:
            print(f"[WARN] Failed to load business module '{module_id}': {exc}")
            skipped.append(module_id)

    if loaded:
        print(f"[OK] Business modules loaded: {', '.join(loaded)}")
    if skipped:
        print(f"[SKIP] Business modules skipped (disabled): {', '.join(skipped)}")

    # Register searchable entities in SearchRegistry
    from app.core.search.registrations import register_searchable_entities

    register_searchable_entities()

    print("[OK] API router creado exitosamente")
    return _api_router


# Para compatibilidad con el código existente
api_router = get_api_router()
