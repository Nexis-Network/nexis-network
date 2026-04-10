#!/bin/bash
# Guard: Block introduction of 'any' types
CONTENT="${CLAUDE_TOOL_ARG_content:-}${CLAUDE_TOOL_ARG_new_string:-}"
if echo "$CONTENT" | grep -qE ':\s*any[^A-Za-z]|as\s+any[^A-Za-z]|<any>'; then
  echo "BLOCK: Detected 'any' type. Use a specific type, unknown, or Record<string, unknown>."
  exit 1
fi
exit 0
