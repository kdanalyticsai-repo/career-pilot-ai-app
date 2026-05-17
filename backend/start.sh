#!/bin/sh
set -e
echo "Running database migrations..."
alembic upgrade head || {
    echo "Migration failed - stamping existing schema at rev 006 and retrying..."
    alembic stamp 006
    alembic upgrade head
}
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
