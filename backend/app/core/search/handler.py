"""Extension point letting a core/business module plug into generic search.

A module that wants its entities to be searchable implements SearchProvider
and returns it from ModuleInterface.get_search_handler(). core/search never
imports the module directly — it calls this interface polymorphically via
ModuleRegistry, the same pattern already used for
get_import_export_handler()/get_widgets().
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class SearchIndexDefinition:
    """Static declaration of what a module's entity exposes to search.

    Consumed by the indexing consumer (which columns to extract from a
    domain event's entity) and by the read path (base permission, URL
    template, icon per entity type).
    """

    entity_type: str  # e.g. "task", "calendar_event", "user"
    model_class: type
    search_columns: list[str]  # fuzzy full-text columns, e.g. ["title", "description"]
    label_column: str
    permission: str  # base required permission, e.g. "tasks.view"
    url_template: str  # e.g. "/tasks/{id}"
    icon: str | None = None
    exact_match_column: str | None = None  # normalized, exact/prefix-only field


class SearchProvider(ABC):
    """Implemented by a module to support generic cross-module search."""

    @abstractmethod
    def get_index_definition(self) -> SearchIndexDefinition:
        """Return this module's static searchability declaration."""

    async def filter_visible(self, user: Any, candidate_ids: list[UUID]) -> list[UUID]:
        """Optional fine-grained visibility filter.

        Default: no additional restriction beyond the base permission
        already checked by the caller. Providers override this only when
        they have ABAC-style rules (ownership, sharing, etc.) beyond a flat
        permission check. MUST resolve in a single batch query over the
        full candidate list — never one query per candidate (see
        MODULE-SPEC.md RULE-004).
        """
        return candidate_ids
