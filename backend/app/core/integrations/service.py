"""Integration service for managing third-party integrations."""

import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.integrations.models import IntegrationStatus, IntegrationType
from app.core.logging import create_audit_log_entry
from app.repositories.integration_repository import IntegrationRepository


class IntegrationService:
    """Service for managing integrations."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.repository = IntegrationRepository(db)

    @staticmethod
    def _ensure_config_is_dict(config: Any) -> dict[str, Any]:
        """Ensure config is a dict, handling JSON strings."""
        if config is None:
            return {}
        if isinstance(config, dict):
            return config
        if isinstance(config, str):
            try:
                return json.loads(config)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def get_integration(self, integration_id: UUID, tenant_id: UUID) -> dict[str, Any]:
        """Get integration by ID."""
        integration = self.repository.get_by_id(integration_id, tenant_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")

        config = self._ensure_config_is_dict(integration.config)

        return {
            "id": integration.id,
            "tenant_id": integration.tenant_id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
            "config": config,
            "last_sync_at": integration.last_sync_at,
            "error_message": integration.error_message,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }

    def list_integrations(
        self,
        tenant_id: UUID,
        integration_type: IntegrationType | None = None,
        page: int | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        """List integrations for a tenant, with optional pagination.

        Args:
            tenant_id: Tenant ID
            integration_type: Optional filter by integration type
            page: Optional page number for pagination
            limit: Optional limit per page for pagination

        Returns:
            If page and limit are provided: dict with 'items' and 'total'
            Otherwise: list of integration dicts
        """
        if page is not None and limit is not None:
            result = self.repository.get_all_paginated(
                tenant_id=tenant_id,
                integration_type=integration_type,
                page=page,
                limit=limit,
            )
            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"get_all_paginated result type: {type(result)}, value: {result}"
            )

            items_list = []
            for idx, i in enumerate(result["items"]):
                try:
                    item_dict = {
                        "id": i.id,
                        "tenant_id": i.tenant_id,
                        "name": i.name,
                        "type": i.type,
                        "status": i.status,
                        "config": self._ensure_config_is_dict(i.config),
                        "last_sync_at": i.last_sync_at,
                        "error_message": i.error_message,
                        "created_at": i.created_at,
                        "updated_at": i.updated_at,
                    }
                    items_list.append(item_dict)
                except Exception as e:
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.error(
                        f"Error converting integration {idx} to dict: {e}",
                        exc_info=True,
                    )
                    logger.error(f"Integration object: {i}, type: {type(i)}")
                    logger.error(
                        f"Integration config: {i.config}, type: {type(i.config)}"
                    )
                    raise
            return_value = {
                "items": items_list,
                "total": result["total"],
            }
            logger.info(
                f"list_integrations return value type: {type(return_value)}, value: {return_value}"
            )
            return return_value
        else:
            integrations = self.repository.get_all(tenant_id, integration_type)
            return [
                {
                    "id": i.id,
                    "tenant_id": i.tenant_id,
                    "name": i.name,
                    "type": i.type,
                    "status": i.status,
                    "config": self._ensure_config_is_dict(i.config),
                    "last_sync_at": i.last_sync_at,
                    "error_message": i.error_message,
                    "created_at": i.created_at,
                    "updated_at": i.updated_at,
                }
                for i in integrations
            ]

    def _redirect_secrets_to_credentials(
        self, integration_type: IntegrationType, tenant_id: UUID, config: dict[str, Any]
    ) -> dict[str, Any]:
        """Route secret-bearing fields to the encrypted credentials column,
        returning the remaining config with those fields stripped.

        Shared by create_integration() and activate_integration() — both
        paths accept a raw config dict from the frontend's generic
        create/activate flow, and both must never let a channel secret
        (bot_token, api_key, webhook_url) land in the plaintext config
        column. Found and fixed during MSG-005 manual E2E verification:
        this redirect previously existed only in activate_integration(),
        so a first-time "Configure" from the Available tab (which calls
        create_integration()) silently stored secrets in plaintext for
        every channel type (Telegram, WhatsApp, Mattermost, Rocket.Chat).
        """
        if integration_type == IntegrationType.TELEGRAM and "bot_token" in config:
            self.upsert_telegram_credentials(
                tenant_id=tenant_id,
                bot_token=config["bot_token"],
                webhook_secret=config.get("webhook_secret", ""),
            )
            return {
                k: v
                for k, v in config.items()
                if k not in ("bot_token", "webhook_secret")
            }
        if integration_type == IntegrationType.WHATSAPP and "api_key" in config:
            self.upsert_whatsapp_credentials(
                tenant_id=tenant_id,
                api_url=config.get("api_url", ""),
                api_key=config["api_key"],
                instance_name=config.get("instance_name", ""),
            )
            return {
                k: v
                for k, v in config.items()
                if k not in ("api_url", "api_key", "instance_name")
            }
        if integration_type == IntegrationType.MATTERMOST and "webhook_url" in config:
            self.upsert_mattermost_credentials(
                tenant_id=tenant_id,
                webhook_url=config["webhook_url"],
                channel=config.get("channel"),
                username=config.get("username"),
                icon_url=config.get("icon_url"),
            )
            return {
                k: v
                for k, v in config.items()
                if k not in ("webhook_url", "channel", "username", "icon_url")
            }
        if integration_type == IntegrationType.ROCKETCHAT and "webhook_url" in config:
            self.upsert_rocketchat_credentials(
                tenant_id=tenant_id,
                webhook_url=config["webhook_url"],
                channel=config.get("channel"),
                alias=config.get("alias"),
                avatar=config.get("avatar"),
            )
            return {
                k: v
                for k, v in config.items()
                if k not in ("webhook_url", "channel", "alias", "avatar")
            }
        return config

    def create_integration(
        self,
        tenant_id: UUID,
        name: str,
        type: IntegrationType,
        config: dict[str, Any],
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Create a new integration.

        Secret-bearing config fields are redirected to encrypted
        credentials before the row is written — see
        _redirect_secrets_to_credentials.
        """
        config = self._redirect_secrets_to_credentials(type, tenant_id, config)

        # _redirect_secrets_to_credentials may have already created/updated
        # this tenant's row for `type` via upsert_credentials (e.g. WhatsApp
        # api_key). Reuse that row instead of inserting a second one, since
        # there is no DB-level unique constraint on (tenant_id, type) and
        # get_by_type()/get_integration() would otherwise return whichever
        # duplicate the query planner happens to pick.
        integration = self.repository.get_by_type(tenant_id, type)
        if integration is not None:
            integration.name = name
            integration.config = config
            self.db.commit()
            self.db.refresh(integration)
        else:
            integration = self.repository.create(
                tenant_id=tenant_id,
                name=name,
                type=type,
                config=config,
                status=IntegrationStatus.INACTIVE,
            )

        # Create audit log
        if user_id:
            create_audit_log_entry(
                db=self.db,
                user_id=user_id,
                tenant_id=tenant_id,
                action="create_integration",
                resource_type="integration",
                resource_id=UUID(str(integration.id)),
                details={"name": name, "type": type.value},
            )

        return {
            "id": integration.id,
            "tenant_id": integration.tenant_id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
            "config": self._ensure_config_is_dict(integration.config),
            "last_sync_at": integration.last_sync_at,
            "error_message": integration.error_message,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }

    def upsert_telegram_credentials(
        self, tenant_id: UUID, bot_token: str, webhook_secret: str
    ) -> None:
        """Store (or replace) a tenant's Telegram bot_token + webhook_secret.

        Encrypts {"bot_token", "webhook_secret"} as one JSON blob via
        encrypt_credentials, matching the pattern already used for
        Integration.credentials elsewhere (integrations/service.py's
        get_credentials read path). This is the minimal per-tenant storage
        MSG-002 needs so the Telegram webhook can resolve a tenant's secret
        from its own Integration row instead of one global setting — the
        admin UI / test_integration dispatch for this remain MSG-003's
        scope.
        """
        from app.core.security.encryption import encrypt_credentials

        payload = json.dumps({"bot_token": bot_token, "webhook_secret": webhook_secret})
        encrypted = encrypt_credentials(payload, tenant_id)

        self.repository.upsert_credentials(
            tenant_id=tenant_id,
            type=IntegrationType.TELEGRAM,
            name="Telegram",
            encrypted_credentials=encrypted,
        )

    def get_telegram_credentials(self, tenant_id: UUID) -> dict[str, Any] | None:
        """Return a tenant's decrypted {"bot_token", "webhook_secret"}, or
        None if the tenant has no Telegram integration configured yet."""
        from app.core.security.encryption import decrypt_credentials

        integration = self.repository.get_by_type(tenant_id, IntegrationType.TELEGRAM)
        if integration is None or not integration.credentials:
            return None

        try:
            decrypted_json = decrypt_credentials(integration.credentials, tenant_id)
            return json.loads(decrypted_json)
        except (ValueError, json.JSONDecodeError):
            return None

    def upsert_whatsapp_credentials(
        self,
        tenant_id: UUID,
        api_url: str,
        api_key: str,
        instance_name: str,
        webhook_secret: str | None = None,
    ) -> None:
        """Store (or replace) a tenant's Evolution API credentials.

        Mirrors upsert_telegram_credentials's encrypted, tenant-scoped
        storage pattern. Evolution API has no shared-secret/HMAC concept
        for its outbound webhooks, so webhook_secret is a random token we
        generate ourselves and embed in the tenant's inbound webhook URL
        path — the only channel Evolution API actually respects.
        """
        import secrets

        from app.core.security.encryption import encrypt_credentials

        if not webhook_secret:
            existing = self.get_whatsapp_credentials(tenant_id)
            webhook_secret = (existing or {}).get(
                "webhook_secret"
            ) or secrets.token_urlsafe(32)

        payload = json.dumps(
            {
                "api_url": api_url,
                "api_key": api_key,
                "instance_name": instance_name,
                "webhook_secret": webhook_secret,
            }
        )
        encrypted = encrypt_credentials(payload, tenant_id)

        self.repository.upsert_credentials(
            tenant_id=tenant_id,
            type=IntegrationType.WHATSAPP,
            name="WhatsApp",
            encrypted_credentials=encrypted,
        )

    def get_whatsapp_credentials(self, tenant_id: UUID) -> dict[str, Any] | None:
        """Return a tenant's decrypted {"api_url", "api_key",
        "instance_name", "webhook_secret"}, or None if the tenant has no
        WhatsApp integration configured yet."""
        from app.core.security.encryption import decrypt_credentials

        integration = self.repository.get_by_type(tenant_id, IntegrationType.WHATSAPP)
        if integration is None or not integration.credentials:
            return None

        try:
            decrypted_json = decrypt_credentials(integration.credentials, tenant_id)
            return json.loads(decrypted_json)
        except (ValueError, json.JSONDecodeError):
            return None

    def upsert_mattermost_credentials(
        self,
        tenant_id: UUID,
        webhook_url: str,
        channel: str | None = None,
        username: str | None = None,
        icon_url: str | None = None,
    ) -> None:
        """Store (or replace) a tenant's Mattermost incoming-webhook URL and
        optional overrides. Mirrors upsert_telegram_credentials's encrypted,
        tenant-scoped storage pattern — the webhook_url itself is the bearer
        credential, there is no separate bot/OAuth token for this channel.
        """
        from app.core.security.encryption import encrypt_credentials

        payload = json.dumps(
            {
                "webhook_url": webhook_url,
                "channel": channel,
                "username": username,
                "icon_url": icon_url,
            }
        )
        encrypted = encrypt_credentials(payload, tenant_id)

        self.repository.upsert_credentials(
            tenant_id=tenant_id,
            type=IntegrationType.MATTERMOST,
            name="Mattermost",
            encrypted_credentials=encrypted,
        )

    def get_mattermost_credentials(self, tenant_id: UUID) -> dict[str, Any] | None:
        """Return a tenant's decrypted {"webhook_url", "channel", "username",
        "icon_url"}, or None if the tenant has no Mattermost integration
        configured yet."""
        from app.core.security.encryption import decrypt_credentials

        integration = self.repository.get_by_type(tenant_id, IntegrationType.MATTERMOST)
        if integration is None or not integration.credentials:
            return None

        try:
            decrypted_json = decrypt_credentials(integration.credentials, tenant_id)
            return json.loads(decrypted_json)
        except (ValueError, json.JSONDecodeError):
            return None

    def upsert_rocketchat_credentials(
        self,
        tenant_id: UUID,
        webhook_url: str,
        channel: str | None = None,
        alias: str | None = None,
        avatar: str | None = None,
    ) -> None:
        """Store (or replace) a tenant's Rocket.Chat incoming-webhook URL and
        optional overrides. Mirrors upsert_mattermost_credentials's pattern —
        field names differ (alias/avatar instead of username/icon_url) per
        Rocket.Chat's own convention.
        """
        from app.core.security.encryption import encrypt_credentials

        payload = json.dumps(
            {
                "webhook_url": webhook_url,
                "channel": channel,
                "alias": alias,
                "avatar": avatar,
            }
        )
        encrypted = encrypt_credentials(payload, tenant_id)

        self.repository.upsert_credentials(
            tenant_id=tenant_id,
            type=IntegrationType.ROCKETCHAT,
            name="Rocket.Chat",
            encrypted_credentials=encrypted,
        )

    def get_rocketchat_credentials(self, tenant_id: UUID) -> dict[str, Any] | None:
        """Return a tenant's decrypted {"webhook_url", "channel", "alias",
        "avatar"}, or None if the tenant has no Rocket.Chat integration
        configured yet."""
        from app.core.security.encryption import decrypt_credentials

        integration = self.repository.get_by_type(tenant_id, IntegrationType.ROCKETCHAT)
        if integration is None or not integration.credentials:
            return None

        try:
            decrypted_json = decrypt_credentials(integration.credentials, tenant_id)
            return json.loads(decrypted_json)
        except (ValueError, json.JSONDecodeError):
            return None

    def update_integration(
        self,
        integration_id: UUID,
        tenant_id: UUID,
        name: str | None = None,
        config: dict[str, Any] | None = None,
        status: IntegrationStatus | None = None,
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Update an integration."""
        integration = self.repository.update(
            integration_id=integration_id,
            tenant_id=tenant_id,
            name=name,
            config=config,
            status=status,
        )

        # Create audit log
        if user_id:
            create_audit_log_entry(
                db=self.db,
                user_id=user_id,
                tenant_id=tenant_id,
                action="update_integration",
                resource_type="integration",
                resource_id=UUID(str(integration.id)),
                details={"name": name, "status": status.value if status else None},
            )

        return {
            "id": integration.id,
            "tenant_id": integration.tenant_id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
            "config": integration.config,
            "last_sync_at": integration.last_sync_at,
            "error_message": integration.error_message,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }

    def activate_integration(
        self,
        integration_id: UUID,
        tenant_id: UUID,
        config: dict[str, Any],
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Activate an integration with configuration.

        Secret-bearing config fields are redirected to encrypted
        credentials before the row is updated — see
        _redirect_secrets_to_credentials.
        """
        existing = self.repository.get_by_id(integration_id, tenant_id)
        if existing:
            config = self._redirect_secrets_to_credentials(
                IntegrationType(existing.type), tenant_id, config
            )

        integration = self.repository.update(
            integration_id=integration_id,
            tenant_id=tenant_id,
            config=config,
            status=IntegrationStatus.ACTIVE,
            error_message=None,
        )

        # Create audit log
        if user_id:
            create_audit_log_entry(
                db=self.db,
                user_id=user_id,
                tenant_id=tenant_id,
                action="activate_integration",
                resource_type="integration",
                resource_id=UUID(str(integration.id)),
                details={"name": integration.name, "type": integration.type},
            )

        return {
            "id": integration.id,
            "tenant_id": integration.tenant_id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
            "config": integration.config,
            "last_sync_at": integration.last_sync_at,
            "error_message": integration.error_message,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }

    def deactivate_integration(
        self, integration_id: UUID, tenant_id: UUID, user_id: UUID | None = None
    ) -> dict[str, Any]:
        """Deactivate an integration."""
        integration = self.repository.update(
            integration_id=integration_id,
            tenant_id=tenant_id,
            status=IntegrationStatus.INACTIVE,
        )

        # Create audit log
        if user_id:
            create_audit_log_entry(
                db=self.db,
                user_id=user_id,
                tenant_id=tenant_id,
                action="deactivate_integration",
                resource_type="integration",
                resource_id=UUID(str(integration.id)),
                details={"name": integration.name, "type": integration.type},
            )

        return {
            "id": integration.id,
            "tenant_id": integration.tenant_id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
            "config": integration.config,
            "last_sync_at": integration.last_sync_at,
            "error_message": integration.error_message,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        }

    def delete_integration(
        self, integration_id: UUID, tenant_id: UUID, user_id: UUID | None = None
    ) -> None:
        """Delete an integration."""
        integration = self.repository.get_by_id(integration_id, tenant_id)
        if integration:
            # Create audit log before deletion
            if user_id:
                create_audit_log_entry(
                    db=self.db,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    action="delete_integration",
                    resource_type="integration",
                    resource_id=UUID(str(integration.id)),
                    details={"name": integration.name, "type": integration.type},
                )

            self.repository.delete(integration_id, tenant_id)

    def test_integration(self, integration_id: UUID, tenant_id: UUID) -> dict[str, Any]:
        """Test an integration connection."""
        from app.core.integrations.integration_test import (
            IntegrationTestResult,
            run_integration,
        )

        integration = self.repository.get_by_id(integration_id, tenant_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")

        # Test the integration based on its type
        try:
            integration_type = IntegrationType(integration.type)
            if integration_type == IntegrationType.TELEGRAM:
                # Telegram's bot_token lives in the encrypted credentials
                # column, not the plaintext config column — resolve it
                # separately rather than reading integration.config.
                telegram_credentials = self.get_telegram_credentials(tenant_id)
                config_dict = (
                    {"bot_token": telegram_credentials["bot_token"]}
                    if telegram_credentials and telegram_credentials.get("bot_token")
                    else {}
                )
            elif integration_type == IntegrationType.WHATSAPP:
                # WhatsApp's api_url/api_key/instance_name live in the
                # encrypted credentials column, not the plaintext config
                # column — resolve separately, mirroring Telegram.
                whatsapp_credentials = self.get_whatsapp_credentials(tenant_id)
                config_dict = (
                    {
                        "api_url": whatsapp_credentials["api_url"],
                        "api_key": whatsapp_credentials["api_key"],
                        "instance_name": whatsapp_credentials["instance_name"],
                    }
                    if whatsapp_credentials and whatsapp_credentials.get("api_key")
                    else {}
                )
            elif integration_type == IntegrationType.MATTERMOST:
                # Mattermost's webhook_url lives in the encrypted credentials
                # column, not the plaintext config column.
                mattermost_credentials = self.get_mattermost_credentials(tenant_id)
                config_dict = (
                    {"webhook_url": mattermost_credentials["webhook_url"]}
                    if mattermost_credentials
                    and mattermost_credentials.get("webhook_url")
                    else {}
                )
            elif integration_type == IntegrationType.ROCKETCHAT:
                # Rocket.Chat's webhook_url lives in the encrypted credentials
                # column, not the plaintext config column.
                rocketchat_credentials = self.get_rocketchat_credentials(tenant_id)
                config_dict = (
                    {"webhook_url": rocketchat_credentials["webhook_url"]}
                    if rocketchat_credentials
                    and rocketchat_credentials.get("webhook_url")
                    else {}
                )
            else:
                config_dict = (
                    integration.config if isinstance(integration.config, dict) else {}
                )
            test_result: IntegrationTestResult = run_integration(
                integration_type, config_dict
            )

            # Update integration status based on test result
            if test_result.success:
                self.repository.update(
                    integration_id=integration_id,
                    tenant_id=tenant_id,
                    status=IntegrationStatus.ACTIVE,
                    error_message=None,
                )
            else:
                self.repository.update(
                    integration_id=integration_id,
                    tenant_id=tenant_id,
                    status=IntegrationStatus.ERROR,
                    error_message=test_result.error or test_result.message,
                )

            return {
                "success": test_result.success,
                "message": test_result.message,
                "details": test_result.details or {},
                "error": test_result.error,
            }

        except ValueError as e:
            # Invalid integration type
            error_msg = f"Invalid integration type: {integration.type}"
            self.repository.update(
                integration_id=integration_id,
                tenant_id=tenant_id,
                status=IntegrationStatus.ERROR,
                error_message=error_msg,
            )
            return {
                "success": False,
                "message": error_msg,
                "details": {"type": integration.type},
                "error": str(e),
            }
        except Exception as e:
            # Unexpected error
            error_msg = f"Integration test failed: {str(e)}"
            self.repository.update(
                integration_id=integration_id,
                tenant_id=tenant_id,
                status=IntegrationStatus.ERROR,
                error_message=error_msg,
            )
            return {
                "success": False,
                "message": error_msg,
                "details": {"type": integration.type},
                "error": str(e),
            }

    def get_credentials(
        self, integration_id: UUID, tenant_id: UUID, user_id: UUID | None = None
    ) -> dict[str, Any]:
        """Get decrypted credentials for an integration.

        Security:
        - Credentials are decrypted using tenant-specific key
        - Access is logged for audit purposes
        - Returns empty dict if no credentials found
        - Handles decryption errors gracefully

        Args:
            integration_id: Integration UUID
            tenant_id: Tenant UUID
            user_id: User requesting credentials (for audit)

        Returns:
            Dictionary with decrypted credentials

        Raises:
            ValueError: If integration not found
        """
        import json

        from app.core.security.encryption import decrypt_credentials

        integration = self.repository.get_by_id(integration_id, tenant_id)
        if not integration:
            raise ValueError(f"Integration not found: {integration_id}")

        credentials_dict: dict[str, Any] = {}

        # Try to get credentials from credentials column first (new method)
        if integration.credentials:
            try:
                decrypted_json = decrypt_credentials(integration.credentials, tenant_id)
                credentials_dict = json.loads(decrypted_json)
            except (ValueError, json.JSONDecodeError):
                # If decryption fails, fall back to config or return empty
                pass

        # Fallback to config.credentials (backward compatibility)
        if not credentials_dict and isinstance(integration.config, dict):
            credentials_dict = integration.config.get("credentials", {})
            if not isinstance(credentials_dict, dict):
                credentials_dict = {}

        # Create audit log entry
        if user_id:
            create_audit_log_entry(
                db=self.db,
                user_id=user_id,
                tenant_id=tenant_id,
                action="view_credentials",
                resource_type="integration",
                resource_id=UUID(str(integration.id)),
                details={
                    "name": integration.name,
                    "type": integration.type,
                    # DO NOT include credentials in audit log
                },
            )

        return credentials_dict
