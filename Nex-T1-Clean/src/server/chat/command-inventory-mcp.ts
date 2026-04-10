import type { CommandInventoryMcpServer } from "@/components/chat-composer/command-inventory";
import { SEED_SANDBOX_MCP_SERVERS } from "@/lib/mcp/sandbox-seed-catalog";
import { getSandboxServers } from "@/lib/mcp/registry";
import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

const CACHE_TTL_MS = 60 * 1000;

type CacheEntry = {
  data: CommandInventoryMcpServer[];
  timestamp: number;
};

let cachedInventory: CacheEntry | null = null;
let pendingInventoryRequest: Promise<CommandInventoryMcpServer[]> | null = null;
let warnedMissingServiceRole = false;

function getSupabaseAdmin() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    if (!warnedMissingServiceRole) {
      warnedMissingServiceRole = true;
      logger.warn(
        "[chat-command-inventory] MCP inventory is using the seed catalog because the Supabase service-role client is unavailable",
        error,
      );
    }
    return null;
  }
}

function mapSeedServerToInventoryServer(
  server: (typeof SEED_SANDBOX_MCP_SERVERS)[number],
): CommandInventoryMcpServer {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    category: server.category,
    status: "active",
  };
}

function mapSandboxServerToInventoryServer(
  server: Awaited<ReturnType<typeof getSandboxServers>>[number],
): CommandInventoryMcpServer {
  return {
    id: server.id,
    name: server.name,
    description:
      typeof server.description === "string" && server.description.trim().length > 0
        ? server.description.trim()
        : `${server.name} MCP server.`,
    category: server.category,
    status:
      server.status === "active" ||
      server.status === "inactive" ||
      server.status === "deprecated"
        ? server.status
        : undefined,
  };
}

function getSeedInventoryMcpServers(): CommandInventoryMcpServer[] {
  return SEED_SANDBOX_MCP_SERVERS.map(mapSeedServerToInventoryServer);
}

function getFreshInventoryCache(): CommandInventoryMcpServer[] | null {
  if (!cachedInventory) {
    return null;
  }

  return Date.now() - cachedInventory.timestamp < CACHE_TTL_MS
    ? cachedInventory.data
    : null;
}

async function loadCommandInventoryMcpServers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const fallbackServers = getSeedInventoryMcpServers();
    cachedInventory = { data: fallbackServers, timestamp: Date.now() };
    return fallbackServers;
  }

  try {
    const servers = await getSandboxServers(supabase);
    const mappedServers = servers.map(mapSandboxServerToInventoryServer);
    cachedInventory = { data: mappedServers, timestamp: Date.now() };
    return mappedServers;
  } catch (error) {
    logger.warn("[chat-command-inventory] Failed to load MCP servers; using the seed catalog", error);
    const fallbackServers = getSeedInventoryMcpServers();
    cachedInventory = { data: fallbackServers, timestamp: Date.now() };
    return fallbackServers;
  }
}

export async function getCommandInventoryMcpServers(): Promise<
  CommandInventoryMcpServer[]
> {
  if (isBuildEvaluation()) {
    return getSeedInventoryMcpServers();
  }

  const cached = getFreshInventoryCache();
  if (cached) {
    return cached;
  }

  if (pendingInventoryRequest) {
    return pendingInventoryRequest;
  }

  pendingInventoryRequest = loadCommandInventoryMcpServers().finally(() => {
    pendingInventoryRequest = null;
  });

  return pendingInventoryRequest;
}
