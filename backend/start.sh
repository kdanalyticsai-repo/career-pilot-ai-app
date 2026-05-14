#!/bin/sh
set -e
echo "Starting server (tables auto-created by SQLAlchemy on startup)..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
