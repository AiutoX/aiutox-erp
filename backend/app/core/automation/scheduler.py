"""Scheduler for time-based automation triggers."""

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


def is_valid_cron(expression: str) -> bool:
    """Return True if expression is a valid 5-field cron string."""
    if not expression or not expression.strip():
        return False
    try:
        CronTrigger.from_crontab(expression)
        return True
    except (ValueError, KeyError):
        return False


class CroniterWrapper:
    """Thin wrapper around APScheduler CronTrigger for next-fire-time computation."""

    def __init__(self, expression: str) -> None:
        self._trigger = CronTrigger.from_crontab(expression)

    def get_next(self) -> datetime:
        """Return the next fire time after now (UTC-aware datetime)."""
        now = datetime.now(UTC)
        next_fire = self._trigger.get_next_fire_time(None, now)
        if next_fire is None:
            # Fallback: retry in 60s (should not happen with standard cron)
            return datetime.now(UTC).replace(second=0) + __import__(
                "datetime"
            ).timedelta(seconds=60)
        return next_fire


class Scheduler:
    """Scheduler for time-based rule triggers.

    Supports three schedule types:
    - interval: fires every N seconds
    - once:     fires once at a specific UTC datetime
    - cron:     fires on a cron expression (e.g. "0 9 * * 1" = every Monday 9am)
    """

    def __init__(self) -> None:
        self._running = False
        # Maps rule_id -> asyncio.Task
        self._scheduled_rules: dict[str, asyncio.Task] = {}  # type: ignore[type-arg]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def schedule_rule(
        self,
        rule_id: str,
        schedule: dict[str, Any],
        callback: Callable[[], Any],
    ) -> None:
        """Schedule a rule to be executed based on time.

        Args:
            rule_id: Unique rule identifier.
            schedule: Schedule config — e.g.
                {"type": "interval", "seconds": 3600}
                {"type": "cron", "expression": "0 9 * * 1"}
                {"type": "once", "execute_at": "2026-01-01T09:00:00Z"}
            callback: Async callable invoked on each trigger.

        Raises:
            ValueError: For invalid cron expressions or unknown schedule types.
        """
        schedule_type = schedule.get("type")

        if schedule_type == "interval":
            seconds = schedule.get("seconds", 3600)
            task = asyncio.create_task(self._interval_task(rule_id, seconds, callback))
            self._scheduled_rules[rule_id] = task

        elif schedule_type == "cron":
            expression = schedule.get("expression") or ""
            if not is_valid_cron(expression):
                raise ValueError(
                    f"Invalid cron expression: {expression!r}. "
                    "Expected 5-field crontab format (e.g. '0 9 * * 1')."
                )
            task = asyncio.create_task(self._cron_task(rule_id, expression, callback))
            self._scheduled_rules[rule_id] = task

        elif schedule_type == "once":
            execute_at = schedule.get("execute_at")
            if execute_at:
                task = asyncio.create_task(
                    self._once_task(rule_id, execute_at, callback)
                )
                self._scheduled_rules[rule_id] = task

        else:
            raise ValueError(f"Unknown schedule type: {schedule_type}")

        logger.info("Scheduled rule %s with schedule type: %s", rule_id, schedule_type)

    def cancel_rule(self, rule_id: str) -> None:
        """Cancel a scheduled rule and remove it from the registry."""
        task = self._scheduled_rules.pop(rule_id, None)
        if task is not None:
            task.cancel()
            logger.info("Cancelled scheduled rule %s", rule_id)

    async def start(self) -> None:
        """Start the scheduler."""
        self._running = True
        logger.info("Scheduler started")

    async def stop(self) -> None:
        """Stop the scheduler and cancel all pending tasks."""
        self._running = False
        tasks = list(self._scheduled_rules.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._scheduled_rules.clear()
        logger.info("Scheduler stopped")

    # ------------------------------------------------------------------
    # Internal task loops
    # ------------------------------------------------------------------

    async def _interval_task(
        self, rule_id: str, seconds: int, callback: Callable[[], Any]
    ) -> None:
        while rule_id in self._scheduled_rules:
            try:
                await asyncio.sleep(seconds)
                if rule_id in self._scheduled_rules:
                    await callback()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Interval rule %s callback error: %s", rule_id, e, exc_info=True
                )

    async def _cron_task(
        self, rule_id: str, expression: str, callback: Callable[[], Any]
    ) -> None:
        """Fire callback on each cron tick until the rule is cancelled."""
        cron = CroniterWrapper(expression)
        while rule_id in self._scheduled_rules:
            try:
                next_fire = cron.get_next()
                now = datetime.now(UTC)
                delay = (next_fire - now).total_seconds()
                if delay > 0:
                    await asyncio.sleep(delay)
                if rule_id in self._scheduled_rules:
                    await callback()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Cron rule %s callback error: %s", rule_id, e, exc_info=True
                )

    async def _once_task(
        self, rule_id: str, execute_at: str, callback: Callable[[], Any]
    ) -> None:
        try:
            target_time = datetime.fromisoformat(execute_at.replace("Z", "+00:00"))
            now = datetime.now(UTC)
            if target_time > now:
                wait_seconds = (target_time - now).total_seconds()
                await asyncio.sleep(wait_seconds)
                if rule_id in self._scheduled_rules:
                    await callback()
            else:
                logger.warning(
                    "Scheduled time %s is in the past for rule %s", execute_at, rule_id
                )
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Once rule %s error: %s", rule_id, e, exc_info=True)
