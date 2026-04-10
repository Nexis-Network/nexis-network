/**
 * Chat Pipeline Middleware / Hook System -- Type Definitions
 *
 * Defines the hook event taxonomy, hook command types, and result contracts.
 * Modeled on enterprise agentic patterns with typed events and JSON output validation.
 */

// ---------------------------------------------------------------------------
// Hook Events
// ---------------------------------------------------------------------------

export const HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
  "SessionStart",
  "SessionEnd",
  "PreCompact",
  "PostCompact",
  "PermissionRequest",
  "SubagentStart",
  "SubagentStop",
] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

// ---------------------------------------------------------------------------
// Hook Commands (what runs when a hook fires)
// ---------------------------------------------------------------------------

export type HookCommandBase = {
  /** Optional status message shown to user during execution */
  statusMessage?: string;
  /** Timeout in seconds (default: 30, must be positive, max: 300) */
  timeout?: number;
  /** If true, run once and auto-remove */
  once?: boolean;
  /** Condition filter -- only fire if tool name matches this pattern */
  if?: string;
};

export type ShellHookCommand = HookCommandBase & {
  type: "command";
  /** Shell command to execute (must be non-empty) */
  command: string;
};

export type HttpHookCommand = HookCommandBase & {
  type: "http";
  /** Endpoint URL (must be a valid http/https URL) */
  url: string;
  /** Custom headers (env var interpolation with $VAR_NAME) */
  headers?: Record<string, string>;
};

export type PromptHookCommand = HookCommandBase & {
  type: "prompt";
  /** LLM prompt -- use $ARGUMENTS for input injection */
  prompt: string;
  /** Model override (default: fast/cheap model) */
  model?: string;
};

export type HookCommand = ShellHookCommand | HttpHookCommand | PromptHookCommand;

// ---------------------------------------------------------------------------
// Hook Matchers (which hooks run for which events)
// ---------------------------------------------------------------------------

export type HookMatcher = {
  /** Optional pattern to match (e.g., tool name for PreToolUse) */
  matcher?: string;
  /** Hooks to execute when the event + matcher fire */
  hooks: HookCommand[];
};

/** Top-level hook configuration -- maps events to matcher arrays */
export type HooksConfig = Partial<Record<HookEvent, HookMatcher[]>>;

// ---------------------------------------------------------------------------
// Hook Input (data passed to hooks)
// ---------------------------------------------------------------------------

export type BaseHookInput = {
  hook_event_name: HookEvent;
  session_id: string | null;
  user_id: string | null;
  timestamp: string;
};

export type PreToolUseHookInput = BaseHookInput & {
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: UntypedJson;
  tool_category: string;
  requires_approval: boolean;
};

export type PostToolUseHookInput = BaseHookInput & {
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: UntypedJson;
  tool_output: UntypedJson;
  tool_category: string;
  duration_ms: number;
};

export type PostToolUseFailureHookInput = BaseHookInput & {
  hook_event_name: "PostToolUseFailure";
  tool_name: string;
  tool_input: UntypedJson;
  error_message: string;
  error_category: string;
};

export type StopHookInput = BaseHookInput & {
  hook_event_name: "Stop";
  assistant_response: string;
  tool_calls_count: number;
  turn_number: number;
};

export type SessionStartHookInput = BaseHookInput & {
  hook_event_name: "SessionStart";
};

export type SessionEndHookInput = BaseHookInput & {
  hook_event_name: "SessionEnd";
  total_turns: number;
  total_tool_calls: number;
};

export type PreCompactHookInput = BaseHookInput & {
  hook_event_name: "PreCompact";
};

export type PostCompactHookInput = BaseHookInput & {
  hook_event_name: "PostCompact";
};

export type PermissionRequestHookInput = BaseHookInput & {
  hook_event_name: "PermissionRequest";
  tool_name: string;
  tool_input: UntypedJson;
};

export type SubagentStartHookInput = BaseHookInput & {
  hook_event_name: "SubagentStart";
  agent_type: string;
};

export type SubagentStopHookInput = BaseHookInput & {
  hook_event_name: "SubagentStop";
  agent_type: string;
};

export type HookInput =
  | PreToolUseHookInput
  | PostToolUseHookInput
  | PostToolUseFailureHookInput
  | StopHookInput
  | SessionStartHookInput
  | SessionEndHookInput
  | PreCompactHookInput
  | PostCompactHookInput
  | PermissionRequestHookInput
  | SubagentStartHookInput
  | SubagentStopHookInput;

// ---------------------------------------------------------------------------
// Hook Output (what hooks return)
// ---------------------------------------------------------------------------

export type HookDecision = "approve" | "block" | "ask";

export type HookOutput = {
  /** Whether to continue processing subsequent hooks (default: true) */
  continue?: boolean;
  /** Permission decision for PreToolUse hooks */
  decision?: HookDecision;
  /** Reason for blocking or asking */
  reason?: string;
  /** System message to inject into conversation context */
  systemMessage?: string;
  /** Updated tool input (PreToolUse can modify input) */
  updatedInput?: Record<string, unknown>;
  /** Additional context to inject */
  additionalContext?: string;
  /** Whether this hook's output should be suppressed from the transcript */
  suppressOutput?: boolean;
};

// ---------------------------------------------------------------------------
// Hook Result (internal tracking)
// ---------------------------------------------------------------------------

export type HookResultOutcome = "success" | "error" | "timeout" | "blocked";

export type HookResult = {
  hookName: string;
  hookEvent: HookEvent;
  outcome: HookResultOutcome;
  output: HookOutput | null;
  durationMs: number;
  error?: string;
};

export type AggregatedHookResult = {
  results: HookResult[];
  /** True if any hook returned decision=block */
  blocked: boolean;
  /** The blocking reason (from the first blocker) */
  blockReason?: string;
  /** True if any hook returned continue=false */
  preventContinuation: boolean;
  /** Merged additional context from all hooks */
  additionalContext: string | null;
  /** Merged updated input from all hooks (last write wins) */
  updatedInput: Record<string, unknown> | null;
  /** System messages from all hooks */
  systemMessages: string[];
  /** Total time spent in hooks */
  totalDurationMs: number;
};
