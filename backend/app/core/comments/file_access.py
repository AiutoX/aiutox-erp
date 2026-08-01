"""Registers `comments` as an entity access resolver for the `files` module.

Files attached to a comment (`File.entity_type == "comment"`, set by
`CommentService.create_comment_with_attachment`) inherit access from
whoever holds `comments.view` in the same tenant — comments RBAC is
permission-based, not per-object ownership like tasks, so there is no
finer-grained check to delegate to beyond confirming the comment itself
still exists in this tenant. See `app.core.files.entity_access` for the
resolver protocol this implements.
"""

from typing import TYPE_CHECKING
from uuid import UUID

from app.core.auth.permissions import has_permission
from app.core.comments.models import Comment
from app.core.comments.permissions import COMMENTS_VIEW

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class CommentFileAccessResolver:
    """Grants access to a comment-attached file to any comments.view holder,
    once the comment itself is confirmed to exist in the caller's tenant.

    Stateless — takes the caller's request-scoped `db` session as a
    parameter rather than holding one, since resolvers are registered once
    at application startup and must outlive any single request/session.
    """

    def can_access(
        self,
        db: "Session",
        entity_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        user_permissions: set[str],
        action: str,
    ) -> bool:
        comment = (
            db.query(Comment)
            .filter(Comment.id == entity_id, Comment.tenant_id == tenant_id)
            .first()
        )
        if comment is None:
            # Comment deleted or not found — fall back to explicit FilePermission.
            return False
        return has_permission(user_permissions, COMMENTS_VIEW)


def register_comments_file_access_resolver() -> None:
    """Register the comments resolver with `files`' entity_access registry."""
    from app.core.files.entity_access import register_entity_access_resolver

    register_entity_access_resolver("comment", CommentFileAccessResolver())
