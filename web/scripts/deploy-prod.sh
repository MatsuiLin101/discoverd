#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
export ENV_FILE

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.production.example and fill production values first." >&2
  exit 1
fi

# `migrate` lives in the `tools` profile, so a bare `build` skips it. Build with
# the profile enabled so both `app` and `migrate` images exist before we run the
# one-shot migration. `up -d` below omits the profile, so migrate never starts as
# a long-running service.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile tools build
# Apply migrations, then backfill Product IDs / region codes in the SAME one-shot
# container (no extra container startup). The backfill is idempotent — after the
# first run it is a near-instant no-op, since new rows get their ids at creation.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm migrate \
  sh -c "npx prisma migrate deploy && npx tsx scripts/backfill-product-ids.ts"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
