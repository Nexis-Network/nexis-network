/**
 * Hook Configuration Loader
 *
 * Loads hook configuration from multiple sources in priority order:
 * 1. Project-level: .nex-hooks.json in project root
 * 2. User-level: ~/.nex-t1/hooks.json
 * 3. Environment variable: NEX_HOOKS_CONFIG (JSON string)
 *
 * Each source is merged (not replaced) -- later sources can add hooks
 * but not remove hooks from higher-priority sources.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { logger } from "@/lib/logger";
import type { HooksConfig, HookEvent } from "./types";
import { parseHooksConfig } from "./config-validation";

const PROJECT_HOOKS_FILE = ".nex-hooks.json";
const USER_HOOKS_DIR = ".nex-t1";
const USER_HOOKS_FILE = "hooks.json";

/** Maximum config file size in bytes (256 KB). Prevents loading absurdly large files. */
const MAX_CONFIG_FILE_SIZE = 256 * 1024;

let cachedConfig: HooksConfig | null = null;
let configLoadedAt = 0;
let configLoadInFlight: Promise<HooksConfig> | null = null;
const CONFIG_TTL_MS = 60_000; // Reload every 60s

/**
 * Reads and parses a JSON file, returning null on file-not-found.
 * Logs warnings for permission errors or malformed JSON.
 * Rejects files exceeding MAX_CONFIG_FILE_SIZE.
 */
async function loadJsonFile(filePath: string): Promise<unknown> {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.size > MAX_CONFIG_FILE_SIZE) {
      logger.warn("Hook config file exceeds size limit, skipping", {
        filePath,
        sizeBytes: fileStat.size,
        maxBytes: MAX_CONFIG_FILE_SIZE,
      });
      return null;
    }

    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error: unknown) {
    // File not found is expected -- silently return null
    if (isNodeError(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      return null;
    }
    // All other errors (permissions, parse errors, etc.) are logged
    logger.warn("Failed to load hook config file", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function mergeConfigs(...configs: HooksConfig[]): HooksConfig {
  const merged: HooksConfig = {};

  for (const config of configs) {
    for (const [event, matchers] of Object.entries(config)) {
      const hookEvent = event as HookEvent;
      if (!merged[hookEvent]) {
        merged[hookEvent] = [];
      }
      merged[hookEvent]!.push(...(matchers ?? []));
    }
  }

  return merged;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Loads and merges hook configuration from all sources.
 *
 * Sources are loaded in priority order:
 * 1. Project-level: `.nex-hooks.json` in `projectRoot`
 * 2. User-level: `~/.nex-t1/hooks.json`
 * 3. Environment variable: `NEX_HOOKS_CONFIG`
 *
 * Results are cached for 60 seconds. Concurrent calls during a cache miss
 * will share a single in-flight load to prevent duplicate work.
 */
export async function loadHooksConfig(
  projectRoot?: string,
): Promise<HooksConfig> {
  const now = Date.now();
  if (cachedConfig && now - configLoadedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }

  // Prevent duplicate concurrent loads
  if (configLoadInFlight) {
    return configLoadInFlight;
  }

  configLoadInFlight = loadHooksConfigUncached(projectRoot);
  try {
    const result = await configLoadInFlight;
    cachedConfig = result;
    configLoadedAt = Date.now();
    return result;
  } finally {
    configLoadInFlight = null;
  }
}

async function loadHooksConfigUncached(
  projectRoot?: string,
): Promise<HooksConfig> {
  const configs: HooksConfig[] = [];

  // 1. Project-level hooks
  if (projectRoot) {
    const projectFile = resolve(projectRoot, PROJECT_HOOKS_FILE);
    const projectRaw = await loadJsonFile(projectFile);
    if (projectRaw) {
      const parsed = parseHooksConfig(
        isPlainObject(projectRaw) && "hooks" in projectRaw
          ? (projectRaw as Record<string, unknown>).hooks
          : projectRaw,
      );
      configs.push(parsed);
    }
  }

  // 2. User-level hooks
  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (homeDir) {
    const userFile = join(homeDir, USER_HOOKS_DIR, USER_HOOKS_FILE);
    const userRaw = await loadJsonFile(userFile);
    if (userRaw) {
      const parsed = parseHooksConfig(
        isPlainObject(userRaw) && "hooks" in userRaw
          ? (userRaw as Record<string, unknown>).hooks
          : userRaw,
      );
      configs.push(parsed);
    }
  }

  // 3. Environment variable
  const envConfig = process.env.NEX_HOOKS_CONFIG;
  if (envConfig) {
    try {
      const envRaw: unknown = JSON.parse(envConfig);
      const parsed = parseHooksConfig(envRaw);
      configs.push(parsed);
    } catch (e) {
      logger.warn("Failed to parse NEX_HOOKS_CONFIG env var", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return mergeConfigs(...configs);
}

/**
 * Invalidates the hook configuration cache, forcing a reload on the next call
 * to `loadHooksConfig`.
 */
export function invalidateHooksConfigCache(): void {
  cachedConfig = null;
  configLoadedAt = 0;
  configLoadInFlight = null;
}
