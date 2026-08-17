"""SearchProvider for the calendar module (SRC-005).

Unlike TasksSearchProvider, calendar events do NOT have flat tenant-wide
visibility under calendar.view alone — real access is owner-or-share based
(Calendar.owner_id / CalendarShare), already implemented in
CalendarService.check_calendar_access(). filter_visible() is REQUIRED here
and reuses that existing logic rather than reimplementing it, per
MODULE-SPEC.md's requirement that a fine-grained visibility rule not be
silently assumed away.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.calendar.models import Calendar, CalendarEvent
from app.core.calendar.service import CalendarService
from app.core.search.handler import SearchIndexDefinition, SearchProvider


class CalendarSearchProvider(SearchProvider):
    """Makes calendar events searchable: title + description, with real
    owner/share-based visibility filtering (not just a flat permission)."""

    def __init__(self, db: Session):
        self.db = db
        self.calendar_service = CalendarService(db)

    def get_index_definition(self) -> SearchIndexDefinition:
        return SearchIndexDefinition(
            entity_type="calendar_event",
            model_class=CalendarEvent,
            search_columns=["title", "description"],
            label_column="title",
            permission="calendar.view",
            url_template="/calendar?event={id}",
            icon="calendar",
        )

    async def filter_visible(self, user: Any, candidate_ids: list[UUID]) -> list[UUID]:
        """Filter candidate events to only those in a calendar the user owns
        or has been shared. Resolves calendar_id for the whole batch in one
        query, then checks access per DISTINCT calendar (not per event) —
        a real search result batch typically spans few calendars, so this
        stays far from a per-candidate query pattern while still reusing
        the existing, real access-check logic exactly as the rest of the
        app already does.
        """
        if not candidate_ids:
            return []

        rows = (
            self.db.query(
                CalendarEvent.id, CalendarEvent.calendar_id, Calendar.tenant_id
            )
            .join(Calendar, Calendar.id == CalendarEvent.calendar_id)
            .filter(CalendarEvent.id.in_(candidate_ids))
            .all()
        )

        accessible_calendars: dict[UUID, bool] = {}
        visible_ids: list[UUID] = []

        for event_id, calendar_id, tenant_id in rows:
            if calendar_id not in accessible_calendars:
                accessible_calendars[calendar_id] = (
                    self.calendar_service.check_calendar_access(
                        calendar_id=calendar_id,
                        tenant_id=tenant_id,
                        user_id=user.id,
                    )
                )

            if accessible_calendars[calendar_id]:
                visible_ids.append(event_id)

        return visible_ids
