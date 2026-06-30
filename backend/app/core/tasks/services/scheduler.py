"""Task scheduler for reminders and notifications."""

import logging

logger = logging.getLogger(__name__)

_task_scheduler = None


class TaskScheduler:
    """Scheduler for task reminders and due-date notifications."""

    async def start(self) -> None:
        logger.info("TaskScheduler started")

    async def stop(self) -> None:
        logger.info("TaskScheduler stopped")


async def get_task_scheduler() -> TaskScheduler:
    """Get or create the global TaskScheduler instance."""
    global _task_scheduler
    if _task_scheduler is None:
        _task_scheduler = TaskScheduler()
        await _task_scheduler.start()
    return _task_scheduler


async def stop_task_scheduler() -> None:
    """Stop and clean up the global TaskScheduler instance."""
    global _task_scheduler
    if _task_scheduler is not None:
        await _task_scheduler.stop()
        _task_scheduler = None
