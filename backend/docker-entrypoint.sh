#!/bin/sh
set -e

echo "[entrypoint] Running Alembic migrations..."
uv run --frozen --no-sync alembic upgrade heads

echo "[entrypoint] Running database seeds..."
uv run --frozen --no-sync python scripts/database/conditional_seeder.py

echo "[entrypoint] Starting uvicorn..."
exec uv run --frozen --no-sync uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 3
