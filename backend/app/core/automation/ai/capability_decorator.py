"""Decorator and descriptor for AI-discoverable module capabilities."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class CapabilityDescriptor:
    qualified_name: str  # "module_name.capability_name"
    module_name: str
    capability_name: str
    description: str
    permission_required: str
    capability_type: str  # "conversational" | "operational" | "automation" | "digest"
    parameters_schema: dict
    aliases: list[str]
    examples: list[str]
    result_format: str  # "list" | "summary" | "briefing"
    fn: Callable[..., Any]


def agent_capability(
    *,
    name: str,
    permission: str,
    description: str,
    capability_type: str = "conversational",
    parameters_schema: dict | None = None,
    aliases: list[str] | None = None,
    examples: list[str] | None = None,
    result_format: str = "list",
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Marks a function as an AI capability discoverable by CapabilityRegistry."""

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        module_parts = fn.__module__.split(".")
        # Expected module path: app.modules.{slug}.ai.capabilities
        # [-3] gives the module slug
        module_slug = module_parts[-3] if len(module_parts) >= 3 else module_parts[0]
        setattr(
            fn,
            "__agent_capability__",
            CapabilityDescriptor(
                qualified_name=f"{module_slug}.{name}",
                module_name=module_slug,
                capability_name=name,
                description=description,
                permission_required=permission,
                capability_type=capability_type,
                parameters_schema=parameters_schema or {},
                aliases=aliases or [],
                examples=examples or [],
                result_format=result_format,
                fn=fn,
            ),
        )
        return fn

    return decorator
