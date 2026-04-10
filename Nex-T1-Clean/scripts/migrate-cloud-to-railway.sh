#!/bin/bash
set -e

if [ -f ".env.local" ]; then
    set -a
    # shellcheck disable=SC1091
    source ".env.local"
    set +a
fi

if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source ".env"
    set +a
fi

# --- Configuration ---
SOURCE_DB_URL="${MIGRATION_SOURCE_DB_URL:-${SOURCE_DATABASE_URL:-${SUPABASE_SOURCE_DB_URL:-}}}"
DEST_DB_URL="${MIGRATION_DEST_DB_URL:-${RAILWAY_DATABASE_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}}"

# Paths to Homebrew v17 binaries
PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"

echo "==================================================="
echo "🚀 CLONE DATABASE: Supabase Cloud -> Railway Self-Hosted"
echo "==================================================="
echo "SOURCE: (Supabase Cloud) ...@db.rlepskmfaigmgytiipyo..."
echo "DEST:   (Railway Public) ...@maglev.proxy.rlwy.net:48810/railway"
echo "---------------------------------------------------"
echo "⚠️  WARNING: This will OVERWRITE data in the Railway database!"
echo "==================================================="

if [ -z "$SOURCE_DB_URL" ] || [ -z "$DEST_DB_URL" ]; then
    echo "Set MIGRATION_SOURCE_DB_URL/SOURCE_DATABASE_URL/SUPABASE_SOURCE_DB_URL and MIGRATION_DEST_DB_URL/RAILWAY_DATABASE_URL/DATABASE_URL before running this script."
    exit 1
fi

if [ ! -f "$PG_DUMP" ]; then
    echo "❌ pg_dump v17 not found at $PG_DUMP"
    exit 1
fi

echo "⏳ Starting Dump & Restore (Pipe)..."
echo "   Using: $PG_DUMP"

# Connection strings often fail if arguments like ?pgbouncer=true interfere with pg_dump/psql parsing in older versions,
# but v17 handles connection URIs well.
# We ensure we don't have conflicting env vars.

"$PG_DUMP" "$SOURCE_DB_URL" \
  --no-owner \
  --no-privileges \
  --quote-all-identifiers \
  --exclude-schema=vault \
  --exclude-schema=extensions \
  | "$PSQL" "$DEST_DB_URL"

echo ""
echo "✅ Database Clone Complete!"
