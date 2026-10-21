"""aiutox_sdk.files — entity-based access to files attached to a module's records.

A file uploaded with `entity_type`/`entity_id` belongs to the owning module's
record, not to the person who uploaded it. `files` answers "can this user
view/download/edit/delete it?" by asking the resolver registered for that
`entity_type`; with none registered, only `files.manage` holders and explicit
`FilePermission` rows grant access.

Modules, including externally installed plugins, register their resolver from
`ModuleInterface.on_load()`:

    from aiutox_sdk.files import register_entity_access_resolver

    def on_load(self) -> None:
        register_entity_access_resolver("my_record", MyRecordFileAccessResolver())
"""

from app.core.files.entity_access import (
    EntityAccessResolver,
    register_entity_access_resolver,
)

__all__ = [
    "EntityAccessResolver",
    "register_entity_access_resolver",
]
