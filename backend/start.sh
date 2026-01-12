#!/bin/sh
set -e

mkdir -p storage/attachments

if [ -z "${DATABASE_URL}" ]; then
    echo "ERROR: DATABASE_URL is not set. In production, set it in your .env to point at DigitalOcean Postgres."
    exit 1
fi

# In production, SECRET_KEY must be stable across workers/restarts.
# If unset, the app will generate a random key per process, which breaks JWT auth when using multiple workers.
if [ "${ENVIRONMENT}" = "production" ] && [ -z "${SECRET_KEY}" ]; then
    echo "ERROR: SECRET_KEY is not set. Set SECRET_KEY in your .env (required in production to keep auth stable)."
    exit 1
fi

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
