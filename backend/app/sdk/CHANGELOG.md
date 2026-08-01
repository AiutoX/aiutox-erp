# AiutoX SDK — CHANGELOG

All notable changes to the SDK public surface are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [SemVer](https://semver.org/).

---

## [Unreleased]

_Nothing yet._

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
