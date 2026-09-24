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

### `aiutox_sdk.response`
- `StandardResponse[T]` — single-resource response wrapper
- `StandardListResponse[T]` — paginated list response wrapper
- `PaginationMeta` — pagination metadata schema

### `aiutox_sdk.tenancy`
- `verify_tenant_access(user, tenant_id)` — ensure user belongs to tenant

### `aiutox_sdk.config`
- `ConfigService` — access module-specific runtime configuration

### `aiutox_sdk.permissions`
- `require_permission(permission)` — same as `aiutox_sdk.auth.require_permission`
- `require_any_permission(*permissions)` — same as `aiutox_sdk.auth.require_any_permission`
- `has_permission(user_permissions, required)` — programmatic check

### `aiutox_sdk.module_interface`
- `ModuleInterface` — ABC every business module class must extend
- `ModuleNavigationItem` — navigation entry dataclass

---

## NOT Guaranteed (may change within 1.x)

- Private symbols prefixed with `_` (e.g., `_register_submodule`)
- Class internals: only method signatures are stable, not attributes
- Symbols not listed in each submodule's `__all__`
- The shim mechanism (`backend/aiutox_sdk/`) — implementation detail only
- `engine` from `aiutox_sdk.db` — prefer `get_db` over direct engine access

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
