#!/bin/sh
set -e

mkdir -p storage/attachments

echo "Running migrations..."
alembic upgrade head

# Only seed data in demo/local environments
if [ "${DEMO_MODE}" = "true" ] || [ "${ENVIRONMENT}" = "local" ]; then
    echo "Running seed data (DEMO_MODE=${DEMO_MODE}, ENVIRONMENT=${ENVIRONMENT})"
    python -m app.seed.seed_data || true
else
    echo "Skipping seed data in production environment"
fi

# Use multiple workers in production
if [ "${ENVIRONMENT}" = "production" ]; then
    WORKERS=${UVICORN_WORKERS:-2}
    echo "Starting with ${WORKERS} workers"
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WORKERS}"
else
    echo "Starting in development mode (single worker)"
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
