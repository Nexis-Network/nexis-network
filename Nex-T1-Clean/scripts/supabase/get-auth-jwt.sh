#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Get a Supabase authenticated JWT (access_token) for API testing.

Usage:
  scripts/supabase/get-auth-jwt.sh --email EMAIL --password PASSWORD [options]

Options:
  --email EMAIL                User email (required)
  --password PASSWORD          User password (required)
  --auto-confirm               If login fails with email_not_confirmed, try admin confirm flow
  --create-if-missing          With --auto-confirm, create user via admin API when missing
  --output-file PATH           Token output file (default: .sb-pentest-evidence/05-auth-audit/authenticated-tests/raw/runtime-jwt.token)
  --summary-file PATH          JSON summary file (default: .sb-pentest-evidence/05-auth-audit/authenticated-tests/raw/runtime-jwt-summary.json)
  --print-token                Print token to stdout (off by default)
  -h, --help                   Show this help

Environment:
  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY (preferred) or SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY (required only for --auto-confirm flow)

Notes:
  - This script does not generate JWTs locally.
  - It obtains JWTs from Supabase Auth (/auth/v1/token).
  - JWKS public keys are for verification only, not signing.
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

EMAIL=""
PASSWORD=""
AUTO_CONFIRM=false
CREATE_IF_MISSING=false
PRINT_TOKEN=false

DEFAULT_DIR=".sb-pentest-evidence/05-auth-audit/authenticated-tests/raw"
OUTPUT_FILE="${DEFAULT_DIR}/runtime-jwt.token"
SUMMARY_FILE="${DEFAULT_DIR}/runtime-jwt-summary.json"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --password)
      PASSWORD="${2:-}"
      shift 2
      ;;
    --auto-confirm)
      AUTO_CONFIRM=true
      shift
      ;;
    --create-if-missing)
      CREATE_IF_MISSING=true
      shift
      ;;
    --output-file)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    --summary-file)
      SUMMARY_FILE="${2:-}"
      shift 2
      ;;
    --print-token)
      PRINT_TOKEN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "--email and --password are required" >&2
  usage
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or ANON key env vars" >&2
  exit 1
fi

if [[ "$SUPABASE_URL" != http*://* ]]; then
  SUPABASE_URL="https://${SUPABASE_URL}"
fi
SUPABASE_URL="${SUPABASE_URL%/}"

mkdir -p "$(dirname "$OUTPUT_FILE")" "$(dirname "$SUMMARY_FILE")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LOGIN_CODE=0
LOGIN_ERROR=""
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
ADMIN_LIST_CODE=0
ADMIN_CONFIRM_CODE=0
ADMIN_CREATE_CODE=0
AUTO_CONFIRM_APPLIED=false
ADMIN_USER_ID=""

do_password_login() {
  local out_json="$1"
  local out_headers="$2"
  local code
  code=$(curl -sS -D "$out_headers" -o "$out_json" -w '%{http_code}' \
    -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  echo "$code"
}

get_user_id_by_email_admin() {
  local list_json="$1"
  local list_headers="$2"
  local code
  code=$(curl -sS -D "$list_headers" -o "$list_json" -w '%{http_code}' \
    -X GET "$SUPABASE_URL/auth/v1/admin/users?per_page=1000&page=1" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")
  ADMIN_LIST_CODE="$code"
  if [ "$code" != "200" ]; then
    ADMIN_USER_ID=""
    return 0
  fi
  ADMIN_USER_ID="$(jq -r --arg email "$EMAIL" '
    (if type=="array" then . else (.users // []) end)
    | map(select((.email // "") == $email))
    | .[0].id // ""
  ' "$list_json")"
}

confirm_user_admin() {
  local user_id="$1"
  local out_json="$2"
  local out_headers="$3"
  local code
  code=$(curl -sS -D "$out_headers" -o "$out_json" -w '%{http_code}' \
    -X PUT "$SUPABASE_URL/auth/v1/admin/users/$user_id" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    --data-raw '{"email_confirm":true}')
  ADMIN_CONFIRM_CODE="$code"
}

create_user_admin() {
  local out_json="$1"
  local out_headers="$2"
  local code
  code=$(curl -sS -D "$out_headers" -o "$out_json" -w '%{http_code}' \
    -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}")
  ADMIN_CREATE_CODE="$code"
}

LOGIN_CODE="$(do_password_login "$TMP_DIR/login.json" "$TMP_DIR/login.headers")"
ACCESS_TOKEN="$(jq -r '.access_token // ""' "$TMP_DIR/login.json")"
REFRESH_TOKEN="$(jq -r '.refresh_token // ""' "$TMP_DIR/login.json")"
LOGIN_ERROR="$(jq -r '.error_code // .msg // .message // ""' "$TMP_DIR/login.json")"
USER_ID="$(jq -r '.user.id // ""' "$TMP_DIR/login.json")"

if [ -z "$ACCESS_TOKEN" ] && [ "$AUTO_CONFIRM" = true ] && [ "$LOGIN_ERROR" = "email_not_confirmed" ]; then
  if [ -z "$SERVICE_KEY" ]; then
    echo "Login failed with email_not_confirmed and SUPABASE_SERVICE_ROLE_KEY is not set." >&2
  else
    get_user_id_by_email_admin "$TMP_DIR/admin-list.json" "$TMP_DIR/admin-list.headers"
    if [ -z "$ADMIN_USER_ID" ] && [ "$CREATE_IF_MISSING" = true ] && [ "$ADMIN_LIST_CODE" = "200" ]; then
      create_user_admin "$TMP_DIR/admin-create.json" "$TMP_DIR/admin-create.headers"
      ADMIN_USER_ID="$(jq -r '.id // .user.id // ""' "$TMP_DIR/admin-create.json")"
    fi
    if [ -n "$ADMIN_USER_ID" ]; then
      confirm_user_admin "$ADMIN_USER_ID" "$TMP_DIR/admin-confirm.json" "$TMP_DIR/admin-confirm.headers"
      if [ "$ADMIN_CONFIRM_CODE" = "200" ] || [ "$ADMIN_CONFIRM_CODE" = "204" ]; then
        AUTO_CONFIRM_APPLIED=true
      fi
    fi
    LOGIN_CODE="$(do_password_login "$TMP_DIR/login2.json" "$TMP_DIR/login2.headers")"
    ACCESS_TOKEN="$(jq -r '.access_token // ""' "$TMP_DIR/login2.json")"
    REFRESH_TOKEN="$(jq -r '.refresh_token // ""' "$TMP_DIR/login2.json")"
    LOGIN_ERROR="$(jq -r '.error_code // .msg // .message // ""' "$TMP_DIR/login2.json")"
    USER_ID="$(jq -r '.user.id // ""' "$TMP_DIR/login2.json")"
  fi
fi

if [ -z "$ACCESS_TOKEN" ]; then
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg email "$EMAIL" \
    --argjson login_code "${LOGIN_CODE:-0}" \
    --arg login_error "$LOGIN_ERROR" \
    --argjson admin_list_code "${ADMIN_LIST_CODE:-0}" \
    --argjson admin_confirm_code "${ADMIN_CONFIRM_CODE:-0}" \
    --argjson admin_create_code "${ADMIN_CREATE_CODE:-0}" \
    --argjson auto_confirm_applied "$AUTO_CONFIRM_APPLIED" \
    --arg result "failed" \
    '{
      timestamp: $timestamp,
      result: $result,
      email: $email,
      login_code: $login_code,
      login_error: $login_error,
      auto_confirm_attempted: true,
      auto_confirm_applied: $auto_confirm_applied,
      admin_list_code: $admin_list_code,
      admin_confirm_code: $admin_confirm_code,
      admin_create_code: $admin_create_code
    }' > "$SUMMARY_FILE"
  echo "Failed to obtain access token. See $SUMMARY_FILE" >&2
  exit 1
fi

printf '%s' "$ACCESS_TOKEN" > "$OUTPUT_FILE"

jq -n \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg email "$EMAIL" \
  --arg user_id "$USER_ID" \
  --arg output_file "$OUTPUT_FILE" \
  --argjson login_code "${LOGIN_CODE:-0}" \
  --argjson admin_list_code "${ADMIN_LIST_CODE:-0}" \
  --argjson admin_confirm_code "${ADMIN_CONFIRM_CODE:-0}" \
  --argjson admin_create_code "${ADMIN_CREATE_CODE:-0}" \
  --argjson auto_confirm_applied "$AUTO_CONFIRM_APPLIED" \
  --arg result "success" \
  '{
    timestamp: $timestamp,
    result: $result,
    email: $email,
    user_id: $user_id,
    login_code: $login_code,
    auto_confirm_applied: $auto_confirm_applied,
    admin_list_code: $admin_list_code,
    admin_confirm_code: $admin_confirm_code,
    admin_create_code: $admin_create_code,
    token_output_file: $output_file
  }' > "$SUMMARY_FILE"

echo "Access token written to: $OUTPUT_FILE"
echo "Summary written to: $SUMMARY_FILE"

if [ "$PRINT_TOKEN" = true ]; then
  echo "$ACCESS_TOKEN"
fi
