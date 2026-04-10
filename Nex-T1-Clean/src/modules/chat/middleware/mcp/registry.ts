/**
 * Nex MCP Tool Registry
 *
 * Discovers and registers MCP tools as first-class tools in the Nex-T1 pipeline.
 * Provides lookup by server, by normalized name, and bulk access.
 *
 * The registry is the bridge between raw MCP connections and the unified
 * tool runtime used by the chat module.
 */

import { logger } from "@/lib/logger";
import {
  connectAllServers,
  discoverTools,
  disconnectAllServers,
  getConnectedServers,
} from "./client";
import { getEnabledServerConfigs, invalidateMcpConfigCache } from "./config";
import type { ConnectedMcpServer, McpToolInfo } from "./types";

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/** All discovered tools, keyed by normalized name. */
const toolsByName = new Map<string, McpToolInfo>();

/** Tools grouped by server name. */
const toolsByServer = new Map<string, McpToolInfo[]>();

/** Reverse map: normalized name -> original name. */
const normalizedToOriginal = new Map<string, string>();

let initialized = false;
let initInFlight: Promise<McpToolInfo[]> | null = null;

// ---------------------------------------------------------------------------
// Public API: Queries
// ---------------------------------------------------------------------------

/**
 * Returns all registered MCP tools across every connected server.
 */
export function getAllMcpTools(): McpToolInfo[] {
  return Array.from(toolsByName.values());
}

/**
 * Returns tools provided by a specific MCP server.
 */
export function getToolsForServer(serverName: string): McpToolInfo[] {
  return toolsByServer.get(serverName) ?? [];
}

/**
 * Look up a single tool by its normalized name.
 */
export function getToolByName(normalizedName: string): McpToolInfo | undefined {
  return toolsByName.get(normalizedName);
}

/**
 * Returns the original (un-normalized) tool name for a given normalized name.
 */
export function getOriginalToolName(normalizedName: string): string | undefined {
  return normalizedToOriginal.get(normalizedName);
}

/**
 * Returns the set of all server names that have at least one tool registered.
 */
export function getServersWithTools(): string[] {
  return Array.from(toolsByServer.keys());
}

/**
 * Returns the total number of registered MCP tools.
 */
export function getToolCount(): number {
  return toolsByName.size;
}

/**
 * Returns true if the registry has been initialized at least once.
 */
export function isInitialized(): boolean {
  return initialized;
}

// ---------------------------------------------------------------------------
// Internal: Index Management
// ---------------------------------------------------------------------------

function indexTools(serverName: string, tools: McpToolInfo[]): void {
  toolsByServer.set(serverName, tools);
  for (const tool of tools) {
    toolsByName.set(tool.name, tool);
    normalizedToOriginal.set(tool.name, tool.originalToolName);
  }
}

function clearServerTools(serverName: string): void {
  const existing = toolsByServer.get(serverName);
  if (existing) {
    for (const tool of existing) {
      toolsByName.delete(tool.name);
      normalizedToOriginal.delete(tool.name);
    }
    toolsByServer.delete(serverName);
  }
}

function clearAll(): void {
  toolsByName.clear();
  toolsByServer.clear();
  normalizedToOriginal.clear();
}

// ---------------------------------------------------------------------------
// Public API: Lifecycle
// ---------------------------------------------------------------------------

/**
 * Initialize the tool registry:
 * 1. Disconnect any existing servers to prevent connection leaks
 * 2. Load enabled server configs
 * 3. Connect to all servers (graceful degradation)
 * 4. Discover tools from each connected server
 * 5. Index tools for lookup
 *
 * Concurrent calls share a single in-flight initialization.
 * Returns the full list of discovered tools.
 */
export async function initializeRegistry(
  projectRoot?: string,
): Promise<McpToolInfo[]> {
  // Deduplicate concurrent initialization calls
  if (initInFlight) {
    return initInFlight;
  }

  initInFlight = initializeRegistryUncached(projectRoot);
  try {
    return await initInFlight;
  } finally {
    initInFlight = null;
  }
}

async function initializeRegistryUncached(
  projectRoot?: string,
): Promise<McpToolInfo[]> {
  // Tear down existing connections to prevent leaking stale clients
  await disconnectAllServers();
  clearAll();

  const configs = await getEnabledServerConfigs(projectRoot);
  if (configs.length === 0) {
    logger.info("[nex-mcp:registry] No MCP servers configured");
    initialized = true;
    return [];
  }

  logger.info(
    `[nex-mcp:registry] Connecting to ${configs.length} MCP server(s)`,
  );

  await connectAllServers(configs);

  const connected = getConnectedServers();
  logger.info(
    `[nex-mcp:registry] ${connected.length}/${configs.length} server(s) connected`,
  );

  // Discover tools from all connected servers concurrently
  const discoveryResults = await Promise.allSettled(
    connected.map(async (conn) => {
      const tools = await discoverTools(conn);
      indexTools(conn.name, tools);
      return { serverName: conn.name, toolCount: tools.length };
    }),
  );

  for (const result of discoveryResults) {
    if (result.status === "fulfilled") {
      logger.info(
        `[nex-mcp:registry] Discovered ${result.value.toolCount} tool(s) from "${result.value.serverName}"`,
      );
    } else {
      logger.warn(
        `[nex-mcp:registry] Tool discovery failed: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`,
      );
    }
  }

  initialized = true;
  return getAllMcpTools();
}

/**
 * Re-discover tools for a single already-connected server.
 * Useful after a server reconnects.
 */
export async function refreshServerTools(
  conn: ConnectedMcpServer,
): Promise<McpToolInfo[]> {
  clearServerTools(conn.name);
  const tools = await discoverTools(conn);
  indexTools(conn.name, tools);
  return tools;
}

/**
 * Tear down the registry: disconnect all servers, clear all indices,
 * and invalidate the config cache.
 */
export async function destroyRegistry(): Promise<void> {
  initInFlight = null;
  clearAll();
  initialized = false;
  await disconnectAllServers();
  invalidateMcpConfigCache();
}
