<div align="center">

# AiutoX ERP

**Your data, working for you.**

Open-source, multi-tenant ERP platform built for the way people actually work —
not the way accountants wish they did.

[Getting Started](#getting-started) · [Core Features](#core-features) · [Install a Module](#installing-business-modules) · [Build a Module](#building-custom-modules) · [Español](README.es.md)

</div>

---

## What is AiutoX ERP?

AiutoX ERP is a modular, event-driven ERP system designed for mid-sized companies that are tired of software that forces them to adapt to it. The name combines *Aiuto* (Italian for "help") with *X* for extensibility — because this platform exists to help, not to get in the way.

The core philosophy is simple: **your data should work for you**. AiutoX connects information across your organization automatically, surfaces what matters in context, and lets you build the workflows you actually need instead of the ones a vendor decided you should have.

### Why AiutoX is different

Most ERP systems are data vaults. They store everything and surface nothing. AiutoX is designed around the opposite premise:

- **Contextual awareness** — tasks, approvals, notifications, and automations are connected. When something changes, the right people know immediately, without anyone having to check a dashboard.
- **Automation first** — the automation engine runs rules and AI-assisted workflows across any module. Repetitive work disappears without requiring a developer.
- **Modular by design** — enable only what you need. Modules are isolated; disabling one never breaks another. Business modules install as packages, not as config switches.
- **Built for operators, not just admins** — field workers, supervisors, and end users each get views optimized for their reality, not a single screen everyone has to share.
- **Event-driven core** — every action in the system emits an event. Modules react to events, not to each other. This means you can extend the system without touching the core.
- **PWA-ready** — the platform installs on mobile devices and the data collection module supports offline operation for field teams without connectivity.

---

## Core Features

These modules ship with every AiutoX installation at no additional cost:

| Module | What it does |
|---|---|
| **Authentication & RBAC** | Multi-tenant auth with JWT, fine-grained role and permission system per module |
| **User & Tenant Management** | Full user lifecycle, tenant isolation, per-tenant module configuration |
| **Task Management** | Tasks with custom statuses, workflows, assignments, approvals, and status automations |
| **Calendar & Events** | Shared calendars, event scheduling, external calendar sync |
| **Approval Workflows** | Configurable multi-step approval flows attached to any entity |
| **Automation Engine** | Rule-based automation + AI agents that act on system events |
| **Notifications** | Email, SMS, in-app, webhook — all configurable per event type |
| **File Management** | Secure file storage with tenant isolation and folder organization |
| **Comments & Collaboration** | Threaded comments on any entity across any module |
| **Templates** | Reusable content templates for recurring documents and messages |
| **PubSub Event Bus** | Redis Streams-based event bus with stream and group management UI |
| **Reporting Engine** | Cross-module reports with filtering and export |
| **Gamification** | Points, badges, and leaderboards to drive engagement |
| **Import / Export** | Bulk data import and export for all core entities |
| **Search** | Full-text search across all modules |
| **Tags** | Tagging system available to every module |
| **Activities Timeline** | Audit trail and activity feed per entity |
| **Views & Filters** | Saved filters and custom views per user |
| **Integrations** | Webhook management and third-party integration configuration |
| **Config & Settings** | Per-tenant theming, quick actions, roles, and system settings |

---

## Architecture

AiutoX is a **modular monolith** — not microservices, but each module is fully encapsulated. Modules never import each other directly; they communicate exclusively through the event bus.

```
frontend/                     # React + TypeScript + Vite + TailwindCSS
  app/features/               # One folder per module (core + installed)
  app/lib/                    # Shared: API client, auth, i18n, stores

backend/                      # FastAPI + Python + SQLAlchemy + Alembic
  app/core/                   # Shared infrastructure (auth, pubsub, config...)
  app/modules/                # Business module install location
  app/sdk/                    # Public SDK for building modules
  config/modules.json         # Module registry (enabled/disabled per tenant)

migrations/                   # Alembic multi-branch migration system
```

**Stack:** FastAPI · PostgreSQL 16 · Redis 7 (Streams + Cache) · React · TypeScript · Vite · TailwindCSS v4 · shadcn/ui

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Git | latest | Version control |
| Docker + Docker Compose | latest | Local environment (recommended) |
| Node.js | 20+ | Frontend development |
| Python | 3.12+ | Backend development |
| uv | latest | Python package management |

### Quick start with Docker

```bash
git clone https://github.com/AiutoX/aiutox-erp.git
cd aiutox-erp

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start everything
docker compose up -d
```

App is available at `http://localhost:5173`. API docs at `http://localhost:8000/docs`.

### Manual setup (development)

```bash
# Backend
cd backend
uv sync
cp .env.example .env          # Fill in DATABASE_URL, REDIS_URL, SECRET_KEY
uv run alembic upgrade heads  # Run migrations
uv run uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run generate-routes       # Generate route file from discovered modules
cp .env.example .env
npm run dev
```

### Environment variables

**Backend (`backend/.env`):**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SECRET_KEY` | Yes | JWT signing secret (generate a long random string) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | No | Instance-wide SMTP fallback. Each tenant configures their own email server from the UI at **Config → Notifications** (host, port, credentials, TLS, sender address, built-in test connection). The per-tenant config always takes priority; these env vars are only used when a tenant has not set up their own SMTP. |

**Frontend (`frontend/.env`):**

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API URL (e.g. `http://localhost:8000`) |

### Verify the installation

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| API Explorer (Swagger) | `http://localhost:8000/docs` |
| Health check | `http://localhost:8000/health/ready` |

---

## Installing Business Modules

Business modules (Real Estate, CRM, Billing, Inventory, and more) are distributed as pip + npm packages via GitHub Packages.

### One-command install

```bash
export GH_PACKAGES_TOKEN=your_token_here
bash scripts/install-module.sh real_estate
```

This installs the Python package, the npm package, creates the frontend symlink, regenerates routes, and runs migrations automatically.

### Manual install

```bash
# 1. Install backend package
pip install aiutox-module-real-estate \
  --extra-index-url "https://__token__:${GH_PACKAGES_TOKEN}@pypi.pkg.github.com/aiutoxchile/simple/"

# 2. Install frontend package
npm install @aiutox/module-real-estate \
  --registry https://npm.pkg.github.com

# 3. Link frontend feature and regenerate routes
npx tsx scripts/link-external-features.ts
npm run generate-routes

# 4. Run database migrations
uv run alembic upgrade heads
```

Restart the application after installing modules.

---

## Building Custom Modules

A business module is a self-contained package — a Python wheel for the backend and an npm package for the frontend — that plugs into the core without modifying it. The core discovers your module automatically at startup through a Python entry point; no registration file to edit, no route list to update.

### 1. Start from the template

```bash
cp -r aiutox-module-template/ aiutox-module-my-module/
cd aiutox-module-my-module

# Replace TEMPLATE with your module name everywhere
find . -name "*TEMPLATE*" | while read f; do mv "$f" "${f//TEMPLATE/my_module}"; done
find . -type f | xargs sed -i 's/TEMPLATE/my_module/g'
```

The template ships with the full directory structure already in place:

```
aiutox-module-my-module/
  backend/
    pyproject.toml                      # Python package + entry point declaration
    aiutox_module_my_module/
      __init__.py                       # ModuleInterface subclass (the connection point)
      api.py                            # FastAPI router
      models/                           # SQLAlchemy models (tenant_id required on every table)
      schemas/                          # Pydantic v2 schemas
      services/                         # Business logic
      repositories/                     # Data access layer
      migrations/versions/              # Alembic migrations (independent branch)
  frontend/
    package.json                        # @aiutox/module-my-module
    app/features/my_module/
      routes.config.ts                  # Route definitions (auto-discovered)
      i18n/en.ts                        # English translations (auto-discovered)
      i18n/es.ts                        # Spanish translations
      index.ts                          # Feature exports
      components/                       # React components
      api/                              # API client functions (use apiClient, never fetch)
      types/                            # TypeScript types
```

### 2. How the backend connects to the core

The single connection point is the `ModuleInterface` subclass in `__init__.py`. The core calls its methods to discover routes, navigation items, migrations, and dependencies — your module never imports from the core, only from the SDK.

```python
from pathlib import Path
from aiutox_sdk.module_interface import ModuleInterface, ModuleNavigationItem
from fastapi import APIRouter

class MyModule(ModuleInterface):

    @property
    def module_id(self) -> str:
        return "my_module"                    # unique key, snake_case

    @property
    def module_type(self) -> str:
        return "business"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from aiutox_module_my_module.api import router
        return router                         # routes are registered under /api/v1/

    def get_models(self) -> list:
        from aiutox_module_my_module.models.my_model import MyModel
        return [MyModel]                      # returned to Alembic for migration discovery

    def get_dependencies(self) -> list[str]:
        return ["auth", "users"]              # core modules this module requires

    @classmethod
    def get_migrations_path(cls) -> str | None:
        return str(Path(__file__).parent / "migrations" / "versions")

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="my_module.main",
                label="My Module",
                path="/my-module",
                permission="my_module.view",  # RBAC permission guard
                icon="box",                   # Lucide icon name
                order=10,
            )
        ]
```

The platform discovers this class through a Python entry point declared in `pyproject.toml`:

```toml
[project]
name = "aiutox-module-my-module"
version = "0.1.0"
dependencies = ["aiutox-sdk>=1.0.0"]

[project.entry-points."aiutox.modules"]
my_module = "aiutox_module_my_module:MyModule"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

No other file in the core needs to be changed. When the backend starts, it scans all installed packages for the `aiutox.modules` entry point group and loads every module it finds.

### 3. What the SDK gives you

Your module only imports from `aiutox-sdk`. The SDK exposes the interfaces and helpers you need without coupling your code to internal core details:

| SDK export | What it provides |
|---|---|
| `ModuleInterface` | Base class the core calls to discover your module |
| `ModuleNavigationItem` | Navigation entry dataclass |
| Core services (via dependency injection) | `NotificationService`, `ConfigService`, `EventPublisher`, `FileService` — injected into your FastAPI routes via `Depends()` |
| PubSub events | Publish events with `EventPublisher`; subscribe to events from other modules |

**Modules never import each other directly.** If your module needs to react to something another module does (e.g., a payment confirmed), subscribe to the event on the PubSub bus:

```python
# In your module's event consumer
from aiutox_sdk.pubsub import EventConsumer

consumer = EventConsumer(group="my_module", stream="billing.payment.confirmed")

@consumer.handler
async def on_payment_confirmed(event):
    tenant_id = event.tenant_id        # always filter by tenant
    # your logic here
```

### 4. How the frontend connects to the core

Two files are all that is needed. The core discovers both automatically — you never edit a central routes file or a navigation config.

**`routes.config.ts`** — declares which URL paths your module owns:

```typescript
export const moduleKey = "my_module";

export const routes = [
  { path: "/my-module",        file: "features/my_module/pages/Index.tsx" },
  { path: "/my-module/:id",    file: "features/my_module/pages/Detail.tsx" },
  { path: "/my-module/create", file: "features/my_module/pages/Create.tsx" },
];
```

Running `npm run generate-routes` (or installing the module via `install-module.sh`) picks up this file and adds your routes to the app automatically.

**`i18n/en.ts`** and **`i18n/es.ts`** — translations are auto-discovered via Vite's `import.meta.glob`; no import needed in the shared i18n index.

**API calls** must always go through `apiClient` from `~/lib/api/client`, never through `fetch` or `axios` directly:

```typescript
import { apiClient } from "~/lib/api/client";

export const getMyItems = (params: ListParams) =>
  apiClient.get("/my-module/items", { params });
```

**Navigation** is driven entirely by the backend. The `get_navigation_items()` method on your `ModuleInterface` tells the frontend what menu entries to show and which permission to check — no frontend navigation config file to edit.

### 5. Database migrations

Each module manages its own Alembic migration branch, independent of the core and of other modules:

```bash
cd backend
alembic revision --autogenerate \
  -m "initial my_module tables" \
  --head=my_module@head \
  --branch-label=my_module \
  --version-path=aiutox_module_my_module/migrations/versions
```

When the module is installed, `alembic upgrade heads` applies all pending heads including yours. When it is uninstalled, the branch is simply not applied — no conflict with other modules.

Every table your module creates **must** include a `tenant_id UUID NOT NULL` column. The core enforces tenant isolation at the API layer, but your repository queries must also always filter by it.

### 6. Install your module locally

```bash
# From the aiutox-erp directory
pip install -e ./aiutox-module-my-module/backend

cd frontend
npm install ../aiutox-module-my-module/frontend
npx tsx scripts/link-external-features.ts
npm run generate-routes

cd ../backend
alembic upgrade heads
```

Restart the backend. Your module's routes, navigation, and migrations are now active.

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Open a pull request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.

---

## License

**Core platform:** MIT License — free to use, modify, and distribute.

**Business modules:** Distributed separately under proprietary licenses. See individual module repositories for terms.

---

<div align="center">
Built with FastAPI, React, PostgreSQL, and Redis.
</div>
