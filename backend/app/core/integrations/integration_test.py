"""Integration testing functionality for various integration types."""

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.integrations.models import IntegrationType

logger = logging.getLogger(__name__)


@dataclass
class IntegrationTestResult:
    """Result of an integration connection test."""

    success: bool
    message: str
    error: str | None = None
    details: dict[str, Any] | None = None


def run_rest_api_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test REST API integration by making a test request.

    Args:
        config: Dictionary containing REST API configuration:
            - url: API endpoint URL (required)
            - method: HTTP method (default: GET)
            - headers: Request headers (optional)
            - auth_type: Authentication type ('bearer', 'basic', 'api_key', None)
            - auth_token: Bearer token or API key (optional)
            - username: Basic auth username (optional)
            - password: Basic auth password (optional)
            - timeout: Request timeout in seconds (default: 10)

    Returns:
        IntegrationTestResult indicating success or failure and details.
    """
    url = config.get("url")
    if not url:
        return IntegrationTestResult(
            success=False,
            message="API URL is required",
            error="Missing url",
        )

    method = config.get("method", "GET").upper()
    timeout = config.get("timeout", 10)
    headers = config.get("headers", {})

    # Security: Validate timeout to prevent DoS
    if not isinstance(timeout, (int, float)) or timeout <= 0 or timeout > 60:
        timeout = 10  # Default safe timeout

    # Setup authentication
    auth_type = config.get("auth_type")
    if auth_type == "bearer":
        token = config.get("auth_token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
    elif auth_type == "basic":
        username = config.get("username")
        password = config.get("password")
        if username and password:
            import base64

            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {credentials}"
    elif auth_type == "api_key":
        api_key = config.get("auth_token")
        api_key_header = config.get("api_key_header", "X-API-Key")
        if api_key:
            headers[api_key_header] = api_key

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.request(method, url, headers=headers)

            if response.status_code < 400:
                return IntegrationTestResult(
                    success=True,
                    message=f"REST API connection test successful (status: {response.status_code})",
                    details={
                        "url": url,
                        "method": method,
                        "status_code": response.status_code,
                        "response_size": len(response.content),
                    },
                )
            else:
                return IntegrationTestResult(
                    success=False,
                    message=f"REST API returned error status: {response.status_code}",
                    error=f"HTTP {response.status_code}",
                    details={
                        "url": url,
                        "method": method,
                        "status_code": response.status_code,
                        "response_preview": (
                            response.text[:200] if response.text else None
                        ),
                    },
                )

    except httpx.TimeoutException:
        return IntegrationTestResult(
            success=False,
            message="REST API connection timed out",
            error=f"Timeout after {timeout} seconds",
            details={"url": url, "timeout": timeout},
        )
    except httpx.ConnectError as e:
        return IntegrationTestResult(
            success=False,
            message="Failed to connect to REST API endpoint",
            error=f"Connection error: {str(e)}",
            details={"url": url},
        )
    except Exception as e:
        logger.error(f"Unexpected error during REST API test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message="Unexpected error during REST API connection test",
            error=f"Unexpected error: {str(e)}",
            details={"url": url},
        )


def run_webhook_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test webhook integration by sending a test payload.

    Args:
        config: Dictionary containing webhook configuration:
            - url: Webhook URL (required)
            - method: HTTP method (default: POST)
            - headers: Request headers (optional)
            - secret: Webhook secret for signature (optional)
            - timeout: Request timeout in seconds (default: 10)

    Returns:
        IntegrationTestResult indicating success or failure and details.
    """
    url = config.get("url")
    if not url:
        return IntegrationTestResult(
            success=False,
            message="Webhook URL is required",
            error="Missing url",
        )

    method = config.get("method", "POST").upper()
    timeout = config.get("timeout", 10)
    headers = config.get("headers", {})
    headers.setdefault("Content-Type", "application/json")

    # Security: Validate timeout
    if not isinstance(timeout, (int, float)) or timeout <= 0 or timeout > 60:
        timeout = 10

    # Create test payload
    test_payload = {
        "test": True,
        "event": "integration_test",
        "timestamp": "2024-01-01T00:00:00Z",
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.request(method, url, json=test_payload, headers=headers)

            if response.status_code < 400:
                return IntegrationTestResult(
                    success=True,
                    message=f"Webhook connection test successful (status: {response.status_code})",
                    details={
                        "url": url,
                        "method": method,
                        "status_code": response.status_code,
                    },
                )
            else:
                return IntegrationTestResult(
                    success=False,
                    message=f"Webhook returned error status: {response.status_code}",
                    error=f"HTTP {response.status_code}",
                    details={
                        "url": url,
                        "method": method,
                        "status_code": response.status_code,
                    },
                )

    except httpx.TimeoutException:
        return IntegrationTestResult(
            success=False,
            message="Webhook connection timed out",
            error=f"Timeout after {timeout} seconds",
            details={"url": url, "timeout": timeout},
        )
    except httpx.ConnectError as e:
        return IntegrationTestResult(
            success=False,
            message="Failed to connect to webhook endpoint",
            error=f"Connection error: {str(e)}",
            details={"url": url},
        )
    except Exception as e:
        logger.error(f"Unexpected error during webhook test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message="Unexpected error during webhook connection test",
            error=f"Unexpected error: {str(e)}",
            details={"url": url},
        )


def run_slack_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Slack integration by probing the incoming-webhook URL's
    reachability — never a visible test post, mirroring
    run_mattermost_integration/run_rocketchat_integration.

    Args:
        config: Dictionary containing {"webhook_url": ...} — matches the
            field the frontend's "Configurar Slack" dialog actually submits
            (config.integrations.tsx's getConfigFields("slack")). Previously
            this type was routed to run_rest_api_integration(), which reads
            config["url"] instead — a field Slack's form never sends, so
            every Slack test always failed with "Missing url" regardless of
            whether the configured webhook was valid.

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    from app.core.notifications.providers.mattermost_provider import (
        verify_webhook_url,
    )

    webhook_url = config.get("webhook_url")
    if not webhook_url:
        return IntegrationTestResult(
            success=False,
            message="Webhook URL is required",
            error="Missing webhook_url",
        )

    if verify_webhook_url(webhook_url):
        return IntegrationTestResult(
            success=True,
            message="Slack webhook URL is reachable",
        )

    return IntegrationTestResult(
        success=False,
        message="Slack webhook URL is not reachable",
        error="Webhook unreachable",
    )


def run_zapier_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Zapier integration.

    Zapier's own "Configurar" dialog (config.integrations.tsx) only collects
    an api_key — Zapier has no single documented "verify this key" REST
    endpoint (Zap triggers/actions are per-Zap webhook URLs, not a shared
    account-level API). This performs the same non-empty/format check
    run_oauth_integration does for a bare token, rather than routing to
    run_rest_api_integration() (which reads config["url"], a field this
    form never sends — every Zapier test previously failed with "Missing
    url" regardless of whether the key was valid).

    Args:
        config: Dictionary containing {"api_key": ...}.

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    api_key = config.get("api_key")
    if not api_key:
        return IntegrationTestResult(
            success=False,
            message="API key is required",
            error="Missing api_key",
        )

    if len(api_key) < 10:
        return IntegrationTestResult(
            success=False,
            message="Zapier API key appears to be invalid (too short)",
            error="Invalid api_key format",
        )

    return IntegrationTestResult(
        success=True,
        message="Zapier API key format appears valid (no shared verification endpoint exists)",
    )


def run_stripe_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Stripe integration by calling the real Stripe API with the
    configured api_key.

    Args:
        config: Dictionary containing {"api_key": ...} — matches the field
            the frontend's "Configurar Stripe" dialog actually submits.
            Previously this type was routed to run_rest_api_integration(),
            which reads config["url"] instead — a field Stripe's form never
            sends, so every Stripe test always failed with "Missing url"
            regardless of whether the configured key was valid.

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    api_key = config.get("api_key")
    if not api_key:
        return IntegrationTestResult(
            success=False,
            message="API key is required",
            error="Missing api_key",
        )

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(
                "https://api.stripe.com/v1/balance",
                auth=(api_key, ""),
            )

        if response.status_code == 200:
            return IntegrationTestResult(
                success=True,
                message="Stripe API key verified successfully",
            )

        return IntegrationTestResult(
            success=False,
            message=f"Stripe API rejected the key (status: {response.status_code})",
            error=f"HTTP {response.status_code}",
        )

    except httpx.TimeoutException:
        return IntegrationTestResult(
            success=False,
            message="Stripe API connection timed out",
            error="Timeout",
        )
    except httpx.ConnectError as e:
        return IntegrationTestResult(
            success=False,
            message="Failed to connect to Stripe API",
            error=f"Connection error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error during Stripe API test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message="Unexpected error during Stripe API test",
            error=f"Unexpected error: {str(e)}",
        )


def run_twilio_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Twilio integration by calling the real Twilio Account API with
    the configured account_sid/auth_token.

    Args:
        config: Dictionary containing {"account_sid", "auth_token"} —
            matches the fields the frontend's "Configurar Twilio" dialog
            actually submits. Previously this type was routed to
            run_rest_api_integration(), which reads config["url"] instead —
            a field Twilio's form never sends, so every Twilio test always
            failed with "Missing url" regardless of whether the configured
            credentials were valid.

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    account_sid = config.get("account_sid")
    auth_token = config.get("auth_token")
    if not account_sid or not auth_token:
        return IntegrationTestResult(
            success=False,
            message="Account SID and auth token are required",
            error="Missing account_sid or auth_token",
        )

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                auth=(account_sid, auth_token),
            )

        if response.status_code == 200:
            return IntegrationTestResult(
                success=True,
                message="Twilio credentials verified successfully",
            )

        return IntegrationTestResult(
            success=False,
            message=f"Twilio API rejected the credentials (status: {response.status_code})",
            error=f"HTTP {response.status_code}",
        )

    except httpx.TimeoutException:
        return IntegrationTestResult(
            success=False,
            message="Twilio API connection timed out",
            error="Timeout",
        )
    except httpx.ConnectError as e:
        return IntegrationTestResult(
            success=False,
            message="Failed to connect to Twilio API",
            error=f"Connection error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error during Twilio API test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message="Unexpected error during Twilio API test",
            error=f"Unexpected error: {str(e)}",
        )


def run_oauth_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test OAuth integration by validating token.

    Args:
        config: Dictionary containing OAuth configuration:
            - token: OAuth access token (required)
            - token_type: Token type (default: Bearer)
            - validation_url: URL to validate token (optional)
            - client_id: OAuth client ID (optional, for refresh test)
            - client_secret: OAuth client secret (optional, for refresh test)
            - refresh_token: Refresh token (optional, for refresh test)

    Returns:
        IntegrationTestResult indicating success or failure and details.
    """
    token = config.get("token")
    if not token:
        return IntegrationTestResult(
            success=False,
            message="OAuth token is required",
            error="Missing token",
        )

    token_type = config.get("token_type", "Bearer")
    validation_url = config.get("validation_url")

    # If validation URL is provided, validate token
    if validation_url:
        try:
            timeout = config.get("timeout", 10)
            headers = {"Authorization": f"{token_type} {token}"}

            with httpx.Client(timeout=timeout) as client:
                response = client.get(validation_url, headers=headers)

                if response.status_code == 200:
                    return IntegrationTestResult(
                        success=True,
                        message="OAuth token validation successful",
                        details={
                            "token_type": token_type,
                            "validation_url": validation_url,
                            "status_code": response.status_code,
                        },
                    )
                else:
                    return IntegrationTestResult(
                        success=False,
                        message=f"OAuth token validation failed (status: {response.status_code})",
                        error=f"HTTP {response.status_code}",
                        details={
                            "token_type": token_type,
                            "validation_url": validation_url,
                            "status_code": response.status_code,
                        },
                    )

        except Exception as e:
            logger.error(f"Error during OAuth token validation: {e}", exc_info=True)
            return IntegrationTestResult(
                success=False,
                message="OAuth token validation error",
                error=f"Validation error: {str(e)}",
                details={"token_type": token_type, "validation_url": validation_url},
            )

    # If no validation URL, just check token format
    # Basic validation: token should not be empty
    if len(token) < 10:  # Minimum reasonable token length
        return IntegrationTestResult(
            success=False,
            message="OAuth token appears to be invalid (too short)",
            error="Invalid token format",
            details={"token_type": token_type},
        )

    return IntegrationTestResult(
        success=True,
        message="OAuth token format appears valid (no validation URL provided)",
        details={"token_type": token_type},
    )


def run_database_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test database integration by attempting connection.

    Args:
        config: Dictionary containing database configuration:
            - host: Database host (required)
            - port: Database port (required)
            - database: Database name (required)
            - username: Database username (required)
            - password: Database password (required)
            - db_type: Database type ('postgresql', 'mysql', 'mongodb', etc.)

    Returns:
        IntegrationTestResult indicating success or failure and details.
    """
    host = config.get("host")
    port = config.get("port")
    database = config.get("database")
    username = config.get("username")
    password = config.get("password")
    db_type = config.get("db_type", "postgresql").lower()

    if not all([host, port, database, username, password]):
        missing = [
            k
            for k, v in {
                "host": host,
                "port": port,
                "database": database,
                "username": username,
                "password": password,
            }.items()
            if not v
        ]
        return IntegrationTestResult(
            success=False,
            message=f"Database configuration incomplete. Missing: {', '.join(missing)}",
            error="Missing required fields",
        )

    try:
        if db_type == "postgresql":
            import psycopg2

            conn = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                connect_timeout=10,
            )
            conn.close()
            return IntegrationTestResult(
                success=True,
                message="PostgreSQL connection test successful",
                details={"host": host, "port": port, "database": database},
            )

        elif db_type == "mysql":
            import pymysql

            conn = pymysql.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                connect_timeout=10,
            )
            conn.close()
            return IntegrationTestResult(
                success=True,
                message="MySQL connection test successful",
                details={"host": host, "port": port, "database": database},
            )

        else:
            return IntegrationTestResult(
                success=False,
                message=f"Unsupported database type: {db_type}",
                error="Unsupported db_type",
                details={"db_type": db_type},
            )

    except ImportError as e:
        return IntegrationTestResult(
            success=False,
            message=f"Database driver not installed: {str(e)}",
            error="Missing driver",
            details={"db_type": db_type},
        )
    except Exception as e:
        logger.error(f"Error during database connection test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message=f"Database connection failed: {str(e)}",
            error=f"Connection error: {str(e)}",
            details={
                "host": host,
                "port": port,
                "database": database,
                "db_type": db_type,
            },
        )


def run_telegram_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Telegram integration by verifying the bot token via the Bot
    API's getMe endpoint.

    Args:
        config: Dictionary containing {"bot_token": ...} — the decrypted
            per-tenant credential, resolved by the caller via
            IntegrationService.get_telegram_credentials() (not
            integration.config, which never holds this value).

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    from app.core.notifications.providers.telegram_provider import verify_bot_token

    bot_token = config.get("bot_token")
    if not bot_token:
        return IntegrationTestResult(
            success=False,
            message="Bot token is required",
            error="Missing bot_token",
        )

    if verify_bot_token(bot_token):
        return IntegrationTestResult(
            success=True,
            message="Telegram bot token verified successfully",
        )

    return IntegrationTestResult(
        success=False,
        message="Telegram bot token verification failed",
        error="Invalid bot token",
    )


def run_whatsapp_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a WhatsApp (Evolution API) integration by checking the instance's
    connection state.

    Args:
        config: Dictionary containing {"api_url", "api_key", "instance_name"}
            — the decrypted per-tenant credentials, resolved by the caller
            via IntegrationService.get_whatsapp_credentials() (not
            integration.config, which never holds these values).

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    api_url = config.get("api_url")
    api_key = config.get("api_key")
    instance_name = config.get("instance_name")

    if not api_url or not api_key or not instance_name:
        return IntegrationTestResult(
            success=False,
            message="Evolution API configuration is incomplete",
            error="Missing api_url, api_key, or instance_name",
        )

    url = f"{api_url}/instance/connectionState/{instance_name}"
    headers = {"apikey": api_key}

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url, headers=headers)

        if response.status_code != 200:
            return IntegrationTestResult(
                success=False,
                message=f"Evolution API returned error status: {response.status_code}",
                error=f"HTTP {response.status_code}",
                details={
                    "instance_name": instance_name,
                    "status_code": response.status_code,
                },
            )

        state = response.json().get("instance", {}).get("state")
        if state == "open":
            return IntegrationTestResult(
                success=True,
                message="Evolution API instance is connected",
                details={"instance_name": instance_name, "state": state},
            )

        return IntegrationTestResult(
            success=False,
            message=f"Evolution API instance is not connected (state: {state})",
            error="Instance not connected",
            details={"instance_name": instance_name, "state": state},
        )

    except httpx.TimeoutException:
        return IntegrationTestResult(
            success=False,
            message="Evolution API connection test timed out",
            error="Timeout",
            details={"instance_name": instance_name},
        )
    except httpx.ConnectError as e:
        return IntegrationTestResult(
            success=False,
            message="Failed to connect to Evolution API",
            error=f"Connection error: {str(e)}",
            details={"instance_name": instance_name},
        )
    except Exception as e:
        logger.error(f"Unexpected error during Evolution API test: {e}", exc_info=True)
        return IntegrationTestResult(
            success=False,
            message="Unexpected error during Evolution API connection test",
            error=f"Unexpected error: {str(e)}",
            details={"instance_name": instance_name},
        )


def run_mattermost_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Mattermost integration by probing the incoming-webhook URL's
    reachability — never a visible test post, per the issue's explicit
    requirement to avoid surprising a real channel.

    Args:
        config: Dictionary containing {"webhook_url": ...} — the decrypted
            per-tenant credential, resolved by the caller via
            IntegrationService.get_mattermost_credentials() (not
            integration.config, which never holds this value).

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    from app.core.notifications.providers.mattermost_provider import (
        verify_webhook_url,
    )

    webhook_url = config.get("webhook_url")
    if not webhook_url:
        return IntegrationTestResult(
            success=False,
            message="Webhook URL is required",
            error="Missing webhook_url",
        )

    if verify_webhook_url(webhook_url):
        return IntegrationTestResult(
            success=True,
            message="Mattermost webhook URL is reachable",
        )

    return IntegrationTestResult(
        success=False,
        message="Mattermost webhook URL is not reachable",
        error="Webhook unreachable",
    )


def run_rocketchat_integration(config: dict[str, Any]) -> IntegrationTestResult:
    """
    Test a Rocket.Chat integration by probing the incoming-webhook URL's
    reachability — never a visible test post, per the issue's explicit
    requirement to avoid surprising a real channel.

    Args:
        config: Dictionary containing {"webhook_url": ...} — the decrypted
            per-tenant credential, resolved by the caller via
            IntegrationService.get_rocketchat_credentials() (not
            integration.config, which never holds this value).

    Returns:
        IntegrationTestResult indicating success or failure.
    """
    from app.core.notifications.providers.rocketchat_provider import (
        verify_webhook_url,
    )

    webhook_url = config.get("webhook_url")
    if not webhook_url:
        return IntegrationTestResult(
            success=False,
            message="Webhook URL is required",
            error="Missing webhook_url",
        )

    if verify_webhook_url(webhook_url):
        return IntegrationTestResult(
            success=True,
            message="Rocket.Chat webhook URL is reachable",
        )

    return IntegrationTestResult(
        success=False,
        message="Rocket.Chat webhook URL is not reachable",
        error="Webhook unreachable",
    )


def run_integration(
    integration_type: IntegrationType, config: dict[str, Any]
) -> IntegrationTestResult:
    """
    Test an integration based on its type.

    Args:
        integration_type: Type of integration to test
        config: Integration configuration dictionary

    Returns:
        IntegrationTestResult indicating success or failure and details.
    """
    if integration_type == IntegrationType.WEBHOOK:
        return run_webhook_integration(config)

    elif integration_type == IntegrationType.STRIPE:
        return run_stripe_integration(config)

    elif integration_type == IntegrationType.TWILIO:
        return run_twilio_integration(config)

    elif integration_type == IntegrationType.SLACK:
        return run_slack_integration(config)

    elif integration_type == IntegrationType.ZAPIER:
        return run_zapier_integration(config)

    elif integration_type == IntegrationType.CUSTOM:
        # Generic REST API integration — the only type with an arbitrary,
        # user-supplied "url" field in its config.
        return run_rest_api_integration(config)

    elif integration_type == IntegrationType.GOOGLE_CALENDAR:
        # Google Calendar uses OAuth
        return run_oauth_integration(config)

    elif integration_type == IntegrationType.TELEGRAM:
        return run_telegram_integration(config)

    elif integration_type == IntegrationType.WHATSAPP:
        return run_whatsapp_integration(config)

    elif integration_type == IntegrationType.MATTERMOST:
        return run_mattermost_integration(config)

    elif integration_type == IntegrationType.ROCKETCHAT:
        return run_rocketchat_integration(config)

    else:
        return IntegrationTestResult(
            success=False,
            message=f"Unsupported integration type: {integration_type}",
            error="Unsupported type",
            details={"type": integration_type.value},
        )
