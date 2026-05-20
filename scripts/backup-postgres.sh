#!/usr/bin/env bash
# ============================================================================
# Postgres backup — pg_dump tất cả database petclinic, gzip, rotate giữ N ngày.
#
# Usage (host, postgres container running):
#   ./scripts/backup-postgres.sh
#
# Usage (custom location + retention):
#   BACKUP_DIR=/mnt/backups RETENTION_DAYS=14 ./scripts/backup-postgres.sh
#
# Cron (host crontab, daily 02:00):
#   0 2 * * * cd /path/to/petclinic-ms && ./scripts/backup-postgres.sh >> /var/log/petclinic-backup.log 2>&1
#
# Restore (chuyển ngược):
#   gunzip -c backups/petclinic-2026-05-19_02-00.sql.gz | \
#     docker exec -i petclinic-postgres psql -U postgres -d petclinic
# ============================================================================
set -euo pipefail

# --- Config (override qua env) ---
CONTAINER="${POSTGRES_CONTAINER:-petclinic-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-petclinic}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# --- Pre-flight ---
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker not in PATH" >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "ERROR: container '$CONTAINER' not running. Start với: docker compose --profile db up -d" >&2
    exit 2
fi

mkdir -p "$BACKUP_DIR"

# --- Dump ---
TIMESTAMP=$(date -u +'%Y-%m-%d_%H-%M-%SZ')
DUMP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

echo "[$(date -u +'%FT%TZ')] pg_dump $DB_NAME → $DUMP_FILE"

# --custom format (-Fc) cho restore selective; --clean để DROP trước khi CREATE khi restore.
# Stream qua gzip để khỏi đụng /tmp lớn trong container.
docker exec "$CONTAINER" pg_dump \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --clean --if-exists \
    --no-owner --no-privileges \
    --format=plain \
    | gzip -9 > "$DUMP_FILE"

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[$(date -u +'%FT%TZ')] OK ($SIZE)"

# --- Verify ---
if ! gzip -t "$DUMP_FILE"; then
    echo "ERROR: gzip integrity check failed for $DUMP_FILE" >&2
    rm -f "$DUMP_FILE"
    exit 3
fi

# --- Rotate (giữ RETENTION_DAYS gần nhất) ---
# -mtime +N: file modified > N ngày trước.
find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date -u +'%FT%TZ')] Backup done. Retention: ${RETENTION_DAYS}d, $(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.sql.gz" | wc -l) snapshot(s) kept."
