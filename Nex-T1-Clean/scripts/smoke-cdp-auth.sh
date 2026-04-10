#!/usr/bin/env bash
# scripts/smoke-cdp-auth.sh — CDP Auth endpoint health check
# Usage: ./scripts/smoke-cdp-auth.sh [BASE_URL]
# Default BASE_URL: https://nex-t1.ai

set -euo pipefail

BASE="${1:-https://nex-t1.ai}"
PASS=0
FAIL=0

check() {
  local label="$1" url="$2" method="${3:-GET}" expected_status="${4:-200}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
    -H "Content-Type: application/json" --max-time 10 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "✅ PASS  $label (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL  $label (expected $expected_status, got $status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 CDP Auth Smoke Tests — $BASE"
echo "───────────────────────────────────────────"

# 1. JWKS endpoint — public, should return 200 with no auth
check "JWKS endpoint (no auth)" "$BASE/api/auth/cdp/.well-known/jwks.json"

# 2. JWKS has valid keys array
JWKS_BODY=$(curl -s "$BASE/api/auth/cdp/.well-known/jwks.json" --max-time 10 2>/dev/null || echo "{}")
if echo "$JWKS_BODY" | grep -q '"keys"'; then
  echo "✅ PASS  JWKS contains 'keys' array"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL  JWKS missing 'keys' array: $JWKS_BODY"
  FAIL=$((FAIL + 1))
fi

# 3. CDP token endpoint — requires auth, should return 401 without session (not 500)
check "CDP token (no auth → 401)" "$BASE/api/auth/cdp/token" POST 401

# 4. OAuth start route — should redirect (307) or be reachable (not 500/503)
OAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L --max-redirs 0 \
  "$BASE/api/auth/oauth/google/start" --max-time 10 2>/dev/null || echo "000")
if [[ "$OAUTH_STATUS" =~ ^[23] ]]; then
  echo "✅ PASS  OAuth google/start reachable (HTTP $OAUTH_STATUS)"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL  OAuth google/start unreachable (HTTP $OAUTH_STATUS)"
  FAIL=$((FAIL + 1))
fi

# 5. Wallet provision — requires auth, should return 401 without session (not 500)
check "Wallet provision (no auth → 401)" "$BASE/api/wallets/cdp/provision" POST 401

echo "───────────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
