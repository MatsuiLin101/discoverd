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
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
