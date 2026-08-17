"""Calendar sync service for synchronizing tasks with calendar events."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.calendar.models import CalendarEvent
from app.core.calendar.service import CalendarService
from app.core.tasks.models import Task, TaskAssignment


class CalendarSyncService:
    """Service for synchronizing tasks with calendar events."""

    def __init__(self, db: Session) -> None:
        """Initialize service with database session."""
        self.db = db
        self.calendar_service = CalendarService(db)

    def sync_task_to_event(
        self,
        task: Task,
        calendar_id: UUID | None = None,
    ) -> CalendarEvent | None:
        """Sync a task to a calendar event.

        Creates or updates a calendar event from a task with scheduling fields.

        Args:
            task: Task instance
            calendar_id: Optional calendar ID (uses default if not provided)

        Returns:
            CalendarEvent instance or None if task has no schedulable date
        """
        event_start = task.start_at or task.due_date
        event_end = task.end_at or task.start_at or task.due_date

        if not event_start:
            # If task has no due_date, delete existing event if any
            self.delete_event_by_source(
                source_type="task",
                source_id=UUID(str(task.id)),
                tenant_id=UUID(str(task.tenant_id)),
            )
            return None

        # Check if event already exists for this task
        existing_event = self._get_event_by_source(
            source_type="task",
            source_id=UUID(str(task.id)),
            tenant_id=UUID(str(task.tenant_id)),
        )

        organizer_id = (
            UUID(str(task.created_by_id)) if task.created_by_id else UUID(int=0)
        )

        # Get or create the task creator's default calendar if not provided.
        # Must be owned by organizer_id, not tenant-wide, or the synced event
        # would never appear in anyone's "My Calendars" list.
        if not calendar_id:
            calendar_id = self._get_or_create_default_calendar(
                UUID(str(task.tenant_id)), organizer_id
            )

        # Prepare event data
        event_data = {
            "calendar_id": calendar_id,
            "title": task.title,
            "description": task.description,
            "start_time": event_start,
            "end_time": event_end or event_start,
            "all_day": bool(task.all_day),
            "status": self._map_task_status_to_event_status(task.status),
            "source_type": "task",
            "source_id": task.id,
            "metadata": {
                "task_priority": task.priority,
                "task_status": task.status,
            },
        }

        if existing_event:
            # Update existing event
            return self.calendar_service.update_event(
                event_id=UUID(str(existing_event.id)),
                tenant_id=UUID(str(task.tenant_id)),
                event_data=event_data,
            )
        else:
            # Create new event, inviting every real assignee (legacy
            # single-assignee field or multi-user TaskAssignment rows) as an
            # attendee — the task's creator owns the calendar the event lives
            # on, but assignees need to see it too, and calendar events only
            # support one owner.
            assignee_ids = self._get_task_assignee_ids(task)
            event_data["attendees"] = [
                {"user_id": assignee_id} for assignee_id in assignee_ids
            ]
            return self.calendar_service.create_event(
                event_data=event_data,
                tenant_id=UUID(str(task.tenant_id)),
                organizer_id=organizer_id,
            )

    def _get_task_assignee_ids(self, task: Task) -> set[UUID]:
        """Collect every real user assignee for a task.

        Combines the legacy single `assigned_to_id` field with rows from the
        multi-user `TaskAssignment` table, excluding the organizer (the task
        creator, who already owns the calendar the event lives on) and
        group assignments (no single user to invite).

        Args:
            task: Task instance

        Returns:
            Set of user IDs to invite as event attendees
        """
        assignee_ids: set[UUID] = set()

        if task.assigned_to_id:
            assignee_ids.add(UUID(str(task.assigned_to_id)))

        assignment_rows = (
            self.db.query(TaskAssignment.assigned_to_id)
            .filter(
                TaskAssignment.task_id == task.id,
                TaskAssignment.assigned_to_id.isnot(None),
            )
            .all()
        )
        assignee_ids.update(UUID(str(row[0])) for row in assignment_rows)

        if task.created_by_id:
            assignee_ids.discard(UUID(str(task.created_by_id)))

        return assignee_ids

    def sync_event_to_task(
        self,
        event: CalendarEvent,
    ) -> Task | None:
        """Sync a calendar event back to its source task.

        Updates the task's due_date when the event is moved.

        Args:
            event: CalendarEvent instance

        Returns:
            Updated Task instance or None if event is not from a task
        """
        if event.source_type != "task" or not event.source_id:
            return None

        task = self.db.query(Task).filter(Task.id == event.source_id).first()
        if not task:
            return None

        # Update task dates
        if task.start_at or task.end_at or task.all_day:
            task.start_at = event.start_time
            task.end_at = event.end_time
        else:
            task.due_date = event.start_time

        # Update task status if event is cancelled
        if event.status == "cancelled" and task.status != "cancelled":
            task.status = "cancelled"

        self.db.commit()
        self.db.refresh(task)

        return task

    def delete_event_by_source(
        self,
        source_type: str,
        source_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Delete a calendar event by its source.

        Args:
            source_type: Source type (e.g., 'task')
            source_id: Source entity ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        event = self._get_event_by_source(source_type, source_id, tenant_id)
        if not event:
            return False

        return self.calendar_service.delete_event(UUID(str(event.id)), tenant_id)

    def _get_event_by_source(
        self,
        source_type: str,
        source_id: UUID,
        tenant_id: UUID,
    ) -> CalendarEvent | None:
        """Get a calendar event by its source.

        Args:
            source_type: Source type
            source_id: Source entity ID
            tenant_id: Tenant ID

        Returns:
            CalendarEvent instance or None if not found
        """
        return (
            self.db.query(CalendarEvent)
            .filter(
                CalendarEvent.source_type == source_type,
                CalendarEvent.source_id == source_id,
                CalendarEvent.tenant_id == tenant_id,
            )
            .first()
        )

    def _get_or_create_default_calendar(self, tenant_id: UUID, owner_id: UUID) -> UUID:
        """Get or create the owner's default "Tasks Calendar".

        Must be scoped by owner_id, not just tenant_id — calendars are
        personal to a user (see docs/04-modules/core/calendar.md), and every
        query that lists "my calendars" filters strictly by owner_id. A
        tenant-wide default with no owner would create a calendar no user
        could ever see.

        Args:
            tenant_id: Tenant ID
            owner_id: User ID who will own this calendar

        Returns:
            Calendar ID
        """
        from app.core.calendar.models import Calendar

        # Try to find this owner's existing default calendar
        default_calendar = (
            self.db.query(Calendar)
            .filter(
                Calendar.tenant_id == tenant_id,
                Calendar.owner_id == owner_id,
                Calendar.is_default == True,  # noqa: E712
                Calendar.calendar_type == "user",
            )
            .first()
        )

        if default_calendar:
            return UUID(str(default_calendar.id))

        # Create this owner's default calendar
        calendar = Calendar(
            tenant_id=tenant_id,
            owner_id=owner_id,
            name="Tasks Calendar",
            calendar_type="user",
            color="#023E87",
            is_default=True,
            is_public=False,
        )

        self.db.add(calendar)
        self.db.commit()
        self.db.refresh(calendar)

        return UUID(str(calendar.id))

    def _map_task_status_to_event_status(self, task_status: str) -> str:
        """Map task status to event status.

        Args:
            task_status: Task status

        Returns:
            Event status
        """
        status_map = {
            "todo": "scheduled",
            "in_progress": "confirmed",
            "on_hold": "scheduled",
            "blocked": "scheduled",
            "review": "confirmed",
            "done": "completed",
            "cancelled": "cancelled",
        }

        return status_map.get(task_status, "scheduled")
