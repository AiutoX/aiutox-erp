"""Comments module for comments and collaboration management."""

from app.core.comments.service import CommentService, MentionParser
from app.core.module_interface import ModuleInterface, NotificationEventDescriptor

__all__ = ["CommentService", "MentionParser", "CommentsModule"]


class CommentsModule(ModuleInterface):
    """ModuleInterface registration for comments.

    Comments' router is mounted directly in app/api/v1/lazy_router.py, not
    via get_router() here — that ModuleRegistry.get_routers() path is dead
    code (never called from app.main), so this class exists solely to make
    comments discoverable for self-registering hooks like
    get_notification_events(), not to change how its routes are served.
    """

    @property
    def module_id(self) -> str:
        return "comments"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_notification_events(self) -> list[NotificationEventDescriptor]:
        return [
            NotificationEventDescriptor(
                event_type="comment.replied",
                module="comments",
                label_key="comments.events.replied",
                default_channels=["in-app", "email"],
            ),
            NotificationEventDescriptor(
                event_type="comment.mentioned",
                module="comments",
                label_key="comments.events.mentioned",
                default_channels=["in-app", "email"],
            ),
        ]

    def get_settings_schema(self) -> list[dict]:
        return [
            {
                "key": "edit_delete_window_minutes",
                "label": "Ventana de edición/eliminación (minutos)",
                "type": "number",
                "default": None,
                "description": (
                    "Minutos tras publicar un comentario en los que su autor puede "
                    "editarlo o eliminarlo. Vacío o 0 = sin límite. No aplica a la "
                    "eliminación por moderación (comments.manage)."
                ),
                "min_value": 0,
            },
            {
                "key": "purge_after_days",
                "label": "Purgar comentarios eliminados tras (días)",
                "type": "number",
                "default": 90,
                "description": (
                    "Días desde la eliminación (soft delete) tras los cuales un "
                    "comentario se elimina definitivamente de la base de datos, "
                    "junto con sus menciones y adjuntos. Vacío o 0 = nunca purgar."
                ),
                "min_value": 0,
            },
        ]
