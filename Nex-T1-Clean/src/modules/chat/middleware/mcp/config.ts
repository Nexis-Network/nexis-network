/**
 * Nex MCP Server Registry — Multi-Source Configuration
 *
 * Loads MCP server definitions from three sources (priority order):
 * 1. Project-level: .mcp.json in project root
 * 2. User-level:    ~/.nex-t1/mcp.json
 * 3. Environment:   NEX_MCP_SERVERS (JSON string)
 *
 * Configs are merged by server name — later sources fill in servers not
 * already defined by higher-priority sources. Results are cached with TTL.
 */

import { join, resolve } from "node:path";
import { loadJsonFile, parseConfigFile, parseEnvConfig, mergeMaps } from "./config-parser";
import type { ScopedMcpServerConfig } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_MCP_FILE = ".mcp.json";
const USER_MCP_DIR = ".nex-t1";
const USER_MCP_FILE = "mcp.json";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedConfigs: Map<string, ScopedMcpServerConfig> | null = null;
let cacheLoadedAt = 0;
let cacheInFlight: Promise<Map<string, ScopedMcpServerConfig>> | null = null;
const CACHE_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Loader (uncached)
// ---------------------------------------------------------------------------

async function loadMcpConfigsUncached(
  projectRoot?: string,
): Promise<Map<string, ScopedMcpServerConfig>> {
  const sources: Map<string, ScopedMcpServerConfig>[] = [];

  // 1. Project-level
  if (projectRoot) {
    const projectFile = resolve(projectRoot, PROJECT_MCP_FILE);
    const projectRaw = await loadJsonFile(projectFile);
    if (projectRaw) {
      sources.push(parseConfigFile(projectRaw, "project"));
    }
  }

  // 2. User-level
  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (homeDir) {
    const userFile = join(homeDir, USER_MCP_DIR, USER_MCP_FILE);
    const userRaw = await loadJsonFile(userFile);
    if (userRaw) {
      sources.push(parseConfigFile(userRaw, "user"));
    }
  }

  // 3. Environment variable
  sources.push(parseEnvConfig());

  return mergeMaps(...sources);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads MCP server configurations from all sources, cached with TTL.
 * Concurrent calls share a single in-flight load.
 */
export async function loadMcpConfigs(
  projectRoot?: string,
): Promise<Map<string, ScopedMcpServerConfig>> {
  const now = Date.now();
  if (cachedConfigs && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedConfigs;
  }

  if (cacheInFlight) {
    return cacheInFlight;
  }

  cacheInFlight = loadMcpConfigsUncached(projectRoot);
  try {
    const result = await cacheInFlight;
    cachedConfigs = result;
    cacheLoadedAt = Date.now();
    return result;
  } finally {
    cacheInFlight = null;
  }
}

/**
 * Returns an array of enabled (non-disabled) server configs.
 */
export async function getEnabledServerConfigs(
  projectRoot?: string,
): Promise<ScopedMcpServerConfig[]> {
  const all = await loadMcpConfigs(projectRoot);
  return Array.from(all.values()).filter((c) => !c.disabled);
}

/**
 * Invalidates the config cache, forcing a reload on next access.
 */
export function invalidateMcpConfigCache(): void {
  cachedConfigs = null;
  cacheLoadedAt = 0;
  cacheInFlight = null;
}
