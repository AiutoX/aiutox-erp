"""TaskTypeRegistry — Simple dict-based registry for custom task types.

No metaclass, no magic. Just a registry that modules populate via install() calls.
Fallback to "generic" type if no specific type found.
"""

from typing import Any

from app.core.logging import get_logger
from app.core.task_registry.interfaces import TaskTypeConfig, TaskTypeProvider

logger = get_logger(__name__)


class TaskTypeRegistry:
    """Simple registry for task types provided by modules.

    Modules register their task types via add_provider() or register_type().
    Core code queries types and validates data via this registry.

    No metaclass, no decorators. Just a dict.
    """

    def __init__(self):
        """Initialize empty registry."""
        self._types: dict[str, TaskTypeConfig] = {}
        self._providers: list[TaskTypeProvider] = []

    def add_provider(self, provider: TaskTypeProvider) -> None:
        """Register a task type provider from a module.

        Args:
            provider: Object implementing TaskTypeProvider protocol

        Raises:
            TypeError: If provider doesn't implement TaskTypeProvider
        """
        if not isinstance(provider, TaskTypeProvider):
            raise TypeError(f"{provider} does not implement TaskTypeProvider protocol")

        self._providers.append(provider)

        # Discover and register types from this provider
        for task_type in provider.get_task_types():
            self.register_type(task_type)

        logger.info(f"Registered provider: {provider.__class__.__name__}")

    def register_type(self, task_type: TaskTypeConfig) -> None:
        """Register a single task type.

        Idempotent: calling twice with same type_id overwrites (safe).

        Args:
            task_type: TaskTypeConfig to register
        """
        if not isinstance(task_type, TaskTypeConfig):
            raise TypeError(f"Expected TaskTypeConfig, got {type(task_type)}")

        self._types[task_type.type_id] = task_type
        logger.debug(f"Registered task type: {task_type.type_id}")

    def get_type(self, type_id: str) -> TaskTypeConfig | None:
        """Get a task type by ID.

        Returns:
            TaskTypeConfig if found, None otherwise
        """
        return self._types.get(type_id)

    def list_types(self) -> list[TaskTypeConfig]:
        """List all registered task types."""
        return list(self._types.values())

    def validate(self, type_id: str) -> bool:
        """Check if a task type is registered.

        Falls back to 'generic' type if registry is empty (bootstrap scenario).

        Args:
            type_id: The type to validate

        Returns:
            True if type exists or if type_id is 'generic'
        """
        if type_id == "generic":
            return True

        if not self._types:
            # Empty registry: only "generic" is valid (fallback)
            return False

        return type_id in self._types

    def validate_data(
        self, type_id: str, data: dict[str, Any]
    ) -> tuple[bool, str | None]:
        """Validate task data for a specific type.

        Asks the provider to validate, or returns success if no provider.

        Args:
            type_id: The task type
            data: Task data to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Generic type accepts anything
        if type_id == "generic":
            return (True, None)

        task_type = self.get_type(type_id)
        if not task_type:
            return (False, f"Unknown task type: {type_id}")

        # Find provider for this type
        for provider in self._providers:
            config_types = {t.type_id: t for t in provider.get_task_types()}
            if type_id in config_types:
                return provider.validate_task_data(type_id, data)

        # No provider, but type is registered (shouldn't happen in normal flow)
        return (True, None)

    def clear(self) -> None:
        """Clear all registered types (for testing)."""
        self._types.clear()
        self._providers.clear()


# Global registry instance
_task_type_registry: TaskTypeRegistry | None = None


def get_task_type_registry() -> TaskTypeRegistry:
    """Get the global task type registry instance.

    Creates on first call, singleton pattern.
    """
    global _task_type_registry
    if _task_type_registry is None:
        _task_type_registry = TaskTypeRegistry()
    return _task_type_registry
