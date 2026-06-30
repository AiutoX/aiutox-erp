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
                frontend_component="features/calendar/MiniCalendarWidget",
                required_tier="basic",
                width=4,
                height=3,
            ),
        ]
