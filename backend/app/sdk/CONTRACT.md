# Contrato Público del AiutoX SDK 1.x

This document defines what is **guaranteed stable** in the SDK 1.x series and what
is internal and may change without notice.

---

## Guaranteed (stable for all of 1.x)

The following symbols are part of the public contract and will not be renamed,
removed, or have breaking signature changes without a MAJOR version bump:

### `aiutox_sdk.db`
- `Base` — SQLAlchemy declarative base shared by all modules
- `get_db` — FastAPI dependency that yields a `Session`
- `SessionLocal` — sessionmaker factory (for use outside FastAPI DI)

### `aiutox_sdk.exceptions`
- `APIException(code, message, status_code, details)` — base exception; NEVER raise HTTPException directly
- `BusinessRuleError(message)` — domain rule violation
- `raise_not_found(resource, resource_id)` → 404
- `raise_bad_request(message, code)` → 400
- `raise_unauthorized(code, message)` → 401
- `raise_forbidden(message, code)` → 403
- `raise_conflict(message, code)` → 409
- `raise_too_many_requests(message)` → 429
- `raise_internal_server_error(message)` → 500

### `aiutox_sdk.auth`
- `get_current_user` — FastAPI dependency; returns authenticated `User`
- `get_optional_user` — FastAPI dependency; returns `User | None`
- `require_permission(permission)` — FastAPI dependency factory
- `require_any_permission(*permissions)` — FastAPI dependency factory
- `require_roles(*roles)` — FastAPI dependency factory
- `verify_tenant_access(user, tenant_id)` — bool helper

### `aiutox_sdk.logging`
- `get_logger(name)` — returns a `logging.Logger` with structured config

### `aiutox_sdk.pubsub`
- `EventPublisher` — publish events to Redis Streams
- `EventConsumer` — consume events from Redis Streams
- `get_event_publisher()` — FastAPI dependency factory
- `Event`, `EventMetadata` — payload types
- `publish_fire_and_forget(coro, *, description="")` — run or schedule an event-publishing coroutine from sync code; never raises

### `aiutox_sdk.response`
- `StandardResponse[T]` — single-resource response wrapper
- `StandardListResponse[T]` — paginated list response wrapper
- `PaginationMeta` — pagination metadata schema

### `aiutox_sdk.tenancy`
- `verify_tenant_access(user, tenant_id)` — ensure user belongs to tenant

### `aiutox_sdk.config`
- `ConfigService` — access module-specific runtime configuration
- `get_settings()` — the process-wide settings object (cached)

### `aiutox_sdk.users`
- `User` — the user model, for type hints and `Depends(get_current_user)` annotations
- `Organization`, `OrganizationType` — the organization model and its type enum
- `Contact` — same object as `aiutox_sdk.contacts.Contact`

### `aiutox_sdk.contacts`
- `Contact`, `ContactMethod`, `OrganizationContact` — contact models and the organization-contact link
- `ContactMethodType`, `ContactEntityType` (alias `EntityType`), `OrgContactRole` — their enums

### `aiutox_sdk.permissions`
- `require_permission(permission)` — same as `aiutox_sdk.auth.require_permission`
- `require_any_permission(*permissions)` — same as `aiutox_sdk.auth.require_any_permission`
- `has_permission(user_permissions, required)` — programmatic check

### `aiutox_sdk.files`
- `EntityAccessResolver` — protocol: `can_access(db, entity_id, user_id, tenant_id, user_permissions, action) -> bool`
- `register_entity_access_resolver(entity_type, resolver)` — call from `ModuleInterface.on_load()` so files attached to your records (`File.entity_type == entity_type`) are accessible to whoever your resolver allows
- `File` — the file model; query it by `entity_type` and `entity_id` to find the files attached to one of your records
- `FileService(db, storage_backend=None, event_publisher=None, tenant_id=None)` — the core file service; pass `tenant_id` so it uses the tenant's storage configuration. `await upload_file(file_content, filename, entity_type, entity_id, tenant_id, user_id, ...)` attaches a file to a record, `await list_files(tenant_id, skip, limit, entity_type=..., entity_id=...)` lists them (both filters or neither) and returns `(files, total)`, and `await delete_file(file_id, tenant_id, user_id)` soft-deletes one

### `aiutox_sdk.async_tasks`
Periodic background work for a module, run by the core scheduler.
- `Task` — abstract base class; subclass it and implement `async execute(tenant_id, **kwargs) -> dict`. Its id is `"<module>.<name>"`
- `register_task(module, name, schedule, description=None, enabled=True)` — class decorator that registers one instance of the task when the module's package is imported. `schedule` is `{"type": "interval", "hours": N}` (or `"seconds": N`, which wins over `hours`) or `{"type": "once", "execute_at": "<ISO datetime>"}`; `"cron"` is accepted but not scheduled yet

The scheduler calls `execute()` once per tenant, for every tenant, including tenants where the module is disabled: check that in `execute()` when it matters. A plugin's tasks register when its entry point loads, after the scheduler started; a core that includes the late-registration fix (backend PR #22) schedules them as they register.

### `aiutox_sdk.notifications`
- `NotificationService(db, event_publisher=None)` — the core notification service. `await send(event_type, recipient_id, channels, data=None, tenant_id=...)` notifies one user: `tenant_id` is required, `channels` are channel names such as `"in-app"`, `"email"`, `"telegram"` or `"whatsapp"`, and `data` fills the template. It sends only over the channels the user's preferences accept, writes one `notification_queue` row per channel it sends (the history), and returns those rows as dicts

`send()` skips a channel that has no active template for that `event_type`, channel and tenant, and writes no queue row for it. Templates are per-tenant rows managed through the notification templates API; a module cannot seed them through the SDK yet. Declare the events a module sends with `ModuleInterface.get_notification_events()` and `aiutox_sdk.module_interface.NotificationEventDescriptor`, so they appear in the user's notification preferences.

### `aiutox_sdk.comments`
- `CommentService(db, file_service=None, notification_service=None, activity_service=None, event_publisher=None)` — the core comment service. `create_comment(comment_data, tenant_id, user_id)` takes a dict with `entity_type`, `entity_id`, `content` and optionally `parent_id`, and handles mentions, notifications, activity and events like the comments API does. `get_comments_by_entity(entity_type, entity_id, tenant_id, include_deleted=False, skip=0, limit=100)`, `get_comment(comment_id, tenant_id)`, `update_comment(comment_id, tenant_id, comment_data, edited_by=None)` and `delete_comment(comment_id, tenant_id)` (soft delete) cover the rest

`entity_type` is a free string (for example `"contratacion_solicitud"`): creating and listing comments needs no registration. Attachments on comments are the exception: they are allowed only for entity types mapped to a module in core's `COMMENT_ENTITY_TYPE_TO_MODULE` table whose `comments.attachments_enabled` setting is on, and that table cannot be extended from the SDK yet, so comment attachments are not available to plugin modules.

### `aiutox_sdk.integrations`
- `IntegrationService(db)` — the core integration service, scoped by tenant. `list_integrations(tenant_id, integration_type=None)` returns a list of dicts (`id`, `name`, `type`, `status`, `config`, `last_sync_at`, `error_message`, timestamps); with `page` and `limit` it returns `{"items": [...], "total": n}` instead. `get_integration(integration_id, tenant_id)` returns one such dict, and `get_credentials(integration_id, tenant_id, user_id=None)` the decrypted credentials (an audit entry is written when `user_id` is given). Both raise `ValueError` for an unknown id
- `IntegrationType`, `IntegrationStatus` — the integration type and status enums used by those methods
- `Integration`, `Webhook` — the ORM models
- `WebhookHandler` — dispatches a module's events to tenant webhooks
- `get_event_registry()`, `WebhookEventRegistry`, `ModuleEventRegistry`, `WebhookEvent`, `EventCategory` — declare the webhook events a module emits

Integrations belong to a tenant, not to a record: a module that keeps one integration per record stores the integration id on its own record. `IntegrationType` has no Google Drive or OneDrive value; such integrations use `IntegrationType.CUSTOM` and identify the provider in `config`.

### `aiutox_sdk.approvals`
- `ApprovalService(db, event_publisher=None, flow_runs_service=None)` — the core approval service. For a module's own records: `create_approval_request(request_data, tenant_id, user_id)` with a dict holding `flow_id`, `title` and optionally `description`, `entity_type`, `entity_id` and `metadata`; `get_or_create_request_by_entity(entity_type, entity_id, tenant_id, user_id, flow_id=None, title=None, description=None, auto_create=False)`; `get_entity_approval_status(entity_type, entity_id, tenant_id)` (the latest request as a dict, or `None`); and `approve_request` / `reject_request` / `cancel_request` to act on a request. Flows are managed with `create_approval_flow`, `get_approval_flows` and `add_approval_step`
- `ApprovalFlow`, `ApprovalStep` — the flow and step models

### `aiutox_sdk.catalogs`
- `require(db, tenant_id, list_key, code, current=None, field=None)` — validate a stored/incoming catalog code; raises `APIException` `CATALOG_CODE_INVALID` (422) unless the code is selectable or equals `current` (grandfathering); no-op when `code` is `None`
- `get_items(db, tenant_id, list_key)` — the selectable items of a list, resolved for the tenant
- `labels_for(db, tenant_id, list_key, codes, lang)` — display labels for stored codes, including hidden and deprecated ones

### `aiutox_sdk.module_interface`
- `ModuleInterface` — ABC every business module class must extend
- `ModuleNavigationItem` — navigation entry dataclass
- `CatalogDescriptor`, `CatalogItemDescriptor` — declaration of a module's option lists
- `load_catalog_declarations(path)` — load a module's `catalogs.yaml` into descriptors
- `ModuleInterface.get_catalogs()` — returns the module's catalog declarations (default `[]`)
- `ModuleInterface.is_critical` — class attribute (default `False`); a **core** module that sets it can never be disabled per tenant. It has no effect on business modules, which always remain tenant-disableable

### `aiutox_sdk.service_registry`
Typed contracts one module offers to others, so a business module never imports another. Billing is the first provider; finances and leases read it.
- `ChargeRecord` — frozen dataclass `(charge_id, amount, status, due_date)`; `status` is the charge status value (`"pending"`, `"partial"`, `"paid"`, `"overdue"`, `"cancelled"`)
- `PaymentRecord` — frozen dataclass `(payment_id, amount)`
- `BillingReader` — protocol: `charges_created_between(tenant_id, start, end)`, `payments_created_between(tenant_id, start, end)` (both bounds inclusive on `created_at`) and `get_annual_ipc_rate(tenant_id, year)` (the December IPC rate as `Decimal`, or `None`); every method is scoped to one tenant
- `register_billing_reader(factory)` — billing calls it when its package is imported; `factory(db)` returns a `BillingReader`, and registering again replaces it
- `get_billing_reader(db)` — a reader built on `db`, or `None` when billing is not registered
- `clear_billing_reader()` — tests only

The three functions are backed by the core store `app.core.service_registry` and need the AiutoX runtime (`HostRuntimeUnavailableError` outside it); importing the submodule never imports `app`.

---

## NOT Guaranteed (may change within 1.x)

- Private symbols prefixed with `_` (e.g., `_register_submodule`)
- Class internals: only method signatures are stable, not attributes
- Symbols not listed in each submodule's `__all__`
- Which of the two kinds below (owned or host-bound) a given name is — a name can
  move from host-bound to owned in a MINOR release without changing its import path
- `engine` from `aiutox_sdk.db` — prefer `get_db` over direct engine access

---

## Architecture

`aiutox_sdk` is a real, standalone Python package, not a layer over `app`.

- **Canonical package**: `backend/aiutox_sdk/`. It is the only place a public
  submodule is defined. `import aiutox_sdk` never imports the backend (`app`); CI
  enforces it (see below).
- **Distribution**: `backend/aiutox_sdk/pyproject.toml` builds the `aiutox-sdk`
  wheel (`cd backend && uv build aiutox_sdk --wheel --out-dir <dir>`). The wheel
  contains only `aiutox_sdk/` and depends on `fastapi`, `sqlalchemy`, `pydantic`
  and `pyyaml`. The backend wheel ships the same package, and in the monorepo the
  editable backend install makes `aiutox_sdk` importable.
- **Owned contracts**: defined in the SDK and re-exported by core (core imports
  them through re-export files, so there is exactly one definition). They work
  with no backend present: `module_interface` (`ModuleInterface`,
  `ModuleNavigationItem`, the catalog descriptors and `load_catalog_declarations`),
  `exceptions`, `response`, `files` (resolver protocol and registry), the Pub-Sub
  event models and error types, the license error types and the webhook event
  registry.
- **Host-bound names**: names implemented by the AiutoX core runtime (for example
  `get_db`, `EventPublisher`, `ConfigService`, `require_permission`). They resolve
  lazily on first access through `aiutox_sdk._lazy.lazy_exports`, so importing the
  SDK stays free of `app`. Inside the backend they are the identical core object;
  outside it, using one raises `HostRuntimeUnavailableError` (an `ImportError`
  subclass). The schemas and tiers surfaces stay host-bound because they expose
  ORM-backed enums. `files` mixes both: its resolver protocol and registry are
  owned, while `File` and `FileService` are host-bound.
- **`app.sdk.<name>` alias**: kept for compatibility. Each `app/sdk/<name>/` entry
  is the same module object as `aiutox_sdk.<name>`, so existing imports keep
  working. New code imports from `aiutox_sdk`. Aliases that have no
  `aiutox_sdk` counterpart (`insights`, `widgets`, `work_items`) are core-side only
  and are not part of the wheel.
- **Self-containment guard**: `cd backend && python scripts/check_sdk_imports.py
  --sdk-self-contained` fails on a module-level `import app` / `from app… import`
  inside `backend/aiutox_sdk/`. Function-scoped imports and imports under
  `if TYPE_CHECKING:` are allowed. It runs in the `plugin-gates` CI job, and
  `tests/sdk/test_sdk_surface.py` locks the public surface to
  `tests/sdk/sdk_surface_1x.json`.

### Adding a public submodule

1. Create `backend/aiutox_sdk/<name>.py`. Pure contracts (frozen dataclasses,
   Protocols) are defined there directly. Anything backed by core state either
   imports core inside the function body or goes through `lazy_exports`. Never a
   module-level `app` import: the CI guard and
   `test_sdk_package_has_no_module_level_app_import` fail on it.
2. Append `"<name>"` to `_SUBMODULES` in `backend/aiutox_sdk/__init__.py`.
3. Regenerate the snapshot with
   `cd backend && uv run python -m tests.sdk.surface_snapshot --write`. The diff
   must only add the new module key (additive, so a MINOR bump).
4. Add a section for it to this file.

No `app/sdk/<name>/` package is needed for a new submodule.

---

## How to Declare a Dependency on the SDK

In `module.meta.json` of each business module:

```json
{
  "sdk_version": ">=1.0.0 <2.0.0"
}
```

In `contracts.yaml`:

```yaml
sdk:
  version: ">=1.0.0 <2.0.0"
```

---

## Deprecation Policy

A symbol scheduled for removal in the next MAJOR version is marked with
`@deprecated(removed_in="2.0.0", replacement="...")` at least **6 months** before
the MAJOR release. Using a deprecated symbol emits a `DeprecationWarning` at
import time.

---

## Version: 1.0.0 | Date: 2026-04-16
