"""Task type interfaces for the hybrid pattern (Core + Extension).

Defines the contract that modules implement to register custom task types.
The registry is in app/core/task_registry/ and is completely decoupled from
module implementations.
"""

from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable


@dataclass(slots=True)
class TaskTypeConfig:
    """Configuration for a custom task type.

    Task types are registered by modules (e.g., leases, properties, cmms)
    and make task creation/validation polymorphic.
    """

    type_id: str
    """Unique identifier (e.g., 'lease_renewal', 'property_inspection')."""

    label: str
    """Human-readable label (e.g., 'Lease Renewal')."""

    description: str | None = None
    """Detailed description of the task type."""

    module: str | None = None
    """Which module provides this task type (e.g., 'leases', 'properties')."""

    required_fields: list[str] | None = None
    """List of required fields for this task type (validated on create)."""

    validation_schema: dict[str, Any] | None = None
    """Optional JSON schema for validation (future: complex validation)."""

    default_priority: str = "medium"
    """Default priority when not specified (low/medium/high/urgent)."""

    allow_subtasks: bool = True
    """Whether this task type allows subtasks."""

    metadata: dict[str, Any] | None = None
    """Additional metadata (custom fields, automation rules, etc.)."""


@runtime_checkable
class TaskTypeProvider(Protocol):
    """Protocol that modules implement to provide custom task types.

    Modules (e.g., leases, properties, cmms) implement this to register
    their task types with the core registry. The registry calls get_task_types()
    to discover all available types.
    """

    def get_task_types(self) -> list[TaskTypeConfig]:
        """Return list of task types provided by this module.

        Returns:
            List of TaskTypeConfig instances for all types this module provides.

        Examples:
            LeaseTaskTypeProvider.get_task_types() returns:
            [
                TaskTypeConfig(type_id='lease_renewal', label='Lease Renewal', module='leases'),
                TaskTypeConfig(type_id='ipc_adjustment', label='IPC Adjustment', module='leases'),
                TaskTypeConfig(type_id='lease_inspection', label='Lease Inspection', module='leases'),
            ]
        """
        ...

    def validate_task_data(
        self, task_type: str, data: dict[str, Any]
    ) -> tuple[bool, str | None]:
        """Validate data for a task of this type.

        Args:
            task_type: The task type ID (e.g., 'lease_renewal')
            data: Task data to validate

        Returns:
            Tuple of (is_valid, error_message). If valid, error_message is None.

        Examples:
            LeaseTaskTypeProvider.validate_task_data('lease_renewal', {...})
            → (True, None)

            LeaseTaskTypeProvider.validate_task_data('lease_renewal', {})  # missing required
            → (False, 'Missing required field: lease_id')
        """
        ...
