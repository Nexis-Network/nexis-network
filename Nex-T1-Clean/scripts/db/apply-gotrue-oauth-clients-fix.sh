#!/bin/bash

# ==============================================================================
# GoTrue OAuth Clients Fix Deployment Script
# ==============================================================================
# Purpose: Repair auth.oauth_clients schema to unblock GoTrue migrations
# Usage: ./scripts/db/apply-gotrue-oauth-clients-fix.sh [environment]
# Environment: production (default) | staging | local
# ==============================================================================

set -euo pipefail

[ -f .env.local ] && . ./.env.local
[ -f .env ] && . ./.env

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-production}"
SQL_FILE="scripts/db/fix-gotrue-oauth-clients.sql"

echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  GoTrue OAuth Clients Fix Deployment${NC}"
echo -e "${YELLOW}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

if [[ ! "$ENVIRONMENT" =~ ^(production|staging|local)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
  echo "Usage: $0 [production|staging|local]"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo -e "${RED}Error: psql is required but not installed${NC}"
  echo "Install PostgreSQL client tools and retry."
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}Error: SQL file not found: $SQL_FILE${NC}"
  exit 1
fi

case "$ENVIRONMENT" in
  production)
    if [ -z "${SUPABASE_PRODUCTION_DB_URL:-}" ]; then
      echo -e "${RED}Error: SUPABASE_PRODUCTION_DB_URL is not set${NC}"
      echo ""
      echo "Provide a PUBLIC/TCP proxy connection string for the Supabase (GoTrue) database."
      echo "Export SUPABASE_PRODUCTION_DB_URL and retry."
      exit 1
    fi
    DB_URL="$SUPABASE_PRODUCTION_DB_URL"
    ;;
  staging)
    if [ -z "${SUPABASE_STAGING_DB_URL:-}" ]; then
      echo -e "${RED}Error: SUPABASE_STAGING_DB_URL is not set${NC}"
      exit 1
    fi
    DB_URL="$SUPABASE_STAGING_DB_URL"
    ;;
  local)
    LOCAL_SUPABASE_DB_HOST="${LOCAL_SUPABASE_DB_HOST:-127.0.0.1}"
    LOCAL_SUPABASE_DB_PORT="${LOCAL_SUPABASE_DB_PORT:-54322}"
    LOCAL_SUPABASE_DB_NAME="${LOCAL_SUPABASE_DB_NAME:-postgres}"
    LOCAL_SUPABASE_DB_USER="${LOCAL_SUPABASE_DB_USER:-postgres}"
    LOCAL_SUPABASE_DB_PASSWORD="${LOCAL_SUPABASE_DB_PASSWORD:-postgres}"
    DB_URL="postgresql://${LOCAL_SUPABASE_DB_USER}:${LOCAL_SUPABASE_DB_PASSWORD}@${LOCAL_SUPABASE_DB_HOST}:${LOCAL_SUPABASE_DB_PORT}/${LOCAL_SUPABASE_DB_NAME}"
    echo -e "${YELLOW}Using local Supabase (ensure 'supabase start' is running).${NC}"
    ;;
esac

if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${YELLOW}⚠️  WARNING: You are about to modify the PRODUCTION Supabase database${NC}"
  echo ""
  echo "This script will:"
  echo "  1. Ensure auth.oauth_registration_type enum exists"
  echo "  2. Repair auth.oauth_clients table schema"
  echo "  3. Recreate required constraints and indexes"
  echo ""
  read -r -p "Type 'yes' to continue: " CONFIRM
  echo ""
  if [[ "$CONFIRM" != "yes" ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Applying GoTrue OAuth clients fix...${NC}"
if psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"; then
  echo -e "${GREEN}✓ Fix applied successfully${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Redeploy Supabase-Auth"
  echo "  2. Verify auth logs show migrations complete"
  echo "  3. Re-test OAuth login flows"
else
  echo -e "${RED}✗ Fix failed to apply${NC}"
  echo "Troubleshooting:"
  echo "  - Verify DB URL and credentials"
  echo "  - Confirm proxy/SSL requirements for the Railway TCP URL"
  exit 1
fi
