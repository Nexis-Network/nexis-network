/**
 * Nex MCP Middleware — Barrel Export
 *
 * MCP client architecture for the Nex-T1 chat pipeline.
 * Provides multi-server connection management, tool discovery,
 * and a unified tool registry.
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  McpTransport,
  McpConfigScope,
  McpServerConfig,
  ScopedMcpServerConfig,
  ServerState,
  ConnectedMcpServer,
  FailedMcpServer,
  NeedsAuthMcpServer,
  PendingMcpServer,
  DisabledMcpServer,
  McpServerConnection,
  McpToolInputSchema,
  McpToolInfo,
  McpJsonConfig,
} from "./types";

// ── Config ──────────────────────────────────────────────────────────────────
export {
  loadMcpConfigs,
  getEnabledServerConfigs,
  invalidateMcpConfigCache,
} from "./config";

// ── Client ──────────────────────────────────────────────────────────────────
export {
  connectToServer,
  connectAllServers,
  discoverTools,
  getConnection,
  getAllConnections,
  getConnectedServers,
  disconnectServer,
  disconnectAllServers,
} from "./client";

// ── Registry ────────────────────────────────────────────────────────────────
export {
  initializeRegistry,
  refreshServerTools,
  destroyRegistry,
  getAllMcpTools,
  getToolsForServer,
  getToolByName,
  getOriginalToolName,
  getServersWithTools,
  getToolCount,
  isInitialized,
} from "./registry";
