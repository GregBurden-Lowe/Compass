#!/bin/sh
set -e
alembic upgrade heads
python -m app.seed.seed_data || true
uvicorn app.main:app --host 0.0.0.0 --port 8000

