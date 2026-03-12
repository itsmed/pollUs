#!/usr/bin/env bash
# Runs pending SQL migrations against the dev Postgres Docker container.
#
# Usage:
#   pnpm db:migrate           # apply all pending migrations
#   pnpm db:migrate --dry-run # print pending migrations without applying them
#
# Migrations live in docker/postgres/migrations/ and are named:
#   NNN_description.sql   e.g. 001_initial_schema.sql
#
# Applied migrations are tracked in the schema_migrations table.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/docker/postgres/migrations"
ENV_FILE="$REPO_ROOT/.env.development"
DRY_RUN=false

# Parse flags
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# Load root env vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
fi

DB_USER="${POSTGRES_USER:-pollus}"
DB_NAME="${POSTGRES_DB:-pollus_dev}"

# Resolve running container name (supports both docker compose v1 and v2 naming)
CONTAINER=$(docker ps --filter "ancestor=pollus-db" --format "{{.Names}}" | head -1)
if [[ -z "$CONTAINER" ]]; then
  CONTAINER=$(docker ps --filter "name=pollus-db" --format "{{.Names}}" | head -1)
fi
if [[ -z "$CONTAINER" ]]; then
  echo "Error: no running Postgres container found. Run 'pnpm db:up' first." >&2
  exit 1
fi

psql_exec() {
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

# Ensure the tracking table exists (handles DBs created before this script)
psql_exec -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
" > /dev/null

# Collect pending migrations
pending=()
for filepath in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$filepath" .sql)
  applied=$(psql_exec -tAc "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename';")
  if [[ "$applied" -eq 0 ]]; then
    pending+=("$filepath")
  fi
done

if [[ ${#pending[@]} -eq 0 ]]; then
  echo "Database is up to date. No pending migrations."
  exit 0
fi

echo "Pending migrations (${#pending[@]}):"
for filepath in "${pending[@]}"; do
  echo "  - $(basename "$filepath")"
done

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "Dry run — no changes applied."
  exit 0
fi

# Apply each pending migration in a transaction
for filepath in "${pending[@]}"; do
  filename=$(basename "$filepath" .sql)
  echo ""
  echo "Applying: $filename ..."

  psql_exec <<SQL
BEGIN;
$(cat "$filepath")
INSERT INTO schema_migrations (version) VALUES ('$filename') ON CONFLICT (version) DO NOTHING;
COMMIT;
SQL

  echo "Applied:  $filename"
done

echo ""
echo "Done. ${#pending[@]} migration(s) applied."
