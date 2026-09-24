"""Comment service for comments and collaboration management."""

import logging
import re
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.activities.service import ActivityService
from app.core.comments.models import Comment
from app.core.config.service import ConfigService
from app.core.files.service import FileService
from app.core.module_registry import get_module_registry
from app.core.notifications.service import NotificationService
from app.core.pubsub import EventPublisher, get_event_publisher
from app.core.pubsub.models import EventMetadata
from app.repositories.comment_repository import CommentRepository
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

MAX_NOTIFICATION_EXCERPT_LENGTH = 200

# Maps a comment's entity_type (singular, e.g. "task") to the module.meta.json
# id (plural, e.g. "tasks") whose ConfigService namespace holds that module's
# comments-related settings (e.g. comments_attachments_enabled). Comments is
# core and must not import app.modules.*, so this stays an explicit table
# rather than a naming convention — add one entry per module that embeds
# comments, mirroring how each module already owns its own ConfigService keys.
COMMENT_ENTITY_TYPE_TO_MODULE = {
    "task": "tasks",
}


def resolve_owning_module(entity_type: str) -> str | None:
    """Resolve which module owns a given comment entity_type, if known."""
    return COMMENT_ENTITY_TYPE_TO_MODULE.get(entity_type)


def _display_name(db: Session, user_id: UUID) -> str:
    """Resolve a user's display name for notification templates.

    Falls back to email (never the raw UUID) if full_name isn't set, since
    every user has an email but full_name is optional.
    """
    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        return "Usuario"
    return user.full_name or user.email


def _excerpt(content: str, max_length: int = MAX_NOTIFICATION_EXCERPT_LENGTH) -> str:
    """Render comment content for inclusion in a notification message body.

    Strips @[Name](user-id) mention tokens down to plain "@Name" text first
    (MentionParser.to_plain_text) — a raw token would otherwise leak the
    mentioned user's UUID and unrendered markup into the message the
    recipient sees.
    """
    plain = MentionParser.to_plain_text(content)
    if len(plain) <= max_length:
        return plain
    return plain[: max_length - 1].rstrip() + "…"


# All channels the preferences UI (NotificationPreferencesPanel's
# AVAILABLE_CHANNELS) lets a user pick for comment.replied/comment.mentioned.
# NotificationService.send() intersects this against the user's saved
# preference (see NotificationService.send, "Filter channels based on
# preferences") — omitting a channel here would silently make it
# unreachable regardless of what the user configures, which is the bug this
# constant fixes (previously hardcoded to ["in-app", "email"] only, so a
# user enabling Telegram in Settings still never received anything).
COMMENT_NOTIFICATION_CHANNELS = ["in-app", "email", "telegram", "whatsapp"]


def _dispatch_notification(
    notification_service: NotificationService,
    *,
    event_type: str,
    recipient_id: UUID,
    channels: list[str],
    data: dict[str, Any],
    tenant_id: UUID,
) -> None:
    """Fire a notification without blocking the request on delivery.

    Works whether or not an event loop is already running (the request path
    is sync FastAPI, but tests and some callers run inside an async loop).
    """
    import asyncio

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    coro = notification_service.send(
        event_type=event_type,
        recipient_id=recipient_id,
        channels=channels,
        data=data,
        tenant_id=tenant_id,
    )
    if loop.is_running():
        asyncio.create_task(coro)
    else:
        loop.run_until_complete(coro)


class MentionParser:
    """Parser for @[Display Name](user-id) mentions in comments.

    The mention-autocomplete UI (CommentForm.tsx) inserts this exact token
    format when a user picks a candidate, so the display name never has to
    round-trip through a plain-@word regex — a prior version matched on
    `@(\\w+)` against `User.email`, which silently failed to resolve any
    mention containing a space or a second '@' (i.e. every real email-based
    mention), since `\\w+` stops at the first non-word character.
    """

    MENTION_PATTERN = re.compile(r"@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)")

    @staticmethod
    def extract_mentioned_user_ids(content: str) -> list[UUID]:
        """Extract mentioned user IDs from @[Name](user-id) tokens.

        Args:
            content: Comment content

        Returns:
            List of unique mentioned user IDs (invalid UUID tokens are
            skipped, not raised — malformed content should not fail comment
            creation).
        """
        user_ids: set[UUID] = set()
        for _name, raw_id in MentionParser.MENTION_PATTERN.findall(content):
            try:
                user_ids.add(UUID(raw_id))
            except ValueError:
                continue
        return list(user_ids)

    @staticmethod
    def to_plain_text(content: str) -> str:
        """Replace @[Name](user-id) tokens with plain "@Name" text.

        Used when a comment's content is echoed somewhere the raw token
        format doesn't apply — e.g. notification message bodies — so
        neither the markup nor the user's UUID leaks into what the
        recipient sees.
        """
        return MentionParser.MENTION_PATTERN.sub(r"@\1", content)

    @staticmethod
    def filter_existing_user_ids(
        db: Session, user_ids: list[UUID], tenant_id: UUID
    ) -> list[UUID]:
        """Filter mentioned user IDs down to real users in the same tenant.

        Args:
            db: Database session
            user_ids: Candidate user IDs extracted from mention tokens
            tenant_id: Tenant ID

        Returns:
            The subset of user_ids that resolve to a real user in this tenant
        """
        if not user_ids:
            return []

        from app.core.users.models import User

        users = (
            db.query(User)
            .filter(User.id.in_(user_ids), User.tenant_id == tenant_id)  # type: ignore[attr-defined]
            .all()
        )
        return [user.id for user in users]


class CommentService:
    """Service for managing comments and collaboration."""

    def __init__(
        self,
        db: Session,
        file_service: FileService | None = None,
        notification_service: NotificationService | None = None,
        activity_service: ActivityService | None = None,
        event_publisher: EventPublisher | None = None,
    ):
        """Initialize comment service.

        Args:
            db: Database session
            file_service: FileService instance (for attachments)
            notification_service: NotificationService instance
            activity_service: ActivityService instance
            event_publisher: EventPublisher instance
        """
        self.db = db
        self.repository = CommentRepository(db)
        self.file_service = file_service or FileService(db)
        self.notification_service = notification_service or NotificationService(db)
        self.activity_service = activity_service or ActivityService(db)
        self.event_publisher = event_publisher or get_event_publisher()
        self.mention_parser = MentionParser()

    def create_comment(
        self,
        comment_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Comment:
        """Create a new comment.

        Args:
            comment_data: Comment data
            tenant_id: Tenant ID
            user_id: User ID who created the comment

        Returns:
            Created Comment object
        """
        comment_data["tenant_id"] = tenant_id
        comment_data["created_by"] = user_id

        comment = self.repository.create_comment(comment_data)

        # Extract and process mentions
        mentioned_ids = self.mention_parser.extract_mentioned_user_ids(comment.content)
        mentions = self.mention_parser.filter_existing_user_ids(
            self.db, mentioned_ids, tenant_id
        )
        if mentions:
            for mentioned_user_id in mentions:
                self.repository.create_comment_mention(
                    {
                        "tenant_id": tenant_id,
                        "comment_id": comment.id,
                        "mentioned_user_id": mentioned_user_id,
                        "notification_sent": False,
                    }
                )

                # Send notification (async)
                try:
                    _dispatch_notification(
                        self.notification_service,
                        event_type="comment.mentioned",
                        recipient_id=mentioned_user_id,
                        channels=COMMENT_NOTIFICATION_CHANNELS,
                        data={
                            "comment_id": str(comment.id),
                            "entity_type": comment.entity_type,
                            "entity_id": str(comment.entity_id),
                            "mentioned_by": str(user_id),
                            "nombre": _display_name(self.db, mentioned_user_id),
                            "mentioned_by_name": _display_name(self.db, user_id),
                            "comment_excerpt": _excerpt(comment.content),
                        },
                        tenant_id=tenant_id,
                    )
                except Exception as e:
                    logger.error(f"Failed to send mention notification: {e}")

        # Notify the parent comment's author on reply, independent of whether
        # the reply text also @mentions them (mentions are handled above and
        # would otherwise be the only path an author gets notified on a reply).
        # Gated on the notifications module being enabled for this tenant —
        # comments must not depend on notifications to function (RULE: no
        # forced cross-module dependency), this is best-effort enrichment.
        if comment.parent_id is not None:
            parent_comment = self.repository.get_comment_by_id(
                UUID(str(comment.parent_id)), tenant_id
            )
            _notifications_enabled = get_module_registry().is_module_enabled(
                "notifications", tenant_id
            )
            logger.debug(
                f"reply-notify gate: parent_comment_id={getattr(parent_comment, 'id', None)} "
                f"parent_author={getattr(parent_comment, 'created_by', None)} "
                f"replier={user_id} notifications_enabled={_notifications_enabled}"
            )
            if (
                parent_comment is not None
                and parent_comment.created_by is not None
                and parent_comment.created_by != user_id
                and _notifications_enabled
            ):
                try:
                    recipient_id = UUID(str(parent_comment.created_by))
                    _dispatch_notification(
                        self.notification_service,
                        event_type="comment.replied",
                        recipient_id=recipient_id,
                        channels=COMMENT_NOTIFICATION_CHANNELS,
                        data={
                            "comment_id": str(comment.id),
                            "parent_comment_id": str(parent_comment.id),
                            "entity_type": comment.entity_type,
                            "entity_id": str(comment.entity_id),
                            "replied_by": str(user_id),
                            "nombre": _display_name(self.db, recipient_id),
                            "replied_by_name": _display_name(self.db, user_id),
                            "comment_excerpt": _excerpt(comment.content),
                        },
                        tenant_id=tenant_id,
                    )
                except Exception as e:
                    logger.error(f"Failed to send reply notification: {e}")

        # Create activity
        try:
            self.activity_service.create_activity(
                entity_type=comment.entity_type,
                entity_id=UUID(str(comment.entity_id)),
                activity_type="comment",
                title="Comment added",
                tenant_id=tenant_id,
                user_id=user_id,
                description=comment.content[:200],  # First 200 chars
            )
        except Exception as e:
            logger.error(f"Failed to create activity for comment: {e}")

        # Publish event
        from app.core.pubsub.event_helpers import safe_publish_event

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="comment.created",
            entity_type="comment",
            entity_id=comment.id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=EventMetadata(
                source="comment_service",
                version="1.0",
                additional_data={
                    "entity_type": comment.entity_type,
                    "entity_id": str(comment.entity_id),
                    "has_mentions": len(mentions) > 0,
                },
            ),
        )

        return comment

    async def create_comment_with_attachment(
        self,
        comment_data: dict,
        tenant_id: UUID,
        user_id: UUID,
        file_content: bytes | None,
        filename: str | None,
    ) -> tuple[Comment, str, str | None]:
        """Create a comment and, if a file is supplied, attach it.

        Always creates the comment via the existing create_comment — never
        reimplements that logic. The comment always succeeds regardless of
        what happens to the optional attachment step; on any attachment
        failure the caller's author is notified asynchronously (best
        effort) and the real error is returned alongside the comment so the
        caller can show it immediately.

        Returns:
            (comment, attachment_status, attachment_error) where
            attachment_status is "success" | "failed" | "skipped".
        """
        comment = self.create_comment(comment_data, tenant_id, user_id)

        if file_content is None or filename is None:
            return comment, "skipped", None

        owning_module = resolve_owning_module(comment.entity_type)
        attachments_enabled = bool(owning_module) and ConfigService(self.db).get(
            tenant_id,
            owning_module or "",
            "comments.attachments_enabled",
            default=False,
        )
        if not attachments_enabled:
            error = "Comment attachments are not enabled for this module"
            self._notify_attachment_failure(comment, tenant_id, user_id, error)
            return comment, "failed", error

        try:
            uploaded_file = await self.file_service.upload_file(
                file_content=file_content,
                filename=filename,
                entity_type="comment",
                entity_id=cast(UUID, comment.id),
                tenant_id=tenant_id,
                user_id=user_id,
            )
            self.repository.create_comment_attachment(
                {
                    "tenant_id": tenant_id,
                    "comment_id": comment.id,
                    "file_id": uploaded_file.id,
                }
            )
        except Exception as e:
            logger.error(f"Failed to attach file to comment {comment.id}: {e}")
            self._notify_attachment_failure(comment, tenant_id, user_id, str(e))
            return comment, "failed", str(e)

        return comment, "success", None

    def _notify_attachment_failure(
        self, comment: Comment, tenant_id: UUID, user_id: UUID, error: str
    ) -> None:
        """Best-effort notification to the comment's author on attachment
        failure — same in-process dispatch pattern already used for
        reply/mention notifications, gated the same way on notifications
        being enabled per-tenant. Genuinely best-effort: any failure here
        (including the registry itself not being ready, e.g. in a test
        context that never ran the app's real lifespan) must never affect
        the attachment-failure result already decided by the caller."""
        try:
            if not get_module_registry().is_module_enabled("notifications", tenant_id):
                return
            _dispatch_notification(
                self.notification_service,
                event_type="comment.attachment_failed",
                recipient_id=user_id,
                channels=COMMENT_NOTIFICATION_CHANNELS,
                data={
                    "comment_id": str(comment.id),
                    "entity_type": comment.entity_type,
                    "entity_id": str(comment.entity_id),
                    "nombre": _display_name(self.db, user_id),
                    "error": error,
                    "comment_excerpt": _excerpt(comment.content),
                },
                tenant_id=tenant_id,
            )
        except Exception as e:
            logger.error(f"Failed to send attachment-failure notification: {e}")

    def get_comment(self, comment_id: UUID, tenant_id: UUID) -> Comment | None:
        """Get comment by ID."""
        return self.repository.get_comment_by_id(comment_id, tenant_id)

    def get_comments_by_entity(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        include_deleted: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Comment]:
        """Get comments by entity."""
        return self.repository.get_comments_by_entity(
            entity_type, entity_id, tenant_id, include_deleted, skip, limit
        )

    def get_comment_thread(
        self,
        parent_id: UUID,
        tenant_id: UUID,
        include_deleted: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Comment]:
        """Get comment thread (replies), paginated."""
        return self.repository.get_comment_thread(
            parent_id, tenant_id, include_deleted, skip, limit
        )

    def update_comment(
        self,
        comment_id: UUID,
        tenant_id: UUID,
        comment_data: dict,
        edited_by: UUID | None = None,
    ) -> Comment | None:
        """Update comment.

        Snapshots the pre-edit content into comment_revisions (CMT-008)
        before overwriting it, when new content is actually provided —
        every edit produces exactly one new revision row, capturing what the
        comment said immediately before this edit.
        """
        comment = self.repository.get_comment_by_id(comment_id, tenant_id)
        if not comment:
            return None

        if "content" in comment_data and comment_data["content"] != comment.content:
            self.repository.create_comment_revision(
                {
                    "tenant_id": tenant_id,
                    "comment_id": comment.id,
                    "content": comment.content,
                    "edited_by": edited_by,
                }
            )

        update_data = {
            **comment_data,
            "is_edited": True,
            "edited_at": datetime.now(UTC),
        }

        updated_comment = self.repository.update_comment(comment, update_data)

        # Publish event
        from app.core.pubsub.event_helpers import safe_publish_event

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="comment.updated",
            entity_type="comment",
            entity_id=updated_comment.id,
            tenant_id=tenant_id,
            user_id=updated_comment.created_by,
            metadata=EventMetadata(
                source="comment_service",
                version="1.0",
                additional_data={
                    "entity_type": updated_comment.entity_type,
                    "entity_id": str(updated_comment.entity_id),
                },
            ),
        )

        return updated_comment

    def get_comment_revisions(
        self, comment_id: UUID, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[Any]:
        """List a comment's revision history (CMT-008). Access-gating
        (comments.manage only) is the router's responsibility, not the
        service's."""
        return self.repository.get_comment_revisions(comment_id, tenant_id, skip, limit)

    def delete_comment(self, comment_id: UUID, tenant_id: UUID) -> bool:
        """Delete comment (soft delete)."""
        comment = self.repository.get_comment_by_id(comment_id, tenant_id)
        if not comment:
            return False

        self.repository.delete_comment(comment)

        # Publish event
        from app.core.pubsub.event_helpers import safe_publish_event

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="comment.deleted",
            entity_type="comment",
            entity_id=comment.id,
            tenant_id=tenant_id,
            user_id=comment.created_by,
            metadata=EventMetadata(
                source="comment_service",
                version="1.0",
                additional_data={
                    "entity_type": comment.entity_type,
                    "entity_id": str(comment.entity_id),
                },
            ),
        )

        return True

    def add_attachment(
        self,
        comment_id: UUID,
        file_id: UUID,
        tenant_id: UUID,
    ) -> Any:
        """Add attachment to comment."""
        return self.repository.create_comment_attachment(
            {
                "tenant_id": tenant_id,
                "comment_id": comment_id,
                "file_id": file_id,
            }
        )

    def get_attachments(self, comment_id: UUID, tenant_id: UUID) -> list[Any]:
        """Get attachments for a comment."""
        return self.repository.get_attachments_by_comment(comment_id, tenant_id)

    def get_attachment(
        self, attachment_id: UUID, comment_id: UUID, tenant_id: UUID
    ) -> Any:
        """Get a single attachment, scoped to its comment and tenant."""
        return self.repository.get_attachment_by_id(
            attachment_id, comment_id, tenant_id
        )

    def delete_attachment(self, attachment: Any) -> None:
        """Delete an attachment. Authorization is the router's responsibility
        (author + edit/delete window, no comments.manage override — see
        DEC-005)."""
        self.repository.delete_comment_attachment(attachment)
