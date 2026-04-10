#!/bin/bash
# Guard: Warn when using getSupabaseAdminClient (bypasses RLS)
CONTENT="${CLAUDE_TOOL_ARG_content:-}${CLAUDE_TOOL_ARG_new_string:-}"
if echo "$CONTENT" | grep -q "getSupabaseAdminClient"; then
  echo "WARN: getSupabaseAdminClient bypasses RLS. Justify why getSupabaseServerClient({ accessToken }) cannot be used."
fi
exit 0
