"""Register all searchable entities in the SearchRegistry at startup."""

import logging

from app.core.search.registry import SearchableEntity, SearchRegistry

logger = logging.getLogger(__name__)


def register_searchable_entities() -> None:
    """Register all searchable entities.

    Called once at application startup (from lazy_router.get_api_router).
    Idempotent — re-registering the same entity_type overwrites the previous entry.
    Each block is wrapped in try/except so missing business modules are skipped.
    """
    registry = SearchRegistry()

    try:
        from app.modules.real_estate.properties.models import Property

        registry.register(
            SearchableEntity(
                entity_type="property",
                model_class=Property,
                search_columns=["unit_number"],
                display_columns=["id", "unit_number", "tipo", "estado"],
                tenant_id_column="tenant_id",
                label_column="unit_number",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'property' (module not available)"
        )

    try:
        from app.modules.real_estate.leases.models import LeaseTenant

        registry.register(
            SearchableEntity(
                entity_type="lease_tenant",
                model_class=LeaseTenant,
                search_columns=["nombre", "num_doc", "email"],
                display_columns=[
                    "id",
                    "nombre",
                    "tipo_doc",
                    "num_doc",
                    "email",
                    "telefono",
                ],
                tenant_id_column="tenant_id",
                label_column="nombre",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'lease_tenant' (module not available)"
        )

    try:
        from app.modules.real_estate.leases.models import Owner

        registry.register(
            SearchableEntity(
                entity_type="owner",
                model_class=Owner,
                search_columns=["nombre", "num_doc", "email"],
                display_columns=["id", "nombre", "tipo_doc", "num_doc", "email"],
                tenant_id_column="tenant_id",
                label_column="nombre",
            )
        )
    except ImportError:
        logger.debug("Skipping search registration for 'owner' (module not available)")

    try:
        from app.modules.real_estate.leases.models import LeaseAgreement

        registry.register(
            SearchableEntity(
                entity_type="lease_agreement",
                model_class=LeaseAgreement,
                search_columns=["notes"],
                display_columns=["id", "tipo", "estado", "fecha_inicio", "fecha_fin"],
                tenant_id_column="tenant_id",
                label_column="tipo",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'lease_agreement' (module not available)"
        )

    try:
        from app.modules.real_estate.maintenance.models import WorkOrder

        registry.register(
            SearchableEntity(
                entity_type="work_order",
                model_class=WorkOrder,
                search_columns=["titulo", "descripcion"],
                display_columns=["id", "titulo", "tipo", "prioridad", "estado"],
                tenant_id_column="tenant_id",
                label_column="titulo",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'work_order' (module not available)"
        )

    try:
        from app.modules.real_estate.maintenance.models import Asset

        registry.register(
            SearchableEntity(
                entity_type="asset",
                model_class=Asset,
                search_columns=["nombre", "marca", "serial"],
                display_columns=[
                    "id",
                    "nombre",
                    "marca",
                    "serial",
                    "categoria",
                    "estado",
                ],
                tenant_id_column="tenant_id",
                label_column="nombre",
            )
        )
    except ImportError:
        logger.debug("Skipping search registration for 'asset' (module not available)")

    try:
        from app.modules.data_collection.models.form import DCForm

        registry.register(
            SearchableEntity(
                entity_type="dc_form",
                model_class=DCForm,
                search_columns=["title", "slug"],
                display_columns=["id", "title", "slug", "status", "form_type"],
                tenant_id_column="tenant_id",
                label_column="title",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'dc_form' (module not available)"
        )

    try:
        from app.modules.data_collection.models.submission import DCFormSubmission

        registry.register(
            SearchableEntity(
                entity_type="dc_submission",
                model_class=DCFormSubmission,
                search_columns=["local_id"],
                display_columns=["id", "local_id", "form_id", "status", "sync_source"],
                tenant_id_column="tenant_id",
                label_column="local_id",
            )
        )
    except ImportError:
        logger.debug(
            "Skipping search registration for 'dc_submission' (module not available)"
        )
