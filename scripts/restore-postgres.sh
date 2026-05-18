#!/usr/bin/env bash
# Restore Postgres dump tạo từ backup-postgres.sh.
# Usage:  ./scripts/restore-postgres.sh backups/petclinic-2026-05-19_02-00-00Z.sql.gz
set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
    echo "Usage: $0 <path-to-dump.sql.gz>" >&2
    exit 1
fi

CONTAINER="${POSTGRES_CONTAINER:-petclinic-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-petclinic}"

echo "WARNING: restore từ $DUMP sẽ DROP/RECREATE objects trong $DB_NAME. Ctrl-C trong 5s để hủy."
sleep 5

gunzip -c "$DUMP" | docker exec -i "$CONTAINER" psql --username="$DB_USER" --dbname="$DB_NAME"
echo "Restore done."
