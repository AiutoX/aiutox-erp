"""RFC 5545 (iCalendar) VEVENT generation for a single CalendarEvent."""

from datetime import UTC, datetime

from app.core.calendar.models import CalendarEvent, EventStatus
from app.core.users.models import User

_ICS_STATUS_MAP = {
    EventStatus.SCHEDULED: "TENTATIVE",
    EventStatus.CONFIRMED: "CONFIRMED",
    EventStatus.CANCELLED: "CANCELLED",
    EventStatus.COMPLETED: "CONFIRMED",
}


def _fold(line: str) -> str:
    """Fold a content line to the RFC 5545 75-octet limit (naive ASCII fold)."""
    if len(line) <= 75:
        return line
    chunks = [line[:75]]
    rest = line[75:]
    while rest:
        chunks.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(chunks)


def _escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _format_datetime_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def build_event_ics(event: CalendarEvent, organizer: User | None) -> bytes:
    """Build a single-VEVENT .ics file (RFC 5545) for the given event."""
    now = _format_datetime_utc(datetime.now(UTC))
    uid = f"{event.id}@aiutox-erp"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AiutoX ERP//Calendar//EN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now}",
        f"DTSTART:{_format_datetime_utc(event.start_time)}",
        f"DTEND:{_format_datetime_utc(event.end_time)}",
        f"SUMMARY:{_escape_text(event.title)}",
    ]

    if event.description:
        lines.append(f"DESCRIPTION:{_escape_text(event.description)}")
    if event.location:
        lines.append(f"LOCATION:{_escape_text(event.location)}")
    if event.recurrence_rule:
        lines.append(f"RRULE:{event.recurrence_rule}")

    status = _ICS_STATUS_MAP.get(EventStatus(event.status), "CONFIRMED")
    lines.append(f"STATUS:{status}")

    if organizer and organizer.email:
        organizer_name = (
            f"{organizer.first_name or ''} {organizer.last_name or ''}".strip()
        )
        cn = f";CN={_escape_text(organizer_name)}" if organizer_name else ""
        lines.append(f"ORGANIZER{cn}:mailto:{organizer.email}")

    for attendee in event.attendees:
        email = attendee.email
        if not email:
            continue
        cn = f";CN={_escape_text(attendee.name)}" if attendee.name else ""
        lines.append(f"ATTENDEE{cn}:mailto:{email}")

    lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")

    folded = "\r\n".join(_fold(line) for line in lines) + "\r\n"
    return folded.encode("utf-8")
