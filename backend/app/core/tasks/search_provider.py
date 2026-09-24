"""SearchProvider for the tasks module — the first real implementation,
proving the SearchProvider extension point end-to-end (SRC-004).

Registered via TasksCoreModule.get_search_handler(), discovered by
ModuleRegistry — core/search never imports this module directly.
"""

from app.core.search.handler import SearchIndexDefinition, SearchProvider
from app.core.tasks.models.task import Task


class TasksSearchProvider(SearchProvider):
    """Makes tasks searchable: title + description, base permission only.

    No filter_visible() override — per PRD Assumption 3, a flat
    "tasks.view" permission check is sufficient for Phase 1. If real usage
    later shows tasks need ownership/assignment-based visibility beyond the
    base permission, that is a deliberate follow-up decision, not something
    silently assumed here.
    """

    def get_index_definition(self) -> SearchIndexDefinition:
        return SearchIndexDefinition(
            entity_type="task",
            model_class=Task,
            search_columns=["title", "description"],
            label_column="title",
            permission="tasks.view",
            url_template="/tasks/{id}",
            icon="check-square",
        )
