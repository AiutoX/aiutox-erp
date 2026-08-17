"""Event definitions for module lifecycle."""


class ModuleLifecycleEvents:
    """Constants for module lifecycle events."""

    # Installation complete
    INSTALLED = "core.module.installed"

    # Module disabled
    DISABLED = "core.module.disabled"

    # Module enabled
    ENABLED = "core.module.enabled"

    # Uninstall requested (grace period started)
    UNINSTALL_REQUESTED = "core.module.uninstall_requested"

    # Uninstall request cancelled
    REACTIVATED = "core.module.reactivated"

    # Data exported (stub — Plan B Fase 8)
    EXPORTED = "core.module.exported"

    # Module uninstalled (stub — Plan B Fase 8)
    UNINSTALLED = "core.module.uninstalled"
