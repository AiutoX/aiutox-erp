# AiutoX Module Template

Scaffold for creating a new AiutoX business module.

## Quick Start

1. Copy this directory:
   ```bash
   cp -r aiutox-module-template aiutox-module-YOUR_MODULE
   ```

2. Replace all occurrences of `TEMPLATE` with your module name:
   ```bash
   # In filenames and directory names
   find aiutox-module-YOUR_MODULE -name "*TEMPLATE*" | while read f; do
     mv "$f" "${f//TEMPLATE/your_module}"
   done

   # In file contents
   find aiutox-module-YOUR_MODULE -type f | xargs sed -i 's/TEMPLATE/your_module/g'
   find aiutox-module-YOUR_MODULE -type f | xargs sed -i 's/TemplateModule/YourModuleModule/g'
   ```

3. Update metadata:
   - `backend/pyproject.toml`: name, description, author, dependencies
   - `frontend/package.json`: name, description

4. Implement your module:
   - Add models in `backend/aiutox_module_your_module/models/`
   - Add schemas in `backend/aiutox_module_your_module/schemas/`
   - Add services in `backend/aiutox_module_your_module/services/`
   - Add API routes in `backend/aiutox_module_your_module/api.py`
   - Add frontend components in `frontend/app/features/your_module/components/`
   - Add routes in `frontend/app/features/your_module/routes.config.ts`
   - Add translations in `frontend/app/features/your_module/i18n/`

5. Create Alembic migrations:
   ```bash
   cd backend
   alembic revision --autogenerate -m "initial your_module tables" \
     --head=your_module@head --branch-label=your_module \
     --version-path=aiutox_module_your_module/migrations/versions
   ```

6. Build and publish:
   ```bash
   # Backend
   cd backend && hatch build && twine upload dist/*

   # Frontend
   cd frontend && npm publish
   ```

## Directory Structure

```
aiutox-module-YOUR_MODULE/
  backend/
    pyproject.toml                    # Python package config + entry_point
    aiutox_module_your_module/
      __init__.py                     # ModuleInterface subclass
      api.py                          # FastAPI router
      models/                         # SQLAlchemy models
      schemas/                        # Pydantic schemas
      services/                       # Business logic
      repositories/                   # Data access
      migrations/versions/            # Alembic migrations
  frontend/
    package.json                      # @aiutox/module-your-module
    app/features/your_module/
      index.ts                        # Feature exports
      routes.config.ts                # Route definitions
      i18n/en.ts                      # English translations
      i18n/es.ts                      # Spanish translations
      components/                     # React components
      hooks/                          # Custom hooks
      api/                            # API client functions
      types/                          # TypeScript types
```

## Key Contracts

- Your `ModuleInterface` subclass must implement: `module_id`, `module_type`, `enabled`, `get_router()`, `get_models()`, `get_migrations_path()`
- Entry point group: `aiutox.modules`
- npm scope: `@aiutox/module-{name}`
- Navigation is driven by `get_navigation_items()` -- the backend tells the frontend what nav items to show
- i18n files are auto-discovered via `import.meta.glob`
- Routes are auto-discovered from `routes.config.ts`
