# AiutoX SDK — CHANGELOG

All notable changes to the SDK public surface are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [SemVer](https://semver.org/).

---

## [Unreleased]

### Added

- `aiutox_sdk.async_tasks` (new submodule): `Task` and `register_task`, so a
  plugin module can run periodic work without importing `app.core.async_tasks`.
- `aiutox_sdk.notifications` (new submodule): `NotificationService`, so a plugin
  module can notify users without importing `app.core.notifications`.
- `aiutox_sdk.comments` (new submodule): `CommentService`, so a plugin module
  can keep notes on its records without importing `app.core.comments`.
- `aiutox_sdk.integrations`: `IntegrationService`, `IntegrationType` and
  `IntegrationStatus`, so a plugin module can read a tenant's integrations
  (status, `last_sync_at`, last error, credentials) without importing
  `app.core.integrations`. CONTRACT.md now lists the whole submodule.
- `aiutox_sdk.approvals`: `ApprovalService`, so a plugin module can run
  approval requests on its records without importing `app.core.approvals`.
  CONTRACT.md now lists the submodule.
- `aiutox_sdk.files`: `File` and `FileService`, host-bound re-exports of
  `app.core.files.models.File` and `app.core.files.service.FileService`, so a
  plugin module that attaches files to its records stops importing
  `app.core.files` directly. Additive: no existing name changes.
- `aiutox_sdk.service_registry`: `BillingReader`, `ChargeRecord`, `PaymentRecord`,
  `register_billing_reader`, `get_billing_reader` and `clear_billing_reader`, the
  typed contract through which finances and leases read billing without
  importing `app.modules.billing`. Additive: no existing name changes.
- `aiutox_sdk.contacts` (new submodule): `Contact`, `ContactMethod`,
  `OrganizationContact` and their enums, so plugin modules stop importing
  `app.core.contacts.models` directly.
- `aiutox_sdk.users`: `Organization` and `OrganizationType`.
- Documented in CONTRACT.md the symbols that were already exported but not
  listed there: `aiutox_sdk.pubsub.publish_fire_and_forget`,
  `aiutox_sdk.config.get_settings` and the `aiutox_sdk.users` surface.
- `aiutox_sdk.files`: `EntityAccessResolver` and `register_entity_access_resolver`,
  so plugin modules can grant access to files attached to their records from
  `on_load()` without importing `app.core.files` directly.
- `aiutox_sdk.catalogs`: `require(db, tenant_id, list_key, code, current=None, field=None)`,
  `get_items(db, tenant_id, list_key)` and `labels_for(db, tenant_id, list_key, codes, lang)`,
  the public path for plugin modules to validate and label catalog-backed
  fields without importing `app.core.catalogs` internals.
- `aiutox_sdk.module_interface`: `CatalogDescriptor`, `CatalogItemDescriptor` and
  `load_catalog_declarations(path)` (declare a module's option lists from a
  `catalogs.yaml`), plus `ModuleInterface.get_catalogs()` (default `[]`).
- `ModuleInterface.is_critical` (default `False`): declares a core module that
  can never be disabled per tenant. It is honored for core modules only
  (`module_type == "core"`); a business module that sets it stays disableable.

### Internal

The surface only grew: the 1.x snapshot gained `aiutox_sdk.service_registry`
(see Added) and no public name was removed or changed. Per CONTRACT.md an
addition is a MINOR bump, so the next release is 1.1.0; `__version__.py` and
`aiutox_sdk/pyproject.toml` stay at 1.0.0 until that release is cut (the
publish workflow refuses a tag that does not match them).

- `aiutox_sdk.catalogs` no longer exposes the names it only imported for its own
  use (`CatalogService`, `ResolvedItem`, `get_catalog_cache`, `Session`, `UUID`).
  None was in `__all__`, the snapshot or CONTRACT.md, and nothing in the repo
  imported them from there.
- Moving the standard response models from `app.schemas.common` to
  `aiutox_sdk.response` renames six OpenAPI components (two each for the
  Dashboard, Folder and Tenant `StandardResponse` types, prefix
  `app__schemas__common__` becomes `aiutox_sdk__response__`). Payloads and paths
  are unchanged (DEC-20261022-002).

- `aiutox_sdk` is now self-contained: importing it never imports the backend
  (`app`). It owns the `module_interface`, `exceptions`, `response` and `files`
  contracts plus the catalog descriptors, Pub-Sub models and errors, license
  errors and webhook event registry; core re-exports them. Names implemented by
  the core runtime resolve lazily and raise `HostRuntimeUnavailableError` when
  the runtime is absent.
- `aiutox-sdk` builds as its own wheel from `backend/aiutox_sdk/pyproject.toml`
  (only `aiutox_sdk/`, depending on fastapi, sqlalchemy, pydantic and pyyaml).
  `backend/app/sdk/pyproject.toml` is removed.
- CI: `check_sdk_imports.py --sdk-self-contained` (job `plugin-gates`) fails on a
  module-level `app` import inside `aiutox_sdk`.
- `app.sdk.<name>` stays as a compatibility alias of `aiutox_sdk.<name>`.

---

## [1.0.0] — 2026-04-16

### Added

Initial SDK surface — Nivel 1 (Imprescindible) + Nivel 2 (Común).
Covers 95%+ of real imports from business modules (audited in Fase 0).

**Submodules:**

| SDK module | Re-exports from | Key symbols |
|---|---|---|
| `aiutox_sdk.db` | `app.core.db` | `Base`, `get_db`, `SessionLocal`, `engine` |
| `aiutox_sdk.exceptions` | `app.core.exceptions` | `APIException`, `BusinessRuleError`, `raise_*` helpers |
| `aiutox_sdk.auth` | `app.core.auth` | `get_current_user`, `require_permission`, JWT helpers |
| `aiutox_sdk.logging` | `app.core.logging` | `get_logger` |
| `aiutox_sdk.pubsub` | `app.core.pubsub` | `EventPublisher`, `EventConsumer`, `get_event_publisher` |
| `aiutox_sdk.response` | `app.schemas.common` | `StandardResponse`, `StandardListResponse`, `PaginationMeta` |
| `aiutox_sdk.tenancy` | `app.core.auth.dependencies` | `verify_tenant_access` |
| `aiutox_sdk.config` | `app.core.config.service` | `ConfigService` |
| `aiutox_sdk.permissions` | `app.core.auth` | `require_permission`, `require_any_permission`, `has_permission` |
| `aiutox_sdk.module_interface` | `app.core.module_interface` | `ModuleInterface`, `ModuleNavigationItem` |

**Implementation note (Fase 1-3):** The SDK lives at `backend/app/sdk/` and is
exposed via an import shim at `backend/aiutox_sdk/`. In Plan C the shim is
replaced by a standalone installable package published to GitHub Packages.

---

## Compatibility Window

Each major version of the SDK is supported for **12 months** after the release
of the next major version.

- `1.x` support end date: 12 months after `2.0.0` is released (TBD).

---

## Roadmap

| Milestone | Contents |
|---|---|
| `1.1.0` (Fase 2) | Nivel 3 symbols + `aiutox_sdk.testing` fixtures |
| `1.2.0` (Fase 3) | Event Schema validator integrated |
| Standalone (Plan C) | Packaged as external dependency on GitHub Packages |
| `1.3.0` (Plan C) | License token verification API for tier gating |
| `2.0.0` (Plan D) | Breaking changes accumulated; Widget Registry full migration |
