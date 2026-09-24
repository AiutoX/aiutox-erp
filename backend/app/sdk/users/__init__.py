"""aiutox_sdk.users — public user surface (type-only).

Business modules must use this re-export instead of importing app.models.user
directly. Queries must go through get_current_user dependency — this shim
exposes the type, not repository access.
"""

from app.core.contacts.models import Contact
from app.core.users.models import User

__all__ = ["Contact", "User"]
