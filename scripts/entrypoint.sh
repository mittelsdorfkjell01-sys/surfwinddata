#!/bin/sh
# Container entrypoint: apply DB migrations, then start the API.
#
# `docker compose` waits for the db service to be healthy before starting this
# container (depends_on: condition: service_healthy), so the DB is reachable by
# the time migrations run. If a migration fails, `set -e` aborts before uvicorn
# starts — the container is reported unhealthy rather than serving a half-migrated
# schema.
set -e

echo "[entrypoint] applying database migrations (alembic upgrade head) ..."
alembic upgrade head

echo "[entrypoint] starting API on :8000 ..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
