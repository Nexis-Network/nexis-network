/**
 * Nex Subagent Tool Permission Scoping
 *
 * Enforces per-subagent tool access control. Each agent type has a
 * default allowlist/denylist, and individual subagent instances can
 * further restrict permissions via their AgentContext.toolPermissions.
 *
 * Security invariant: subagents can never escalate beyond their parent's
 * tool set. The permission system only narrows, never widens.
 *
 * MCP tools (prefixed with "mcp__") are subject to the same permission
 * checks. By default, all MCP tools are denied for subagents unless
 * explicitly allowed via toolPermissions allowlist. This prevents
 * unintended access to external services through MCP servers.
 */

import type { AgentContext, NexAgentType } from "./context";

// ---------------------------------------------------------------------------
// Tool Definition (minimal interface for filtering)
// ---------------------------------------------------------------------------

/**
 * Minimal tool shape required for permission filtering.
 * Compatible with the AI SDK Tool type.
 */
export type FilterableTool = {
  readonly name?: string;
  [key: string]: unknown;
};

type ToolEntry = readonly [name: string, tool: FilterableTool];

// ---------------------------------------------------------------------------
// Disallowed Tools
// ---------------------------------------------------------------------------

/**
 * Tools that NO subagent may ever invoke, regardless of configuration.
 * These are reserved for the root/parent orchestrator only.
 */
export const DISALLOWED_SUBAGENT_TOOLS: ReadonlySet<string> = new Set([
  // Subagents must not spawn other subagents (prevents unbounded recursion)
  "subagent",
  "spawn_agent",
  // Session lifecycle is parent-only
  "session_end",
  "session_start",
  // Permission escalation is forbidden
  "grant_permission",
  "modify_permissions",
  // Cost/billing controls are parent-only
  "set_budget",
  "modify_budget",
]);

// ---------------------------------------------------------------------------
// MCP Tool Prefix
// ---------------------------------------------------------------------------

/**
 * MCP tools follow the naming convention "mcp__<server>__<tool>".
 * These are denied by default for subagents unless explicitly allowlisted
 * in the agent's toolPermissions.
 */
const MCP_TOOL_PREFIX = "mcp__";

// ---------------------------------------------------------------------------
// Per-Agent-Type Defaults
// ---------------------------------------------------------------------------

/**
 * Additional tools denied to specific agent types.
 * These are merged with DISALLOWED_SUBAGENT_TOOLS at check time.
 */
const AGENT_TYPE_DENIED_TOOLS: Readonly<Record<NexAgentType, ReadonlySet<string>>> = {
  worker: new Set([
    // Workers should not coordinate — that is the coordinator's job
    "coordinator",
    "orchestrator",
  ]),
  coordinator: new Set([
    // Coordinators plan but do not execute low-level ops
    "bash",
    "shell",
  ]),
  analyst: new Set([
    // Analysts are read-only; they must not mutate state
    "write_file",
    "edit_file",
    "bash",
    "shell",
    "deploy",
  ]),
  general: new Set([
    // General agents have no additional restrictions beyond the global denylist
  ]),
};

// ---------------------------------------------------------------------------
// Permission Checking
// ---------------------------------------------------------------------------

/**
 * Checks whether a specific tool is permitted for the given agent context.
 *
 * Resolution order:
 * 1. Global denylist (DISALLOWED_SUBAGENT_TOOLS) — always blocked
 * 2. Agent-type denylist — blocked if the agent type forbids it
 * 3. MCP tools — blocked by default unless explicitly allowlisted
 * 4. Explicit allowlist — if `toolPermissions` is non-empty, the tool
 *    must appear in it (allowlist mode)
 * 5. Otherwise: allowed
 */
export function canAgentUseTool(
  toolName: string,
  agentContext: AgentContext,
): boolean {
  // 1. Global denylist
  if (DISALLOWED_SUBAGENT_TOOLS.has(toolName)) {
    return false;
  }

  // 2. Agent-type denylist
  const typeDenied = AGENT_TYPE_DENIED_TOOLS[agentContext.agentType];
  if (typeDenied?.has(toolName)) {
    return false;
  }

  // 3. MCP tools are denied by default — they must be explicitly allowlisted.
  // This prevents subagents from accessing external MCP servers
  // (databases, browsers, deployment tools, etc.) without explicit grant.
  if (toolName.startsWith(MCP_TOOL_PREFIX)) {
    if (agentContext.toolPermissions.length === 0) {
      return false;
    }
    // Fall through to allowlist check below
  }

  // 4. Explicit allowlist (if configured)
  if (agentContext.toolPermissions.length > 0) {
    // Build a Set for O(1) lookup when there are multiple permissions.
    // For very small lists the overhead is negligible; for larger lists
    // this avoids repeated O(n) Array.includes scans.
    const allowSet = buildAllowSet(agentContext.toolPermissions);
    return allowSet.has(toolName);
  }

  // 5. Default: allowed (non-MCP tools with no explicit allowlist)
  return true;
}

/**
 * Builds a Set from the toolPermissions array for efficient lookups.
 * Uses a WeakMap cache keyed by the frozen toolPermissions array to avoid
 * reconstructing the Set on every call for the same context.
 */
const allowSetCache = new WeakMap<ReadonlyArray<string>, ReadonlySet<string>>();

function buildAllowSet(permissions: ReadonlyArray<string>): ReadonlySet<string> {
  let cached = allowSetCache.get(permissions);
  if (!cached) {
    cached = new Set(permissions);
    allowSetCache.set(permissions, cached);
  }
  return cached;
}

/**
 * Filters a tool record to only include tools the agent is permitted to use.
 *
 * @param allTools - The full toolset (name -> tool mapping)
 * @param agentContext - The subagent's context with permissions
 * @returns A new record containing only permitted tools
 */
export function filterToolsForAgent(
  allTools: Record<string, FilterableTool>,
  agentContext: AgentContext,
): Record<string, FilterableTool> {
  const entries: ToolEntry[] = [];

  for (const [name, tool] of Object.entries(allTools)) {
    if (canAgentUseTool(name, agentContext)) {
      entries.push([name, tool]);
    }
  }

  return Object.fromEntries(entries);
}

/**
 * Returns a human-readable summary of denied tools for an agent context.
 * Useful for logging and debugging permission issues.
 */
export function getDeniedToolsSummary(agentContext: AgentContext): string[] {
  const denied: string[] = [...DISALLOWED_SUBAGENT_TOOLS];

  const typeDenied = AGENT_TYPE_DENIED_TOOLS[agentContext.agentType];
  if (typeDenied) {
    denied.push(...typeDenied);
  }

  // Note: MCP tools are denied by default but are dynamic, so they
  // cannot be enumerated here. The summary covers static deny rules only.

  return [...new Set(denied)].sort();
}
