/**
 * Nex MCP Connection Manager
 *
 * Public API for connecting to / disconnecting from MCP servers.
 * Transport creation, tool discovery, and reconnection logic
 * are delegated to their respective modules.
 */

import { logger } from "@/lib/logger";
import { createTransport, safeCloseTransport, withTimeout, Client } from "./transport";
import { MAX_RECONNECT_ATTEMPTS, backoffMs, sleep, cancelReconnect, cancelAllReconnects, createReconnectController, removeReconnectController } from "./reconnect";
import type {
  ConnectedMcpServer,
  FailedMcpServer,
  McpServerConnection,
  ScopedMcpServerConfig,
} from "./types";

// Re-export discovery for barrel
export { discoverTools } from "./discovery";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONNECT_TIMEOUT_MS = 10_000;
const DISCONNECT_TIMEOUT_MS = 5_000;
const MAX_CONNECTIONS = 50;

const NEX_MCP_CLIENT_NAME = "nex-t1-mcp-client";
const NEX_MCP_CLIENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Connection State Tracking
// ---------------------------------------------------------------------------

const connections = new Map<string, McpServerConnection>();

export function getConnection(serverName: string): McpServerConnection | undefined {
  return connections.get(serverName);
}

export function getAllConnections(): McpServerConnection[] {
  return Array.from(connections.values());
}

export function getConnectedServers(): ConnectedMcpServer[] {
  return getAllConnections().filter(
    (c): c is ConnectedMcpServer => c.state === "connected",
  );
}

// ---------------------------------------------------------------------------
// Core Connection (single attempt)
// ---------------------------------------------------------------------------

async function connectOnce(
  config: ScopedMcpServerConfig,
): Promise<McpServerConnection> {
  if (config.disabled) {
    const conn: McpServerConnection = { name: config.name, state: "disabled", config };
    connections.set(config.name, conn);
    return conn;
  }

  if (connections.size >= MAX_CONNECTIONS && !connections.has(config.name)) {
    const message = `Connection limit (${MAX_CONNECTIONS}) reached, cannot add "${config.name}"`;
    logger.warn(`[nex-mcp:client] ${message}`);
    return { name: config.name, state: "failed", config, error: message, reconnectAttempt: 0 };
  }

  connections.set(config.name, { name: config.name, state: "pending", config });

  let transport: ReturnType<typeof createTransport> | undefined;
  try {
    transport = createTransport(config);
    const client = new Client(
      { name: NEX_MCP_CLIENT_NAME, version: NEX_MCP_CLIENT_VERSION },
      { capabilities: {} },
    );

    await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, `connect:${config.name}`);
    const serverInfo = client.getServerVersion();

    const conn: ConnectedMcpServer = {
      name: config.name,
      state: "connected",
      client,
      capabilities: client.getServerCapabilities() ?? {},
      config,
      serverInfo: serverInfo ? { name: serverInfo.name, version: serverInfo.version } : undefined,
    };
    connections.set(config.name, conn);
    logger.info(`[nex-mcp:client] Connected to "${config.name}"`);
    return conn;
  } catch (error) {
    if (transport) void safeCloseTransport(transport);
    const message = error instanceof Error ? error.message : String(error);
    const conn: FailedMcpServer = { name: config.name, state: "failed", config, error: message, reconnectAttempt: 0 };
    connections.set(config.name, conn);
    logger.warn(`[nex-mcp:client] Failed to connect to "${config.name}": ${message}`);
    return conn;
  }
}

// ---------------------------------------------------------------------------
// Connect with Retry
// ---------------------------------------------------------------------------

export async function connectToServer(
  config: ScopedMcpServerConfig,
): Promise<McpServerConnection> {
  if (config.disabled) return connectOnce(config);

  const controller = createReconnectController(config.name);

  try {
    let lastConn = await connectOnce(config);
    if (lastConn.state === "connected") return lastConn;

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      const delay = backoffMs(attempt - 1);
      logger.info(`[nex-mcp:client] Reconnecting to "${config.name}" in ${delay}ms (attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS})`);
      connections.set(config.name, { name: config.name, state: "pending", config, reconnectAttempt: attempt, maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS });

      await sleep(delay, controller.signal);
      lastConn = await connectOnce(config);
      if (lastConn.state === "connected") return lastConn;

      if (lastConn.state === "failed") {
        lastConn = { ...lastConn, reconnectAttempt: attempt };
        connections.set(config.name, lastConn);
      }
    }
    return lastConn;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.info(`[nex-mcp:client] Reconnection cancelled for "${config.name}"`);
    }
    const existing = connections.get(config.name);
    if (existing) return existing;
    const conn: FailedMcpServer = { name: config.name, state: "failed", config, error: "Reconnection aborted", reconnectAttempt: 0 };
    connections.set(config.name, conn);
    return conn;
  } finally {
    removeReconnectController(config.name);
  }
}

// ---------------------------------------------------------------------------
// Connect All (Graceful Degradation)
// ---------------------------------------------------------------------------

export async function connectAllServers(
  configs: ScopedMcpServerConfig[],
): Promise<McpServerConnection[]> {
  const results = await Promise.allSettled(configs.map((c) => connectToServer(c)));
  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    const conn: FailedMcpServer = {
      name: configs[i].name, state: "failed", config: configs[i],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      reconnectAttempt: MAX_RECONNECT_ATTEMPTS,
    };
    connections.set(configs[i].name, conn);
    return conn;
  });
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export async function disconnectServer(serverName: string): Promise<void> {
  cancelReconnect(serverName);
  const conn = connections.get(serverName);
  if (!conn) return;

  if (conn.state === "connected") {
    try {
      await withTimeout(conn.client.close(), DISCONNECT_TIMEOUT_MS, `disconnect:${serverName}`);
    } catch (error) {
      logger.warn(`[nex-mcp:client] Error closing connection to "${serverName}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  connections.delete(serverName);
}

export async function disconnectAllServers(): Promise<void> {
  cancelAllReconnects();
  const names = Array.from(connections.keys());
  await Promise.allSettled(names.map((name) => disconnectServer(name)));
  connections.clear();
}
