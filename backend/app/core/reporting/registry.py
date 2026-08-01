"""DataSourceRegistry for the reporting module.

Provides a singleton registry that maps data source names to their classes.
"""

from typing import Any


class DataSourceRegistry:
    """Registry for available reporting data sources."""

    def __init__(self) -> None:
        self._sources: dict[str, Any] = {}

    def register(self, name: str, data_source_class: Any) -> None:
        """Register a data source class under the given name.

        Args:
            name: Unique data source identifier (e.g., "billing", "finances")
            data_source_class: Class implementing BaseDataSource
        """
        self._sources[name] = data_source_class

    def get(self, name: str) -> Any | None:
        """Return the data source class for the given name, or None."""
        return self._sources.get(name)

    def list_all(self) -> list[str]:
        """Return list of registered data source names."""
        return list(self._sources.keys())

    def is_registered(self, name: str) -> bool:
        """Return True if the data source name is registered."""
        return name in self._sources


_registry: DataSourceRegistry | None = None


def get_registry() -> DataSourceRegistry:
    """Return the singleton DataSourceRegistry instance."""
    global _registry
    if _registry is None:
        _registry = DataSourceRegistry()
        _auto_register_builtin_sources(_registry)
    return _registry


def _auto_register_builtin_sources(registry: DataSourceRegistry) -> None:
    """Register built-in data sources on startup."""
    try:
        from app.core.reporting.datasources.billing import BillingDataSource

        registry.register("billing", BillingDataSource)
    except ImportError:
        pass

    try:
        from app.core.reporting.datasources.finances import FinancesDataSource

        registry.register("finances", FinancesDataSource)
    except ImportError:
        pass

    try:
        from app.core.reporting.sources.products_data_source import ProductsDataSource

        registry.register("products", ProductsDataSource)
    except ImportError:
        pass

    try:
        from app.modules.real_estate.maintenance.reporting_datasource import (
            MaintenanceDataSource,
        )

        registry.register("maintenance", MaintenanceDataSource)
    except ImportError:
        pass

    try:
        from app.modules.real_estate.leases.reporting_datasource import LeaseDataSource

        registry.register("leases", LeaseDataSource)
    except ImportError:
        pass

    try:
        from app.modules.inventory.reporting import InventoryDataSource

        registry.register("inventory", InventoryDataSource)
    except ImportError:
        pass
