"""NotificationRoutingService — routes events to recipients and sends notifications.

Issue 011: Connects material_request.* events to the notification system.
Reads notification rules, resolves recipients by role, applies property overrides,
respects user preferences, deduplicates, and sends via NotificationService.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.notifications.rule_repository import NotificationRuleRepository
from app.core.notifications.service import NotificationService
from app.core.preferences.service import PreferencesService
from app.core.users.models import User, UserRole
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

# Fallback routing defaults per event (used when no template matches)
_FALLBACK_ROUTING: dict[str, dict[str, Any]] = {
    "maintenance.material_request.created": {
        "roles": ["property_manager", "property_supervisor"],
        "special": [],
        "channels": ["in-app", "email"],
    },
    "maintenance.material_request.approved": {
        "roles": ["inventory_manager"],
        "special": [],
        "channels": ["in-app", "email"],
    },
    "maintenance.material_request.rejected": {
        "roles": [],
        "special": ["requested_by"],
        "channels": ["in-app", "email"],
    },
    "maintenance.material_request.resolved": {
        "roles": ["property_manager"],
        "special": ["requested_by"],
        "channels": ["in-app", "email"],
    },
    "maintenance.material_request.fulfilled": {
        "roles": ["property_manager", "inventory_manager"],
        "special": ["requested_by"],
        "channels": ["in-app", "email"],
    },
}


class NotificationRoutingService:
    """Routes events to the correct recipients and sends notifications.

    Resolution order:
    1. Find matching notification rule template (wildcard priority)
    2. Check for property/building override
    3. Merge override + template → effective roles, users, channels
    4. Resolve roles → users in context (property-scoped or tenant-scoped)
    5. Add explicit users from template/override
    6. Handle special recipients (e.g., requested_by from event data)
    7. Deduplicate users
    8. Filter channels per user preferences
    9. Send notification per user
    """

    def __init__(
        self, db: Session, preferences_service: PreferencesService | None = None
    ):
        self.db = db
        self.rule_repo = NotificationRuleRepository(db)
        self.notification_service = NotificationService(db)
        self.preferences_service = preferences_service or PreferencesService(db)
        self.user_repo = UserRepository(db)

    async def route_and_send(
        self,
        event_type: str,
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
        data: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Main entry point: route an event and send notifications.

        Args:
            event_type: e.g. "maintenance.material_request.created"
            context_type: "property", "building", "tenant"
            context_id: ID of the context (property_id, building_id, tenant_id)
            tenant_id: Tenant ID for isolation
            data: Event payload (may contain requested_by, property_id, etc.)

        Returns:
            List of notification results
        """
        try:
            # Step 1: Find matching template
            effective = self.rule_repo.resolve_effective_rule(
                event_type=event_type,
                context_type=context_type,
                context_id=context_id,
                tenant_id=tenant_id,
            )

            # Step 2: If no template, use fallback
            if effective is None:
                effective = self._get_fallback_rule(event_type, data)
                if effective is None:
                    logger.warning(
                        f"No template or fallback for event {event_type}, skipping"
                    )
                    return []

            # Step 3: Resolve recipients
            recipients = self._resolve_recipients(
                effective=effective,
                context_type=context_type,
                context_id=context_id,
                tenant_id=tenant_id,
                data=data or {},
            )

            # Step 4: Deduplicate
            unique_recipients = self._deduplicate(recipients)

            # Step 5: Send notifications
            results = []
            for user in unique_recipients:
                try:
                    result = await self._send_to_user(
                        recipient_id=user.id,
                        event_type=event_type,
                        channels=effective.get("channels", ["in-app"]),
                        data=data,
                        tenant_id=tenant_id,
                    )
                    if result:
                        results.extend(result)
                except Exception as e:
                    logger.error(
                        f"Failed to send notification to user {user.id} "
                        f"for event {event_type}: {e}",
                        exc_info=True,
                    )

            return results

        except Exception as e:
            logger.error(
                f"Notification routing failed for event {event_type}: {e}",
                exc_info=True,
            )
            return []

    async def _send_to_user(
        self,
        recipient_id: UUID,
        event_type: str,
        channels: list[str],
        data: dict[str, Any] | None,
        tenant_id: UUID,
    ) -> list[dict[str, Any]] | None:
        """Send notification to a single user, respecting preferences."""
        # Check user preferences
        notification_prefs = self.preferences_service.get_preference(
            user_id=recipient_id,
            tenant_id=tenant_id,
            preference_type="notification",
            key=event_type,
            default={"enabled": True, "channels": channels},
        )

        if not notification_prefs.get("enabled", True):
            logger.info(
                f"Notifications disabled for user {recipient_id} and event {event_type}"
            )
            return None

        # Filter channels based on preferences
        preferred_channels = notification_prefs.get("channels", channels)
        channels_to_use = [ch for ch in channels if ch in preferred_channels]

        if not channels_to_use:
            logger.info(
                f"No matching channels for user {recipient_id} and event {event_type}"
            )
            return None

        return await self.notification_service.send(
            event_type=event_type,
            recipient_id=recipient_id,
            channels=channels_to_use,
            data=data,
            tenant_id=tenant_id,
        )

    def _get_fallback_rule(
        self, event_type: str, data: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        """Get fallback routing rule when no template matches.

        Strips the "maintenance." prefix for lookup if needed.
        """
        # Try exact match first
        if event_type in _FALLBACK_ROUTING:
            return dict(_FALLBACK_ROUTING[event_type])

        # Try without "maintenance." prefix
        stripped = event_type.replace("maintenance.", "", 1)
        full_key = f"maintenance.{stripped}"
        if full_key in _FALLBACK_ROUTING:
            return dict(_FALLBACK_ROUTING[full_key])

        return None

    def _get_fallback_recipients(self, event_type: str) -> dict[str, Any]:
        """Return fallback routing config for an event type (for testing)."""
        result = self._get_fallback_rule(event_type, None)
        if result is None:
            return {"roles": [], "special": [], "channels": ["in-app"]}
        return result

    def _resolve_recipients(
        self,
        effective: dict[str, Any],
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
        data: dict[str, Any],
    ) -> list[User]:
        """Resolve effective rule to a list of User objects."""
        recipients: list[User] = []

        # Resolve roles → users
        roles = effective.get("roles", [])
        if roles:
            role_users = self._find_users_by_roles(
                roles=roles,
                context_type=context_type,
                context_id=context_id,
                tenant_id=tenant_id,
            )
            recipients.extend(role_users)

        # Add explicit users from template/override
        explicit_users = effective.get("users", [])
        if explicit_users:
            for user_id_str in explicit_users:
                try:
                    user_id = UUID(str(user_id_str))
                    user = self.user_repo.get_by_id(user_id)
                    if user and user.tenant_id == tenant_id and user.is_active:
                        recipients.append(user)
                except (ValueError, TypeError):
                    continue

        # Handle special recipients (e.g., requested_by)
        special = effective.get("special", [])
        for special_key in special:
            if special_key == "requested_by":
                requested_by_str = data.get("requested_by")
                if requested_by_str:
                    try:
                        requested_by_id = UUID(str(requested_by_str))
                        user = self.user_repo.get_by_id(requested_by_id)
                        if user and user.tenant_id == tenant_id and user.is_active:
                            recipients.append(user)
                    except (ValueError, TypeError):
                        pass

        return recipients

    def _find_users_by_roles(
        self,
        roles: list[str],
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
    ) -> list[User]:
        """Find users with given roles, scoped to context.

        For "property" context: returns users with the role in the tenant
        (property scoping is handled at the application level via permissions).
        For "tenant" context: returns all users with the role in the tenant.
        """
        users = (
            self.db.query(User)
            .join(UserRole, User.id == UserRole.user_id)
            .filter(
                User.tenant_id == tenant_id,
                User.is_active.is_(True),
                UserRole.role.in_(roles),
            )
            .all()
        )
        return users

    def _deduplicate(self, users: list[User]) -> list[User]:
        """Remove duplicate users (same user with multiple roles)."""
        seen: set[UUID] = set()
        result: list[User] = []
        for user in users:
            if user.id not in seen:
                seen.add(user.id)
                result.append(user)
        return result
