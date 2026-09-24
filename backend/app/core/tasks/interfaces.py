"""TaskType provider interface (Protocol) for the hybrid Task Registry pattern.

Sprint 1 P3 — TaskTypeRegistry hybrid pattern.

Architecture:
    - Core defines the Protocol: TaskTypeProvider
    - Business modules implement it: LeaseTaskTypeProvider, MaintenanceTaskTypeProvider, etc.
    - The registry (core/task_registry/) maps type names to providers
    - Tasks router exposes GET /tasks/types to list registered types

Usage::

    class LeaseTaskTypeProvider:
        task_type_name = "lease_renewal"
        label = "Lease Renewal"
        description = "Tracks lease renewal workflows"

        def get_fields(self) -> list[dict]:
            return [{"name": "lease_id", "type": "uuid", "required": True}]

        def validate(self, data: dict) -> bool:
            return "lease_id" in data
"""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class TaskTypeProvider(Protocol):
    """Protocol for task type providers.

    Any class implementing this protocol can be registered with the TaskTypeRegistry
    and will be surfaced via GET /tasks/types.
    """

    task_type_name: str
    """Unique identifier for this task type (e.g., 'lease_renewal')."""

    label: str
    """Human-readable name (e.g., 'Lease Renewal')."""

    description: str
    """Short description of what this task type represents."""

    def get_fields(self) -> list[dict[str, Any]]:
        """Return the field schema for this task type.

        Each field dict contains at minimum:
            - name: str
            - type: str (uuid, string, int, date, etc.)
            - required: bool

        Returns:
            List of field definition dicts
        """
        ...

    def validate(self, data: dict[str, Any]) -> bool:
        """Validate task data against this type's schema.

        Args:
            data: Task type-specific data dict

        Returns:
            True if data is valid, False otherwise
        """
        ...
