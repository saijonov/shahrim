#!/usr/bin/env sh
# Wait for Postgres to truly accept connections (the PostGIS image's healthcheck
# can report healthy during first-init before the server is actually ready),
# then apply migrations and start the API.
set -e

echo "Waiting for database..."
until python - <<'PY'
import os
import sys

import psycopg

url = os.environ["DATABASE_URL"].replace("+psycopg", "")
try:
    psycopg.connect(url, connect_timeout=3).close()
except Exception:
    sys.exit(1)
PY
do
  echo "  ...database not ready yet, retrying"
  sleep 1
done

echo "Database ready. Applying migrations..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
