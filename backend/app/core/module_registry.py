"""Module registry for auto-discovery and management of modules."""

import importlib
import json
import logging
import sys
from importlib.metadata import entry_points
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version
from sqlalchemy.orm import Session

from app.core.config.service import ConfigService
from app.core.module_interface import ModuleInterface
from app.core.version import CORE_VERSION

logger = logging.getLogger(__name__)

_PLUGIN_ENTRY_POINT_GROUP = "aiutox.modules"


class ModuleRegistry:
    """Central registry for discovering and loading modules."""

    def __init__(self, db: Session | None = None):
        """Initialize module registry.

        Args:
            db: Optional database session for reading module configuration
        """
        self._modules: dict[str, ModuleInterface] = {}
        self._load_order: list[str] = []
        self._db = db
        self._config_service = ConfigService(db) if db else None
        self._default_config = self._load_modules_json()

    def _load_modules_json(self) -> dict[str, bool]:
        """Load default configuration from backend/config/modules.json.

        Returns:
            Dictionary mapping module_id to enabled status
        """
        try:
            # Try to find modules.json in backend/config/
            backend_dir = Path(__file__).parent.parent.parent
            modules_json_path = backend_dir / "config" / "modules.json"

            if not modules_json_path.exists():
                # Fallback: try old location for backward compatibility
                modules_json_path = backend_dir.parent / "rules" / "modules.json"
                if not modules_json_path.exists():
                    modules_json_path = backend_dir / ".." / "rules" / "modules.json"
                    modules_json_path = modules_json_path.resolve()

            if not modules_json_path.exists():
                logger.warning(f"modules.json not found at {modules_json_path}")
                return {}

            with open(modules_json_path, encoding="utf-8") as f:
                modules = json.load(f)

            return {module["key"]: module.get("enabled", False) for module in modules}
        except Exception as e:
            logger.warning(f"Failed to load modules.json: {e}")
            return {}

    def is_module_enabled(self, module_id: str, tenant_id: UUID | None = None) -> bool:
        """Check if a module is enabled.

        Priority:
        1. Configuration in database (if tenant_id and db are available)
        2. Default configuration from modules.json
        3. True (always enabled by default for critical core modules)

        Args:
            module_id: Module identifier
            tenant_id: Optional tenant ID for tenant-specific configuration

        Returns:
            True if module is enabled, False otherwise
        """
        # If we have DB and tenant, read from configuration
        if self._db and tenant_id and self._config_service:
            try:
                enabled = self._config_service.get(
                    tenant_id=tenant_id,
                    module="system",
                    key=f"modules.{module_id}.enabled",
                    default=None,
                )
                if enabled is not None:
                    return bool(enabled)
            except Exception as e:
                logger.debug(f"Could not read module config from DB: {e}")

        # Use default configuration
        if module_id in self._default_config:
            return self._default_config[module_id]

        # Default: enabled for core modules, disabled for others
        if module_id in self._modules:
            module = self._modules[module_id]
            # Critical core modules are always enabled by default
            if module.module_type == "core" and module_id in ["auth", "users"]:
                return True
            # For other modules, default to enabled if not specified
            return True

        return False

    def get_enabled_modules(self, tenant_id: UUID | None = None) -> list[str]:
        """Get list of enabled module IDs.

        Args:
            tenant_id: Optional tenant ID for tenant-specific configuration

        Returns:
            List of enabled module IDs
        """
        enabled = []
        for module_id in self._modules.keys():
            if self.is_module_enabled(module_id, tenant_id):
                enabled.append(module_id)
        return enabled

    def discover_modules(self, base_path: Path) -> None:
        """Discover modules in core/ and modules/ directories.

        Args:
            base_path: Base path to app directory (e.g., Path(__file__).parent.parent)
        """
        # Discover core modules
        core_path = base_path / "core"
        if core_path.exists():
            self._discover_in_directory(core_path, "core")

        # Discover business modules
        modules_path = base_path / "modules"
        if modules_path.exists():
            self._discover_in_directory(modules_path, "business")

    def discover_plugins(self) -> None:
        """Discover externally installed modules via Python entry points.

        Reads all distributions that declare an entry point in the
        ``aiutox.modules`` group. Each entry point value must be a
        fully-qualified class path or a module path whose top-level
        object is a ``ModuleInterface`` subclass.

        Example ``pyproject.toml`` declaration::

            [project.entry-points."aiutox.modules"]
            products = "aiutox_module_products:ProductsModule"
        """
        eps = entry_points(group=_PLUGIN_ENTRY_POINT_GROUP)
        for ep in eps:
            try:
                cls = ep.load()
                if not (
                    isinstance(cls, type)
                    and issubclass(cls, ModuleInterface)
                    and cls is not ModuleInterface
                ):
                    logger.warning(
                        "Entry point %s does not point to a ModuleInterface subclass, skipping",
                        ep.name,
                    )
                    continue
                required_core_version = cls.get_required_core_version()
                if required_core_version and not self._is_core_version_compatible(
                    required_core_version
                ):
                    logger.error(
                        "Plugin module %s requires core version '%s', but running "
                        "core is '%s' — refusing to load to avoid an incompatible "
                        "module/core pairing.",
                        ep.name,
                        required_core_version,
                        CORE_VERSION,
                    )
                    continue
                instance: ModuleInterface = cls()
                if instance.module_id in self._modules:
                    logger.warning(
                        "Plugin module %s already registered (entry point duplicate), skipping",
                        instance.module_id,
                    )
                    continue
                instance.on_load()
                self._modules[instance.module_id] = instance
                logger.info(
                    "Discovered plugin module: %s (via entry point)", instance.module_id
                )
            except Exception as exc:
                logger.error(
                    "Failed to load plugin entry point %s: %s",
                    ep.name,
                    exc,
                    exc_info=True,
                )

    @staticmethod
    def _is_core_version_compatible(specifier: str) -> bool:
        """Check CORE_VERSION against a plugin's required core version specifier.

        A malformed specifier or version string is treated as incompatible
        (fail closed) — a plugin declaring a broken constraint should not
        load silently.
        """
        try:
            return Version(CORE_VERSION) in SpecifierSet(specifier)
        except (InvalidSpecifier, InvalidVersion) as exc:
            logger.error("Malformed core version specifier '%s': %s", specifier, exc)
            return False

    def _discover_in_directory(self, path: Path, module_type: str) -> None:
        """Discover modules in a directory.

        Args:
            path: Directory path to search
            module_type: Expected module type ('core' or 'business')
        """
        for module_dir in path.iterdir():
            if not module_dir.is_dir() or module_dir.name.startswith("_"):
                continue

            module_init = module_dir / "__init__.py"
            if not module_init.exists():
                continue

            try:
                module = self._load_module(module_dir, module_type)
                if module:
                    if module.module_id in self._modules:
                        logger.warning(
                            f"Module {module.module_id} already registered, skipping duplicate"
                        )
                        continue
                    self._modules[module.module_id] = module
                    logger.info(
                        f"Discovered module: {module.module_id} ({module_type})"
                    )
            except Exception as e:
                logger.warning(f"Failed to load module {module_dir.name}: {e}")

    def _load_module(
        self, module_dir: Path, module_type: str
    ) -> ModuleInterface | None:
        """Load a module from a directory.

        Args:
            module_dir: Directory containing the module
            module_type: Expected module type

        Returns:
            ModuleInterface instance or None if not found
        """
        # Determine module path for import
        # e.g., app.core.auth or app.modules.products
        parent_name = module_dir.parent.name
        module_name = f"app.{parent_name}.{module_dir.name}"

        # Add parent directory to path if needed
        parent_dir = module_dir.parent.parent
        if str(parent_dir) not in sys.path:
            sys.path.insert(0, str(parent_dir))

        try:
            # Import module
            module_obj = importlib.import_module(module_name)

            # Find class that implements ModuleInterface
            for attr_name in dir(module_obj):
                attr = getattr(module_obj, attr_name)
                if (
                    isinstance(attr, type)
                    and issubclass(attr, ModuleInterface)
                    and attr is not ModuleInterface
                ):
                    instance = attr()
                    # Verify module type matches
                    if instance.module_type != module_type:
                        logger.warning(
                            f"Module {instance.module_id} type mismatch: "
                            f"expected {module_type}, got {instance.module_type}"
                        )
                    instance.on_load()
                    return instance

            logger.debug(f"No ModuleInterface implementation found in {module_name}")
            return None
        except ImportError as e:
            logger.warning(f"Failed to import module {module_name}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error loading module {module_name}: {e}", exc_info=True)
            return None

    def resolve_dependencies(self) -> list[str]:
        """Resolve load order based on dependencies using topological sort.

        Returns:
            List of module IDs in dependency order
        """
        # Build dependency graph
        graph: dict[str, list[str]] = {}
        for module_id, module in self._modules.items():
            graph[module_id] = module.get_dependencies()

        # Topological sort
        in_degree: dict[str, int] = {module_id: 0 for module_id in self._modules.keys()}
        for module_id, deps in graph.items():
            for dep in deps:
                if dep in in_degree:
                    in_degree[module_id] += 1

        # Kahn's algorithm
        queue: list[str] = [
            module_id for module_id, degree in in_degree.items() if degree == 0
        ]
        result: list[str] = []

        while queue:
            # Sort queue for deterministic order
            queue.sort()
            module_id = queue.pop(0)
            result.append(module_id)

            # Decrease in-degree for dependent modules
            for other_id, deps in graph.items():
                if module_id in deps:
                    in_degree[other_id] -= 1
                    if in_degree[other_id] == 0:
                        queue.append(other_id)

        # Check for circular dependencies
        if len(result) != len(self._modules):
            missing = set(self._modules.keys()) - set(result)
            logger.error(f"Circular dependency detected or missing modules: {missing}")
            # Add missing modules at the end
            result.extend(sorted(missing))

        self._load_order = result
        return result

    def get_routers(self, tenant_id: UUID | None = None) -> dict[str, APIRouter]:
        """Get routers for enabled modules.

        Args:
            tenant_id: Optional tenant ID for tenant-specific module configuration

        Returns:
            Dictionary mapping module_id to APIRouter
        """
        routers = {}
        enabled_modules = self.get_enabled_modules(tenant_id)

        for module_id in self.resolve_dependencies():
            if module_id in enabled_modules:
                module = self._modules[module_id]
                router = module.get_router()
                if router:
                    routers[module_id] = router

        return routers

    def get_all_models(self, tenant_id: UUID | None = None) -> list:
        """Get all models from enabled modules.

        Args:
            tenant_id: Optional tenant ID for tenant-specific module configuration

        Returns:
            List of SQLAlchemy model classes
        """
        models = []
        enabled_modules = self.get_enabled_modules(tenant_id)

        for module_id in self.resolve_dependencies():
            if module_id in enabled_modules:
                module = self._modules[module_id]
                models.extend(module.get_models())

        return models

    def get_module(self, module_id: str) -> ModuleInterface | None:
        """Get a module by ID.

        Args:
            module_id: Module identifier

        Returns:
            ModuleInterface instance or None if not found
        """
        return self._modules.get(module_id)

    def get_import_export_handler(self, module_id: str, tenant_id: UUID):
        """Return module_id's ImportExportHandler if it's enabled and implements one.

        Args:
            module_id: Module identifier
            tenant_id: Tenant to check enablement for

        Returns:
            ImportExportHandler instance, or None if the module isn't enabled
            for this tenant or doesn't implement the hook.
        """
        if module_id not in self.get_enabled_modules(tenant_id):
            return None

        module = self.get_module(module_id)
        if module is None:
            return None

        return module.get_import_export_handler()

    def get_import_export_supported_modules(self, tenant_id: UUID) -> list[str]:
        """Return enabled module IDs that implement ImportExportHandler.

        Self-discovering: a module opts in solely by overriding
        get_import_export_handler() on its ModuleInterface — nothing here or
        in import_export needs to be updated when a module adds support.
        A disabled module is skipped before instantiation, so a tenant that
        has disabled a module pays no runtime cost for its handler.

        Args:
            tenant_id: Tenant to check enablement for

        Returns:
            Sorted list of module IDs that are both enabled for this tenant
            and implement a real ImportExportHandler.
        """
        supported = []
        for module_id in self.get_enabled_modules(tenant_id):
            module = self.get_module(module_id)
            if module is not None and module.get_import_export_handler() is not None:
                supported.append(module_id)

        return sorted(supported)

    def get_notification_events(self, tenant_id: UUID) -> list:
        """Return notification event types from all enabled modules.

        Self-discovering: a module opts in solely by overriding
        get_notification_events() on its ModuleInterface — nothing here or
        in notifications needs to be updated when a module adds a new event.
        Gated on the notifications module itself being enabled: if a tenant
        has disabled notifications entirely, no event types are exposed
        regardless of what individual modules declare (there would be
        nothing to configure delivery for).

        Args:
            tenant_id: Tenant to check enablement for

        Returns:
            Flat list of NotificationEventDescriptor across all enabled
            modules that declare at least one notification event.
        """
        if not self.is_module_enabled("notifications", tenant_id):
            return []

        events = []
        for module_id in self.get_enabled_modules(tenant_id):
            module = self.get_module(module_id)
            if module is not None:
                events.extend(module.get_notification_events())

        return events

    def get_search_handler(self, module_id: str, tenant_id: UUID):
        """Return module_id's SearchProvider if it's enabled and implements one.

        Args:
            module_id: Module identifier
            tenant_id: Tenant to check enablement for

        Returns:
            SearchProvider instance, or None if the module isn't enabled
            for this tenant or doesn't implement the hook.
        """
        if module_id not in self.get_enabled_modules(tenant_id):
            return None

        module = self.get_module(module_id)
        if module is None:
            return None

        return module.get_search_handler()

    def get_search_supported_modules(self, tenant_id: UUID) -> list[str]:
        """Return enabled module IDs that implement SearchProvider.

        Self-discovering: a module opts in solely by overriding
        get_search_handler() on its ModuleInterface — nothing here or in
        core/search needs to be updated when a module adds support. A
        disabled module is skipped before instantiation, so a tenant that
        has disabled a module pays no runtime cost for its provider.

        Args:
            tenant_id: Tenant to check enablement for

        Returns:
            Sorted list of module IDs that are both enabled for this tenant
            and implement a real SearchProvider.
        """
        supported = []
        for module_id in self.get_enabled_modules(tenant_id):
            module = self.get_module(module_id)
            if module is not None and module.get_search_handler() is not None:
                supported.append(module_id)

        return sorted(supported)

    def get_all_modules(self) -> dict[str, ModuleInterface]:
        """Get all registered modules.

        Returns:
            Dictionary mapping module_id to ModuleInterface
        """
        return self._modules.copy()

    def list_modules_with_migrations(self) -> list[str]:
        """Return sorted list of module names that have a migrations/versions directory.

        Scans app/modules/ and app/core/ on disk — independent of which modules
        are currently registered or enabled. Used by the migration CI gate and
        tooling. Core services (e.g. core/tasks) are included when they own a
        migration branch.

        Returns:
            Sorted list of module/service directory names that have migrations.
        """
        backend_dir = Path(__file__).parent.parent.parent
        result = []

        for base in (
            backend_dir / "app" / "modules",
            backend_dir / "app" / "core",
        ):
            if not base.is_dir():
                continue
            for module_dir in base.iterdir():
                if not module_dir.is_dir():
                    continue
                versions_dir = module_dir / "migrations" / "versions"
                if versions_dir.is_dir():
                    result.append(module_dir.name)

        return sorted(set(result))


# Global registry instance (will be initialized in main.py)
_registry: ModuleRegistry | None = None


def get_module_registry() -> ModuleRegistry:
    """Get the global module registry instance.

    Returns:
        ModuleRegistry instance

    Raises:
        RuntimeError: If registry has not been initialized
    """
    global _registry
    if _registry is None:
        raise RuntimeError(
            "ModuleRegistry not initialized. Call registry.discover_modules() first."
        )
    return _registry


def set_module_registry(registry: ModuleRegistry) -> None:
    """Set the global module registry instance.

    Args:
        registry: ModuleRegistry instance
    """
    global _registry
    _registry = registry
