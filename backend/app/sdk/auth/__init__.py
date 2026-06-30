"""aiutox_sdk.auth — re-exports of app.core.auth public surface.

Provides FastAPI dependencies for authentication and authorisation.
"""

from app.core.auth.dependencies import (
    get_current_user,
    get_optional_user,
    get_user_permissions,
    require_any_permission,
    require_permission,
    require_roles,
    verify_tenant_access,
)
from app.core.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.auth.models import ModuleRole
from app.core.auth.password import hash_password, verify_password
from app.core.auth.permissions import has_permission
from app.core.auth.rate_limit import (
    check_login_rate_limit,
    clear_successful_login,
    create_rate_limit_exception,
    get_rate_limit_exceeded_handler,
    limiter,
    record_login_attempt,
)

__all__ = [
    # FastAPI dependencies
    "get_current_user",
    "get_optional_user",
    "get_user_permissions",
    "require_permission",
    "require_any_permission",
    "require_roles",
    "verify_tenant_access",
    # JWT helpers
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    # Permissions
    "has_permission",
    # Auth models
    "ModuleRole",
    # Password helpers
    "hash_password",
    "verify_password",
    # Rate limit helpers
    "limiter",
    "check_login_rate_limit",
    "record_login_attempt",
    "clear_successful_login",
    "create_rate_limit_exception",
    "get_rate_limit_exceeded_handler",
]
