"""FastAPI dependency injection for task type registry."""

from app.core.task_registry.registry import TaskTypeRegistry, get_task_type_registry


async def get_task_registry() -> TaskTypeRegistry:
    """FastAPI dependency that injects the global task type registry.

    Usage in endpoints:

        @router.get("/tasks/types")
        async def list_task_types(
            registry: TaskTypeRegistry = Depends(get_task_registry),
        ):
            types = registry.list_types()
            return StandardResponse(data=[...])
    """
    return get_task_type_registry()
