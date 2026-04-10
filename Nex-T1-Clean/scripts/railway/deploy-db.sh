#!/bin/bash
set -e

# Helper script to push Supabase migrations to a generic Postgres (e.g. Railway)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set."
  echo "Usage: DATABASE_URL='postgresql://...' ./scripts/railway/deploy-db.sh"
  exit 1
fi

echo "🚀 Deploying migrations to remote database..."
redacted_url=$(echo "$DATABASE_URL" | sed -E 's#(://[^:/]+:)[^@/]*@#\\1***@#')
echo "Target: $redacted_url"

# Check for supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it."
    exit 1
fi

supabase db push --db-url "$DATABASE_URL" --include-all

echo "✅ Migrations deployed successfully."
