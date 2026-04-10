/**
 * Helpers to detect and clean tool-planning noise from assistant-visible text.
 */

const TOOL_PLANNING_KEYWORDS = [
  "Intent:",
  "Tool:",
  "TOOL PATH:",
  "Tool args:",
  "toolCalls",
  "cacheable",
  "Preparing transaction:",
];

const LINE_DROP_PATTERNS = [
  /^\s*(?:\*\*)?(?:Intent|Tool|Mode|Reasoning|Approval)(?:\*\*)?:\s.*$/i,
  /^\s*TOOL PATH:\s.*$/i,
  /^\s*Preparing transaction:\s.*$/i,
  /^\s*Preparing to\b.*$/i,
  /^\s*Submitting for approval\.?\s*$/i,
] as const;

const TOOL_ARGS_HEADER_ONLY_PATTERN = /^\s*Tool args(?:\s*\([^)]+\))?:\s*$/i;
const TOOL_ARGS_INLINE_PATTERN = /^\s*Tool args(?:\s*\([^)]+\))?:.*$/i;
const TOOL_ARGS_ITEM_PATTERN = /^\s*[-*]\s+[A-Za-z0-9_.-]+\s*:/;

function normalizePlanningBoundaries(text: string): string {
  return text.replace(
    /([^\n])(?=(?:\*\*Intent\*\*:|Intent:|\*\*Tool\*\*:|Tool:|TOOL PATH:|Tool args(?:\s*\([^)]+\))?:|Preparing transaction:|Preparing to\b))/gi,
    "$1\n",
  );
}

export const isStructuredNoise = (text: string): boolean => {
  if (!text) return false;
  if (/[{[\]}]|"\w+"\s*:/.test(text)) return true;
  if (/agent|features|sources|toolCalls/i.test(text)) return true;
  return false;
};

export const isToolPlanningNoise = (text: string): boolean => {
  if (!text) return false;
  return (
    TOOL_PLANNING_KEYWORDS.some((keyword) => text.includes(keyword)) ||
    /\{\s*"(name|arguments|toolCalls)"/.test(text)
  );
};

export function sanitizeAssistantTranscriptText(text: string): string {
  if (!text) {
    return "";
  }

  let cleaned = normalizePlanningBoundaries(text);

  cleaned = cleaned.replace(
    /^TOOL PATH:\s*(?:Fast|Standard|Deep)\.\s*(?:Execute [^.]+ immediately\.|Direct response, no tool needed\.|Primary:[^.]+\.(?:\s*Fallback:[^.]+\.)?|\s*Evaluate available tools for best match\.|Plan sequence:[^.]+\.\s*Validate each step\.)\s*/gim,
    "",
  );
  cleaned = cleaned.replace(
    /Intent:.*?(?:Execute|Execute with)[^}]*\{[^}]*\}/gs,
    "",
  );
  cleaned = cleaned.replace(
    /\{\s*"toolCalls"\s*:[\s\S]*?"cacheable"\s*:\s*(true|false)\s*\}/g,
    "",
  );

  const lines = cleaned.split("\n");
  const sanitizedLines: string[] = [];
  let droppingToolArgs = false;

  for (const line of lines) {
    if (TOOL_ARGS_HEADER_ONLY_PATTERN.test(line)) {
      droppingToolArgs = true;
      continue;
    }

    if (TOOL_ARGS_INLINE_PATTERN.test(line)) {
      droppingToolArgs = false;
      continue;
    }

    if (droppingToolArgs) {
      if (TOOL_ARGS_ITEM_PATTERN.test(line) || /^\s*[-*]\s/.test(line)) {
        continue;
      }

      if (line.trim().length === 0) {
        continue;
      }

      droppingToolArgs = false;
    }

    if (LINE_DROP_PATTERNS.some((pattern) => pattern.test(line))) {
      continue;
    }

    sanitizedLines.push(line);
  }

  return sanitizedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const cleanToolPlanningOutput = sanitizeAssistantTranscriptText;
