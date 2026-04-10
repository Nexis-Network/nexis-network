/**
 * Nex MCP Client — Type Definitions
 *
 * Connection state machine types, server configuration, and tool metadata
 * for the Nex-T1 MCP middleware layer.
 *
 * Modeled on MCP SDK patterns with a discriminated union for connection state.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export type McpTransport = "stdio" | "sse" | "http";

// ---------------------------------------------------------------------------
// Server Configuration
// ---------------------------------------------------------------------------

/** Source scope for multi-source config merging. */
export type McpConfigScope = "project" | "user" | "env";

export type McpServerConfig = {
  /** Human-readable server name (used in tool-name prefix). */
  name: string;
  /** Transport protocol. */
  transport: McpTransport;
  /** For stdio: the command to spawn. */
  command?: string;
  /** For stdio: command arguments. */
  args?: string[];
  /** For sse/http: the endpoint URL. */
  url?: string;
  /** Optional HTTP headers for sse/http transports. */
  headers?: Record<string, string>;
  /** Optional environment variables for stdio child process. */
  env?: Record<string, string>;
  /** Whether the server is explicitly disabled. */
  disabled?: boolean;
};

export type ScopedMcpServerConfig = McpServerConfig & {
  scope: McpConfigScope;
};

// ---------------------------------------------------------------------------
// Connection State Machine
// ---------------------------------------------------------------------------

export type ServerState =
  | "pending"
  | "connected"
  | "failed"
  | "needs-auth"
  | "disabled";

export type ConnectedMcpServer = {
  name: string;
  state: "connected";
  client: Client;
  capabilities: ServerCapabilities;
  config: ScopedMcpServerConfig;
  serverInfo?: { name: string; version: string };
};

export type FailedMcpServer = {
  name: string;
  state: "failed";
  config: ScopedMcpServerConfig;
  error: string;
  /** Number of reconnection attempts made so far. */
  reconnectAttempt: number;
};

export type NeedsAuthMcpServer = {
  name: string;
  state: "needs-auth";
  config: ScopedMcpServerConfig;
};

export type PendingMcpServer = {
  name: string;
  state: "pending";
  config: ScopedMcpServerConfig;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
};

export type DisabledMcpServer = {
  name: string;
  state: "disabled";
  config: ScopedMcpServerConfig;
};

/** Discriminated union of all connection states. */
export type McpServerConnection =
  | ConnectedMcpServer
  | FailedMcpServer
  | NeedsAuthMcpServer
  | PendingMcpServer
  | DisabledMcpServer;

// ---------------------------------------------------------------------------
// Tool Information
// ---------------------------------------------------------------------------

export type McpToolInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: readonly string[];
  [key: string]: unknown;
};

/** Metadata for a single MCP-discovered tool. */
export type McpToolInfo = {
  /** Normalized name: mcp__<server>__<tool> */
  name: string;
  /** Tool description from the MCP server. */
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: McpToolInputSchema;
  /** Name of the MCP server that provides this tool. */
  serverName: string;
  /** Original (un-normalized) tool name from the server. */
  originalToolName: string;
};

// ---------------------------------------------------------------------------
// MCP JSON config file shape (for .mcp.json / mcp.json)
// ---------------------------------------------------------------------------

export type McpJsonConfig = {
  mcpServers: Record<string, Omit<McpServerConfig, "name">>;
};
