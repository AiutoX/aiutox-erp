"""CapabilityResolver — RBAC filter for AI capability candidates."""

from app.core.auth.permissions import has_permission
from app.core.automation.ai.capability_decorator import CapabilityDescriptor


class CapabilityResolver:
    def filter(
        self,
        candidates: list[CapabilityDescriptor],
        user_permissions: set[str],
        *,
        max_candidates: int = 5,
    ) -> list[CapabilityDescriptor]:
        """Filter capabilities to those the user is authorized to invoke.

        Accepts a pre-resolved permission set (from get_user_permissions) to stay
        decoupled from SQLAlchemy sessions. The caller resolves permissions first.
        Returns at most max_candidates results.
        """
        authorized = [
            c
            for c in candidates
            if has_permission(user_permissions, c.permission_required)
        ]
        return authorized[:max_candidates]


capability_resolver = CapabilityResolver()
