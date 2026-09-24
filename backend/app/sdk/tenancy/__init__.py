"""aiutox_sdk.tenancy — tenant isolation helpers.

In this codebase, tenant isolation is provided by the User model (every user
belongs to a tenant) and the verify_tenant_access helper. There is no standalone
TenantMixin — models declare tenant_id as a plain UUID column directly.

Usage in business modules:
    from aiutox_sdk.tenancy import verify_tenant_access
    from aiutox_sdk.auth import get_current_user

    @router.get("/items")
    def list_items(current_user = Depends(get_current_user), db = Depends(get_db)):
        tenant_id = current_user.tenant_id  # always filter by this
"""

from app.core.auth.dependencies import verify_tenant_access

__all__ = ["verify_tenant_access"]
