#!/bin/bash

# ==============================================================================
# Emergency Auth Fix Deployment Script
# ==============================================================================
# Purpose: Safely apply the emergency auth fix to production Supabase
# Usage: ./scripts/db/apply-emergency-auth-fix.sh [environment]
# Environment: production (default) | staging | local
# ==============================================================================

set -euo pipefail

[ -f .env.local ] && . ./.env.local
[ -f .env ] && . ./.env

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse environment argument (default to production)
ENVIRONMENT="${1:-production}"

echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Emergency Auth Fix Deployment${NC}"
echo -e "${YELLOW}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Verify environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|local)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
  echo "Usage: $0 [production|staging|local]"
  exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}Error: Supabase CLI is not installed${NC}"
  echo "Install it with: npm install -g supabase"
  exit 1
fi

# Check if SQL file exists
SQL_FILE="docs/EMERGENCY_AUTH_FIX.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}Error: SQL file not found: $SQL_FILE${NC}"
  exit 1
fi

# Get database URL based on environment
case "$ENVIRONMENT" in
  production)
    if [ -z "${SUPABASE_PRODUCTION_DB_URL:-}" ]; then
      echo -e "${RED}Error: SUPABASE_PRODUCTION_DB_URL environment variable not set${NC}"
      echo ""
      echo "Get your database URL from:"
      echo "1. Go to https://supabase.com/dashboard"
      echo "2. Select your project"
      echo "3. Go to Project Settings > Database"
      echo "4. Copy the 'Connection string' under 'Connection pooling' (transaction mode)"
      echo ""
      echo "Then export SUPABASE_PRODUCTION_DB_URL and run:"
      echo "  $0 production"
      exit 1
    fi
    DB_URL="$SUPABASE_PRODUCTION_DB_URL"
    ;;
  staging)
    if [ -z "${SUPABASE_STAGING_DB_URL:-}" ]; then
      echo -e "${RED}Error: SUPABASE_STAGING_DB_URL environment variable not set${NC}"
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
    echo -e "${YELLOW}Using local Supabase (make sure 'supabase start' is running)${NC}"
    ;;
esac

# Confirmation prompt for production
if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${YELLOW}⚠️  WARNING: You are about to modify the PRODUCTION database${NC}"
  echo ""
  echo "This script will:"
  echo "  1. Create the 'userrole' enum type"
  echo "  2. Update the public.user.role column"
  echo "  3. Update the sync_user_from_auth() function"
  echo "  4. Verify triggers are in place"
  echo ""
  read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
  echo
  if [[ ! $REPLY = "yes" ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
  fi
fi

# Apply the fix
echo -e "${GREEN}Applying emergency auth fix...${NC}"
echo ""

if psql "$DB_URL" < "$SQL_FILE"; then
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✓ Fix applied successfully!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Test OAuth signup at https://nex-t1.ai"
  echo "  2. Check Supabase Auth logs for errors"
  echo "  3. Verify schema with: psql \"$DB_URL\" -c \"SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole')\""
  echo ""
else
  echo ""
  echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}✗ Fix failed to apply${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check database URL is correct"
  echo "  2. Verify you have postgres role permissions"
  echo "  3. Check Supabase dashboard for connection issues"
  echo "  4. Review SQL file for syntax errors"
  echo ""
  exit 1
fi
