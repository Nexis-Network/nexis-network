import { logger } from "@/lib/logger";
import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { BUILD_SAFE_MCP_TOOLS_SNAPSHOT } from "@/modules/mcp/build-tool-snapshot";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import type { ToolDefinition } from "@/modules/ai/system-guidance";

const CACHE_TTL_MS = 60 * 1000;
const FALLBACK_TTL_MS = 60 * 1000;

type CacheEntry = {
  data: ToolDefinition[];
  timestamp: number;
};

type ToolRow = {
  name: string;
  endpoint?: string | null;
  config?: Record<string, UntypedJson> | null;
};

let warnedMissingServiceRole = false;

function isRegistryBuildSafeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    Boolean(process.env.VITEST_WORKER_ID) ||
    isBuildEvaluation()
  );
}

function getSupabaseAdmin() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    if (!warnedMissingServiceRole) {
      warnedMissingServiceRole = true;
      logger.warn(
        "[RegistryService] Dynamic MCP tools disabled because the Supabase service-role client is unavailable",
        error,
      );
    }
    return null;
  }
}

function mapToolRow(row: ToolRow): ToolDefinition {
  return {
    id: row.name,
    description: row.config?.description as string | undefined,
    endpoint: row.endpoint ?? undefined,
    ...(row.config ?? {}),
  };
}

export class RegistryService {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<ToolDefinition[]>> = new Map();
  private fallbackTimestamps: Map<string, number> = new Map();

  private getFreshCache(cacheKey: string): ToolDefinition[] | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    return Date.now() - cached.timestamp < CACHE_TTL_MS ? cached.data : null;
  }

  private shouldUseFallback(cacheKey: string): boolean {
    const fallbackTimestamp = this.fallbackTimestamps.get(cacheKey);
    return typeof fallbackTimestamp === "number" && Date.now() - fallbackTimestamp < FALLBACK_TTL_MS;
  }

  private useFallback(cacheKey: string): ToolDefinition[] {
    this.fallbackTimestamps.set(cacheKey, Date.now());
    return [];
  }

  private async fetchTools(cacheKey: string) {
    const client = getSupabaseAdmin();
    if (!client) {
      return this.useFallback(cacheKey);
    }

    try {
      const { data, error } = await client
        .from("mcp_tools")
        .select("name, endpoint, config");

      if (error) {
        logger.warn("[RegistryService] Failed to fetch tools; using static registry only", error);
        return this.useFallback(cacheKey);
      }

      const tools = ((data ?? []) as ToolRow[]).map(mapToolRow);
      this.cache.set(cacheKey, { data: tools, timestamp: Date.now() });
      this.fallbackTimestamps.delete(cacheKey);
      return tools;
    } catch (error) {
      logger.warn("[RegistryService] Failed to fetch tools; using static registry only", error);
      return this.useFallback(cacheKey);
    }
  }

  async getToolsForOrg(orgId?: string): Promise<ToolDefinition[]> {
    if (isRegistryBuildSafeEnvironment()) {
      return BUILD_SAFE_MCP_TOOLS_SNAPSHOT;
    }

    const cacheKey = orgId ?? "global";
    const cached = this.getFreshCache(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.shouldUseFallback(cacheKey)) {
      return [];
    }

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request = this.fetchTools(cacheKey).finally(() => {
      this.pendingRequests.delete(cacheKey);
    });
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  async getAllTools(): Promise<ToolDefinition[]> {
    return this.getToolsForOrg();
  }
}

export const registryService = new RegistryService();
