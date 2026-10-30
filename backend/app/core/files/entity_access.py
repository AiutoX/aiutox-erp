"""Re-export. The canonical definitions live in aiutox_sdk.files (DEC-20261020-014).

`_RESOLVERS` is re-exported too: it is the registry dict itself, shared with the SDK.
"""

from aiutox_sdk.files import (
    _RESOLVERS,
    EntityAccessResolver,
    clear_entity_access_resolvers,
    get_entity_access_resolver,
    register_entity_access_resolver,
)

__all__ = [
    "_RESOLVERS",
    "EntityAccessResolver",
    "clear_entity_access_resolvers",
    "get_entity_access_resolver",
    "register_entity_access_resolver",
]
