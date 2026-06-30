"""Search registry for registering searchable entities."""

from dataclasses import dataclass

from sqlalchemy.orm import DeclarativeBase  # type: ignore[attr-defined]


@dataclass
class SearchableEntity:
    """Definition of a searchable entity."""

    entity_type: str  # "task", "file", "lease"
    model_class: type[DeclarativeBase]
    search_columns: list[str]  # ["title", "description"]
    display_columns: list[str]  # ["id", "title", "status"]
    tenant_id_column: str = "tenant_id"
    label_column: str = "title"


class SearchRegistry:
    """Global registry of searchable entities.

    Modules register their entities at startup.
    """

    _instance: "SearchRegistry | None" = None
    _entities: dict[str, SearchableEntity] = {}

    def __new__(cls) -> "SearchRegistry":
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def register(self, entity: SearchableEntity) -> None:
        """Register a searchable entity.

        Args:
            entity: SearchableEntity definition
        """
        self._entities[entity.entity_type] = entity

    def get(self, entity_type: str) -> SearchableEntity | None:
        """Get a registered entity.

        Args:
            entity_type: Entity type name

        Returns:
            SearchableEntity or None if not found
        """
        return self._entities.get(entity_type)

    def get_all(self) -> list[SearchableEntity]:
        """Get all registered entities.

        Returns:
            List of SearchableEntity instances
        """
        return list(self._entities.values())

    def get_entity_types(self) -> list[str]:
        """Get all registered entity types.

        Returns:
            List of entity type names
        """
        return list(self._entities.keys())

    def has(self, entity_type: str) -> bool:
        """Check if entity type is registered.

        Args:
            entity_type: Entity type name

        Returns:
            True if registered, False otherwise
        """
        return entity_type in self._entities


def get_search_registry() -> SearchRegistry:
    """Get the global SearchRegistry instance."""
    return SearchRegistry()
