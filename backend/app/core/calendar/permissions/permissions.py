"""Calendar module permission constants."""

CALENDAR_READ = "calendar.read"  # View calendars and events
CALENDAR_WRITE = "calendar.write"  # Create and update calendars/events
CALENDAR_DELETE = "calendar.delete"  # Delete own calendars/events
CALENDAR_ADMIN = "calendar.admin"  # Full calendar management

ALL_CALENDAR_PERMISSIONS = [
    CALENDAR_READ,
    CALENDAR_WRITE,
    CALENDAR_DELETE,
    CALENDAR_ADMIN,
]

PERMISSION_DESCRIPTIONS = {
    CALENDAR_READ: "View calendars and events",
    CALENDAR_WRITE: "Create and update calendars and events",
    CALENDAR_DELETE: "Delete own calendars and events",
    CALENDAR_ADMIN: "Full calendar management including other users' calendars",
}
