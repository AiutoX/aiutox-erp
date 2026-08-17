"""Calendar module for calendar and event management."""

from app.core.calendar.service import CalendarService, ReminderService
from app.core.module_interface import ModuleInterface, WidgetManifest

__all__ = ["CalendarService", "ReminderService", "CalendarCoreModule"]


class CalendarCoreModule(ModuleInterface):
    """Core Calendar module — exposes calendar widget to the dashboard."""

    @property
    def module_id(self) -> str:
        return "calendar"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_widgets(self) -> list[WidgetManifest]:
        return [
            WidgetManifest(
                widget_id="calendar.mini",
                label="Calendar",
                description="Shows your upcoming events and meetings",
                # Declared before its component existed; no data endpoint either.
                # default_enabled=False keeps it out of new users' dashboards
                # instead of offering a widget that can only ever render a
                # placeholder. To build it: add
                # features/calendar/widgets/MiniCalendarWidget.tsx (the resolver
                # discovers it automatically), point frontend_component at that
                # path, add a data endpoint, then flip this back to True.
                frontend_component="",
                required_tier="basic",
                width=4,
                height=3,
                default_enabled=False,
            ),
        ]

    def get_search_handler(self):
        from app.core.calendar.search_provider import CalendarSearchProvider
        from app.core.db.session import SessionLocal

        return CalendarSearchProvider(SessionLocal())
