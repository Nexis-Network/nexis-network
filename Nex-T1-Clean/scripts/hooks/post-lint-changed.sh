#!/bin/bash
# Post-edit: Run ESLint on changed file
FILE="${CLAUDE_TOOL_ARG_file_path:-}"
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  cd /Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Clean 2>/dev/null || exit 0
  npx eslint "$FILE" --max-warnings 0 2>&1 | tail -20
fi
exit 0
