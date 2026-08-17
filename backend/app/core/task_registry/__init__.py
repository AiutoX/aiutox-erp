"""Task Registry — Hybrid pattern infrastructure for custom task types.

Modules (leases, properties, cmms) implement TaskTypeProvider and register
their custom task types with this registry. Core code never imports from
modules — complete decoupling via the registry.
"""

from app.core.task_registry.dependencies import get_task_registry
from app.core.task_registry.interfaces import TaskTypeConfig, TaskTypeProvider
from app.core.task_registry.registry import TaskTypeRegistry, get_task_type_registry

__all__ = [
    "TaskTypeRegistry",
    "TaskTypeConfig",
    "TaskTypeProvider",
    "get_task_type_registry",
    "get_task_registry",
]
