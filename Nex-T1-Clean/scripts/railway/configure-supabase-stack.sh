#!/bin/bash
set -euo pipefail

# Supabase Stack Configuration Script
# This script sets JWT secrets and internal networking variables for all Supabase services on Railway.

SUPABASE_JWT_SECRET_VALUE="${SUPABASE_JWT_SECRET:-${GOTRUE_JWT_SECRET:-${JWT_SECRET:-}}}"
SUPABASE_ANON_KEY_VALUE="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}}}"
SUPABASE_SERVICE_ROLE_KEY_VALUE="${SUPABASE_SERVICE_ROLE_KEY:-}"

SUPABASE_AUTH_EXTERNAL_URL="${SUPABASE_AUTH_EXTERNAL_URL:-https://auth.nex-t1.ai}"
SUPABASE_SITE_URL="${SUPABASE_SITE_URL:-https://nex-t1.ai}"
SUPABASE_AUTH_REDIRECT_URI="${SUPABASE_AUTH_REDIRECT_URI:-${SUPABASE_AUTH_EXTERNAL_URL}/auth/v1/callback}"
SUPABASE_MAILER_EXTERNAL_HOSTS="${SUPABASE_MAILER_EXTERNAL_HOSTS:-auth.nex-t1.ai,nex-t1.ai}"
SUPABASE_DB_SERVICE="${SUPABASE_DB_SERVICE:-pgvector}"

if [[ -z "$SUPABASE_JWT_SECRET_VALUE" || -z "$SUPABASE_ANON_KEY_VALUE" || -z "$SUPABASE_SERVICE_ROLE_KEY_VALUE" ]]; then
  echo "Missing required environment variables."
  echo "Required: SUPABASE_JWT_SECRET (or GOTRUE_JWT_SECRET/JWT_SECRET), SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# --- INTERNAL URLS ---
# Using Service Variables format where possible for robustness
DB_URL_VAR="\${{${SUPABASE_DB_SERVICE}.DATABASE_URL}}"
KONG_URL_INTERNAL="http://kong.railway.internal:8000"
AUTH_URL_INTERNAL="http://supabase-auth.railway.internal:9999"
REST_URL_INTERNAL="http://postgrest.railway.internal:3000"
REALTIME_URL_INTERNAL="http://supabase-realtime.railway.internal:4000"
STORAGE_URL_INTERNAL="http://supabase-storage.railway.internal:5000"
META_URL_INTERNAL="http://postgres-meta.railway.internal:8080"
STUDIO_SITE_URL="${SUPABASE_STUDIO_SITE_URL:-https://supabase.nex-t1.ai}"
STUDIO_GOTRUE_URL="${SUPABASE_STUDIO_GOTRUE_URL:-${SUPABASE_AUTH_EXTERNAL_URL}/auth/v1}"

echo "🚀 Configuring Supabase Stack on Railway..."

# 1. Supabase Auth (GoTrue)
echo "🔹 Configuring Supabase-Auth..."
railway variables set \
  GOTRUE_JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  GOTRUE_SERVICE_ROLE_TOKEN="$SUPABASE_SERVICE_ROLE_KEY_VALUE" \
  GOTRUE_DB_DATABASE_URL="$DB_URL_VAR" \
  GOTRUE_EXTERNAL_URL="$SUPABASE_AUTH_EXTERNAL_URL" \
  API_EXTERNAL_URL="$SUPABASE_AUTH_EXTERNAL_URL" \
  GOTRUE_SITE_URL="$SUPABASE_SITE_URL" \
  GOTRUE_MAILER_EXTERNAL_HOSTS="$SUPABASE_MAILER_EXTERNAL_HOSTS" \
  GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI="$SUPABASE_AUTH_REDIRECT_URI" \
  GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI="$SUPABASE_AUTH_REDIRECT_URI" \
  GOTRUE_EXTERNAL_TWITTER_REDIRECT_URI="$SUPABASE_AUTH_REDIRECT_URI" \
  GOTRUE_EXTERNAL_DISCORD_REDIRECT_URI="$SUPABASE_AUTH_REDIRECT_URI" \
  --service "Supabase-Auth"

# 2. Supabase Storage
echo "🔹 Configuring Supabase Storage..."
railway variables set \
  PGRST_JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY_VALUE" \
  DATABASE_URL="$DB_URL_VAR" \
  POSTGREST_URL="$REST_URL_INTERNAL" \
  --service "Supabase Storage"

# 3. Kong (Gateway)
echo "🔹 Configuring Kong..."
railway variables set \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY_VALUE" \
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY_VALUE" \
  --service "Kong"

# 4. PostgREST
echo "🔹 Configuring PostgREST..."
railway variables set \
  PGRST_JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  DATABASE_URL="$DB_URL_VAR" \
  --service "PostgREST"

# 5. Supabase Realtime
echo "🔹 Configuring Supabase Realtime..."
railway variables set \
  JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  API_JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  DATABASE_URL="$DB_URL_VAR" \
  --service "Supabase Realtime"

# 6. Supabase Studio
echo "🔹 Configuring Supabase Studio..."
railway variables set \
  SUPABASE_URL="$KONG_URL_INTERNAL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY_VALUE" \
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY_VALUE" \
  NEXT_PUBLIC_GOTRUE_URL="$STUDIO_GOTRUE_URL" \
  NEXT_PUBLIC_SITE_URL="$STUDIO_SITE_URL" \
  STUDIO_DEFAULT_ORGANIZATION="Nexis Network" \
  STUDIO_DEFAULT_PROJECT="Nex-T1" \
  --service "Supabase Studio"

# 7. Frontend (Nex-T1-Enterprise)
echo "🔹 Configuring Frontend (Nex-T1-Enterprise)..."
railway variables set \
  NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_AUTH_EXTERNAL_URL" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY_VALUE" \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY_VALUE" \
  SUPABASE_URL="$KONG_URL_INTERNAL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY_VALUE" \
  SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET_VALUE" \
  --service "Nex-T1-Enterprise"

echo "✅ Configuration Complete. Services should restart automatically."
