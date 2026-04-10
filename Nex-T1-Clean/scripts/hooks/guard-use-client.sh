#!/bin/bash
# Guard: Warn when adding 'use client' directive
CONTENT="${CLAUDE_TOOL_ARG_content:-}${CLAUDE_TOOL_ARG_new_string:-}"
if echo "$CONTENT" | grep -q "'use client'"; then
  echo "WARN: Adding 'use client'. Justify why this cannot be a Server Component (hooks, event listeners, browser APIs?)."
fi
exit 0
