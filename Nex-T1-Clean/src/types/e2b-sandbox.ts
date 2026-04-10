/**
 * Shared type definitions for E2B sandbox and MCP integration code.
 *
 * These types supplement the `@e2b/code-interpreter` and `e2b` package types
 * where the project needs tighter typing for Supabase join results, tool
 * execution contexts, and sandbox helper patterns.
 */

// ============================================================================
// Supabase MCP Registry Join Types
// ============================================================================

/**
 * Shape returned by a Supabase foreign-key join on `mcp_registry` when
 * selecting specific columns from `user_mcp_config`.
 */
export interface McpRegistryJoinRow {
  name: string;
  sre_url: string;
  transport: string | null;
  tool_allowlist: string[] | null;
  is_public: boolean | null;
}

/**
 * A row from the `user_mcp_config` table with the joined `mcp_registry`
 * columns embedded. Supabase may return the join as a single object or
 * an array depending on the relationship cardinality.
 */
export interface UserMcpConfigJoinRow {
  enabled: boolean;
  config_overrides: Record<string, UntypedJson> | null;
  mcp_registry: McpRegistryJoinRow | McpRegistryJoinRow[] | null;
}

// ============================================================================
// Tool Execution Mock Context (for test scripts)
// ============================================================================

/**
 * Minimal context shape expected by the E2B MCP tool `execute` functions
 * during testing. Matches the AI SDK tool execution context signature.
 */
export interface MockToolContext {
  toolCallId: string;
  metadata?: {
    sandbox_id?: string | undefined;
  };
}

// ============================================================================
// E2B MCP URL Helper
// ============================================================================

/** Default port the MCP bridge listens on inside E2B sandboxes. */
export const E2B_MCP_BRIDGE_PORT = 50005;

/**
 * Build the MCP URL for an E2B sandbox.
 *
 * Tries the SDK's `getMcpUrl()` first; falls back to constructing the URL
 * from `sandboxId` and `sandboxDomain`.
 */
export function buildSandboxMcpUrl(
  sandbox: { getMcpUrl(): string; sandboxId: string; sandboxDomain: string },
  path = "",
): string {
  try {
    const url = sandbox.getMcpUrl();
    if (url) return path ? `${url}${path}` : url;
  } catch {
    // getMcpUrl may throw if MCP is not configured; fall through to manual build.
  }
  return `https://${E2B_MCP_BRIDGE_PORT}-${sandbox.sandboxId}.${sandbox.sandboxDomain}${path}`;
}
