#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-redis-cache}"
TARGET_SERVICE="${2:-frontend}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
REDIS_PRIVATE_HOST="${REDIS_PRIVATE_HOST:-redis.railway.internal}"
REDIS_PRIVATE_PORT="${REDIS_PRIVATE_PORT:-6379}"
REDIS_USERNAME="${REDIS_USERNAME:-default}"

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install it from https://docs.railway.com/cli before running this script." >&2
  exit 1
fi

echo "Ensuring Redis service '${SERVICE_NAME}' exists in environment '${RAILWAY_ENVIRONMENT}'..."
railway add --service "${SERVICE_NAME}" redis >/dev/null 2>&1 || true

echo "Linking Redis connection settings to service '${TARGET_SERVICE}'..."

PRIVATE_REDIS_URL="redis://${REDIS_USERNAME}:\${{${SERVICE_NAME}.REDIS_PASSWORD}}@${REDIS_PRIVATE_HOST}:${REDIS_PRIVATE_PORT}"

railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" NEX_REDIS_URL="${PRIVATE_REDIS_URL}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" SHARED_CACHE_URL="${PRIVATE_REDIS_URL}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" REDIS_URL="\${{${SERVICE_NAME}.REDIS_URL}}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" REDIS_HOST="\${{${SERVICE_NAME}.REDIS_HOST}}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" REDIS_PORT="\${{${SERVICE_NAME}.REDIS_PORT}}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" REDIS_PASSWORD="\${{${SERVICE_NAME}.REDIS_PASSWORD}}"
railway variables set --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" REDIS_TLS_URL="\${{${SERVICE_NAME}.REDIS_TLS_URL}}"

echo "Seeding Redis with required hashes via service '${TARGET_SERVICE}'..."
railway run --environment "${RAILWAY_ENVIRONMENT}" --service "${TARGET_SERVICE}" pnpm run redis:bootstrap

echo "Redis provisioning complete. Deploy the '${TARGET_SERVICE}' service to pick up the new environment variables."
