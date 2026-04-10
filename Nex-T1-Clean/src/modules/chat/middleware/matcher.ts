/**
 * Hook Matcher -- Pattern matching and condition evaluation for hook dispatch
 *
 * Determines which hooks should fire for a given event by matching
 * event type, tool name patterns, and conditional expressions.
 */

import type {
  HookEvent,
  HookInput,
  HookMatcher,
  HookCommand,
} from "./types";

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Tests whether a value matches a simple glob pattern.
 *
 * Supported wildcards:
 * - `*` matches any sequence of characters (including empty)
 * - `?` matches exactly one character
 *
 * All other regex-significant characters are escaped.
 * Returns true if no pattern is provided (match-all).
 */
export function matchesPattern(
  pattern: string | undefined,
  value: string,
): boolean {
  if (pattern === undefined || pattern === null) return true;
  if (pattern === "") return value === "";

  // Escape regex special chars, then convert glob wildcards
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return regex.test(value);
}

/**
 * Extracts the matcher-relevant value from a hook input.
 * For tool-related events, this is the tool name.
 * For subagent events, this is the agent type.
 * For other events, returns undefined (no matching target).
 */
export function getMatcherValue(input: HookInput): string | undefined {
  switch (input.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
      return (input as { tool_name: string }).tool_name;
    case "PermissionRequest":
      return (input as { tool_name: string }).tool_name;
    case "SubagentStart":
    case "SubagentStop":
      return (input as { agent_type: string }).agent_type;
    default:
      return undefined;
  }
}

/**
 * Evaluates a hook's `if` condition against the current input.
 *
 * Supports two forms:
 * - `ToolName(argPattern)` -- matches tool name AND first argument
 * - `pattern` -- matches tool name only
 */
export function evaluateCondition(
  condition: string | undefined,
  input: HookInput,
): boolean {
  if (!condition) return true;

  // Parse condition like "Bash(git *)" or "wallet_*"
  const parenMatch = condition.match(/^(\w+)\((.+)\)$/);
  if (parenMatch) {
    const [, toolPattern, argPattern] = parenMatch;
    if (!toolPattern || !argPattern) return false;

    const matchValue = getMatcherValue(input);
    if (matchValue === undefined) return false;
    if (!matchesPattern(toolPattern, matchValue)) return false;

    // Check argument pattern against first string arg
    if ("tool_input" in input) {
      const toolInput = (input as { tool_input: UntypedJson }).tool_input;
      const firstArg =
        typeof toolInput === "string"
          ? toolInput
          : typeof toolInput === "object" && toolInput !== null
            ? JSON.stringify(toolInput).slice(0, 200)
            : "";
      return matchesPattern(argPattern, firstArg);
    }
    return true;
  }

  // Simple pattern match against tool name
  const matchValue = getMatcherValue(input);
  if (matchValue === undefined) return true; // Non-tool events pass unconditional checks
  return matchesPattern(condition, matchValue);
}

// ---------------------------------------------------------------------------
// Hook filtering
// ---------------------------------------------------------------------------

/**
 * Finds all hooks matching the given event and input.
 * Returns matched hooks in declaration order for sequential execution.
 */
export function getMatchingHooks(
  config: Partial<Record<HookEvent, HookMatcher[]>>,
  event: HookEvent,
  input: HookInput,
): Array<{ matcher: HookMatcher; hook: HookCommand }> {
  const matchers = config[event];
  if (!matchers) return [];

  const results: Array<{ matcher: HookMatcher; hook: HookCommand }> = [];

  for (const matcher of matchers) {
    const matchValue = getMatcherValue(input);
    // If the matcher has a pattern but the event has no matchable value, skip
    if (matcher.matcher !== undefined && matchValue === undefined) continue;
    if (!matchesPattern(matcher.matcher, matchValue ?? "")) continue;

    for (const hook of matcher.hooks) {
      if (!evaluateCondition(hook.if, input)) continue;
      results.push({ matcher, hook });
    }
  }

  return results;
}
