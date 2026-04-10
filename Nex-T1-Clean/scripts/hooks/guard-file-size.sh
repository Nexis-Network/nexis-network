#!/bin/bash
# Guard: Block edits to files exceeding 500 LOC without splitting proposal
FILE="$CLAUDE_TOOL_ARG_file_path"
if [ -z "$FILE" ]; then exit 0; fi
if [ ! -f "$FILE" ]; then exit 0; fi
LINES=$(wc -l < "$FILE" 2>/dev/null || echo 0)
if [ "$LINES" -gt 500 ]; then
  echo "WARN: File $FILE is $LINES lines (limit: 500). Propose splitting into smaller modules before editing."
fi
exit 0
