/**
 * MCP Tool Discovery
 *
 * Discovers tools from connected MCP servers and normalizes their names
 * into the mcp__<server>__<tool> convention.
 */

import type { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@/lib/logger";
import { withTimeout } from "./transport";
import type { ConnectedMcpServer, McpToolInfo, McpToolInputSchema } from "./types";

const TOOLS_LIST_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Name Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a name to be API-compatible: ^[a-zA-Z0-9_-]{1,64}$
 *
 * Collapses consecutive underscores to prevent ambiguity with the
 * mcp__<server>__<tool> separator convention. Returns a fallback
 * for empty or all-special-character inputs.
 */
export function normalizeName(name: string, fallback = "unknown"): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")       // collapse consecutive underscores
    .replace(/^_+|_+$/g, "")      // trim leading/trailing underscores
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Build a fully qualified MCP tool name: mcp__<server>__<tool>
 */
function buildNormalizedToolName(serverName: string, toolName: string): string {
  const server = normalizeName(serverName, "server");
  const tool = normalizeName(toolName, "tool");
  return `mcp__${server}__${tool}`;
}

// ---------------------------------------------------------------------------
// Tool Discovery
// ---------------------------------------------------------------------------

/**
 * Discover tools from a connected server.
 * Returns an array of McpToolInfo with normalized names.
 */
export async function discoverTools(
  conn: ConnectedMcpServer,
): Promise<McpToolInfo[]> {
  try {
    const result: ListToolsResult = await withTimeout(
      conn.client.listTools(),
      TOOLS_LIST_TIMEOUT_MS,
      `listTools:${conn.name}`,
    );

    return (result.tools ?? []).map((tool) => ({
      name: buildNormalizedToolName(conn.name, tool.name),
      description: tool.description ?? "",
      inputSchema: (tool.inputSchema ?? { type: "object" }) as McpToolInputSchema,
      serverName: conn.name,
      originalToolName: tool.name,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[nex-mcp:client] Tool discovery failed for "${conn.name}": ${message}`,
    );
    return [];
  }
}
