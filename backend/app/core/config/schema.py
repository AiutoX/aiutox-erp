"""Schema validation for system configuration."""

import re
from typing import Any

# Maps type name → callable(value) → bool
_TYPE_CHECKERS: dict[str, Any] = {
    "string": lambda v: isinstance(v, str),
    "int": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "float": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "bool": lambda v: isinstance(v, bool),
    "dict": lambda v: isinstance(v, dict),
    "list": lambda v: isinstance(v, list),
}


class ConfigSchema:
    """Schema validator for module configurations."""

    def __init__(self) -> None:
        # Registry of schemas by module
        # Format: {module: {key: {type: str, default: Any, required: bool}}}
        self._schemas: dict[str, dict[str, dict[str, Any]]] = {}

    def register_schema(
        self, module: str, key: str, schema_def: dict[str, Any]
    ) -> None:
        if module not in self._schemas:
            self._schemas[module] = {}
        self._schemas[module][key] = schema_def

    def _lookup_schema(self, module: str, key: str) -> dict[str, Any] | None:
        """Return the matching schema_def for module+key, or None if not registered."""
        module_schemas = self._schemas.get(module)
        if module_schemas is None:
            return None
        if key in module_schemas:
            return module_schemas[key]
        for pattern_key, schema_def in module_schemas.items():
            if "*" in pattern_key:
                pattern = pattern_key.replace("*", ".*")
                if re.match(pattern, key):
                    return schema_def
        return None

    def _check_constraints(self, schema_def: dict[str, Any], value: Any) -> bool:
        if "pattern" in schema_def and isinstance(value, str):
            if not re.match(schema_def["pattern"], value):
                return False
        if "enum" in schema_def and value not in schema_def["enum"]:
            return False
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "min" in schema_def and value < schema_def["min"]:
                return False
            if "max" in schema_def and value > schema_def["max"]:
                return False
        if isinstance(value, str):
            if "minLength" in schema_def and len(value) < schema_def["minLength"]:
                return False
            if "maxLength" in schema_def and len(value) > schema_def["maxLength"]:
                return False
        return True

    def validate(self, module: str, key: str, value: Any) -> bool:
        schema_def = self._lookup_schema(module, key)
        if schema_def is None:
            return True

        expected_type = schema_def.get("type", "any")
        checker = _TYPE_CHECKERS.get(expected_type)
        if checker is not None and not checker(value):
            return False
        if checker is None and expected_type != "any":
            return True  # unknown type — allow

        return self._check_constraints(schema_def, value)

    def get_default(self, module: str, key: str) -> Any:
        schema_def = self._lookup_schema(module, key)
        if schema_def is not None:
            return schema_def.get("default")
        return None


# Global instance
config_schema = ConfigSchema()


def register_module_schemas() -> None:
    """Register schemas for module management in the system module.

    This registers the schema for system.modules.{module_id}.enabled
    which allows enabling/disabling modules via the configuration system.
    """
    # Register schema for module enable/disable
    # Note: The key pattern is "modules.{module_id}.enabled"
    # We register a generic pattern that will match any module_id
    # The validation will accept any module_id in the key
    config_schema.register_schema(
        module="system",
        key="modules.*.enabled",  # Wildcard pattern for any module
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable/disable a module",
        },
    )


def register_general_settings_schemas() -> None:
    """Register schemas for general system settings."""
    config_schema.register_schema(
        module="system",
        key="general.timezone",
        schema_def={
            "type": "string",
            "default": "America/Mexico_City",
            "required": False,
            "description": "System timezone",
        },
    )
    config_schema.register_schema(
        module="system",
        key="general.date_format",
        schema_def={
            "type": "string",
            "default": "DD/MM/YYYY",
            "required": False,
            "description": "Date format",
        },
    )
    config_schema.register_schema(
        module="system",
        key="general.time_format",
        schema_def={
            "type": "string",
            "default": "24h",
            "enum": ["12h", "24h"],
            "required": False,
            "description": "Time format",
        },
    )
    config_schema.register_schema(
        module="system",
        key="general.currency",
        schema_def={
            "type": "string",
            "default": "MXN",
            "minLength": 3,
            "maxLength": 3,
            "required": False,
            "description": "Currency code (ISO 4217)",
        },
    )
    config_schema.register_schema(
        module="system",
        key="general.language",
        schema_def={
            "type": "string",
            "default": "es",
            "minLength": 2,
            "maxLength": 5,
            "required": False,
            "description": "Language code (ISO 639-1)",
        },
    )


def register_tasks_settings_schemas() -> None:
    """Register schemas for Tasks module settings."""
    config_schema.register_schema(
        module="tasks",
        key="calendar.enabled",
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable Tasks calendar features",
        },
    )
    config_schema.register_schema(
        module="tasks",
        key="board.enabled",
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable Tasks board view",
        },
    )
    config_schema.register_schema(
        module="tasks",
        key="inbox.enabled",
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable Tasks inbox view",
        },
    )
    config_schema.register_schema(
        module="tasks",
        key="list.enabled",
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable Tasks list view",
        },
    )
    config_schema.register_schema(
        module="tasks",
        key="stats.enabled",
        schema_def={
            "type": "bool",
            "default": True,
            "required": False,
            "description": "Enable Tasks stats view",
        },
    )


# Auto-register module schemas on import
register_module_schemas()
register_general_settings_schemas()
register_tasks_settings_schemas()
