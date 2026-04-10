/**
 * MCP Configuration Parsing & Validation
 *
 * Parses MCP server definitions from JSON config files and environment
 * variables. Validates transport-specific requirements and server names.
 */

import { readFile, stat } from "node:fs/promises";
import { logger } from "@/lib/logger";
import type {
  McpConfigScope,
  McpServerConfig,
  McpTransport,
  ScopedMcpServerConfig,
} from "./types";

const MAX_CONFIG_FILE_SIZE = 256 * 1024; // 256 KB
const VALID_TRANSPORTS: McpTransport[] = ["stdio", "sse", "http"];
const MAX_SERVERS_PER_SOURCE = 100;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidTransport(t: unknown): t is McpTransport {
  return typeof t === "string" && VALID_TRANSPORTS.includes(t as McpTransport);
}

function isValidServerName(name: string): boolean {
  return name.length > 0 && name.length <= 128;
}

export function validateServerConfig(
  name: string,
  raw: unknown,
): McpServerConfig | null {
  if (!isPlainObject(raw)) return null;

  const transport = raw.transport;
  if (!isValidTransport(transport)) {
    logger.warn(`[nex-mcp:config] Invalid transport for server "${name}", skipping`);
    return null;
  }

  if (transport === "stdio") {
    if (typeof raw.command !== "string" || raw.command.trim().length === 0) {
      logger.warn(`[nex-mcp:config] stdio server "${name}" missing command, skipping`);
      return null;
    }
  } else {
    if (typeof raw.url !== "string" || raw.url.trim().length === 0) {
      logger.warn(`[nex-mcp:config] ${transport} server "${name}" missing url, skipping`);
      return null;
    }
    try {
      const parsed = new URL(raw.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        logger.warn(`[nex-mcp:config] Server "${name}" has non-http(s) URL, skipping`);
        return null;
      }
    } catch {
      logger.warn(`[nex-mcp:config] Server "${name}" has malformed URL, skipping`);
      return null;
    }
  }

  const config: McpServerConfig = { name, transport };

  if (typeof raw.command === "string") config.command = raw.command.trim();
  if (Array.isArray(raw.args)) {
    config.args = raw.args.filter((a): a is string => typeof a === "string");
  }
  if (typeof raw.url === "string") config.url = raw.url.trim();
  if (isPlainObject(raw.headers)) {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.headers)) {
      if (typeof v === "string") headers[k] = v;
    }
    if (Object.keys(headers).length > 0) config.headers = headers;
  }
  if (isPlainObject(raw.env)) {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.env)) {
      if (typeof v === "string") env[k] = v;
    }
    if (Object.keys(env).length > 0) config.env = env;
  }
  if (raw.disabled === true) config.disabled = true;

  return config;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export async function loadJsonFile(filePath: string): Promise<unknown> {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.size > MAX_CONFIG_FILE_SIZE) {
      logger.warn("[nex-mcp:config] Config file exceeds size limit, skipping", {
        filePath,
        sizeBytes: fileStat.size,
      });
      return null;
    }
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error: unknown) {
    if (isNodeError(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      return null;
    }
    logger.warn("[nex-mcp:config] Failed to load config file", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function parseConfigFile(
  raw: unknown,
  scope: McpConfigScope,
): Map<string, ScopedMcpServerConfig> {
  const result = new Map<string, ScopedMcpServerConfig>();
  if (!isPlainObject(raw)) return result;

  let servers: Record<string, unknown>;
  if ("mcpServers" in raw) {
    if (!isPlainObject(raw.mcpServers)) {
      logger.warn("[nex-mcp:config] mcpServers key present but not an object, skipping file");
      return result;
    }
    servers = raw.mcpServers;
  } else {
    servers = raw;
  }

  const entries = Object.entries(servers);
  if (entries.length > MAX_SERVERS_PER_SOURCE) {
    logger.warn(
      `[nex-mcp:config] Config source "${scope}" defines ${entries.length} servers, exceeding limit of ${MAX_SERVERS_PER_SOURCE}. Truncating.`,
    );
  }

  for (const [name, entry] of entries.slice(0, MAX_SERVERS_PER_SOURCE)) {
    if (!isValidServerName(name)) {
      logger.warn(`[nex-mcp:config] Invalid server name "${name.slice(0, 32)}...", skipping`);
      continue;
    }
    const validated = validateServerConfig(name, entry);
    if (validated) {
      result.set(name, { ...validated, scope });
    }
  }

  return result;
}

export function parseEnvConfig(): Map<string, ScopedMcpServerConfig> {
  const envRaw = process.env.NEX_MCP_SERVERS;
  if (!envRaw) return new Map();

  try {
    const parsed: unknown = JSON.parse(envRaw);
    return parseConfigFile(parsed, "env");
  } catch (e) {
    logger.warn("[nex-mcp:config] Failed to parse NEX_MCP_SERVERS env var", {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Map();
  }
}

export function mergeMaps(
  ...maps: Map<string, ScopedMcpServerConfig>[]
): Map<string, ScopedMcpServerConfig> {
  const merged = new Map<string, ScopedMcpServerConfig>();
  for (const map of maps) {
    for (const [name, config] of map) {
      if (!merged.has(name)) {
        merged.set(name, config);
      }
    }
  }
  return merged;
}
