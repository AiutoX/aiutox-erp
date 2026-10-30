"""Object-level ownership checks for comment mutation endpoints (CMT-002, CMT-009).

Complements the identity-scoped, resource-blind require_permission(...) dependency
with a per-comment relationship check. Mirrors app/core/tasks/ownership.py's pattern:
pure functions the router calls after fetching the comment, before mutating it.

Edit is author-only, with no bypass — comments.manage grants moderation (delete),
never a rewrite path over another user's words, by explicit product decision.
"""

from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from app.core.comments.permissions import COMMENTS_MANAGE


class _HasCreatedBy(Protocol):
    created_by: UUID | None


class _HasCreatedByAndCreatedAt(Protocol):
    created_by: UUID | None
    created_at: datetime


def user_can_edit_comment(comment: _HasCreatedBy, user_id: UUID) -> bool:
    """Only the comment's author may edit it — no permission bypasses this,
    including comments.manage."""
    return comment.created_by == user_id


def user_can_delete_comment(
    comment: _HasCreatedBy, user_id: UUID, user_permissions: set[str]
) -> bool:
    """Author may delete their own comment; comments.manage may delete any comment
    for moderation."""
    if comment.created_by == user_id:
        return True
    return COMMENTS_MANAGE in user_permissions


def is_within_edit_delete_window(
    comment: _HasCreatedByAndCreatedAt, window_minutes: int | None
) -> bool:
    """CMT-009: per-tenant configurable time window for the AUTHOR's own
    edit/delete self-service — never applied to a comments.manage moderation
    delete, which must always be possible regardless of comment age (see
    the router, which only calls this on the author's own-comment path).

    window_minutes is None or <= 0 means "no limit" (this project's default,
    to avoid silently breaking every existing tenant's current unlimited-edit
    behavior when this setting is introduced).
    """
    if window_minutes is None or window_minutes <= 0:
        return True
    created_at = comment.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    elapsed_minutes = (datetime.now(UTC) - created_at).total_seconds() / 60
    return elapsed_minutes <= window_minutes
