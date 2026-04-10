import { createMCPClient as createMcpClient, type MCPClient } from "@ai-sdk/mcp";
import type { Tool } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { McpRegistryJoinRow, UserMcpConfigJoinRow } from "@/types/e2b-sandbox";
import { withTimeoutFallbackResult } from "@/lib/utils/timeout";


import { logger } from '@/lib/logger';
export type McpVenue = 
  | "hyperliquid" 
  | "uniswap" 
  | "cow" 
  | "nex" 
  | "moralis" 
  | "thegraph"
  | "crypto_com" 
  | "crypto_sentiment"
  | "chainlink"
  | "blocknative"
  | "etherscan"
  | "alchemy"
  | "binance"
  | "pump_fun"
  | "helius"
  | "bsc_chain"
  | string;

export type McpToolsPurpose = "chat_readonly" | "agent_runtime";

export type LoadAiSdkMcpToolsParams = {
  purpose: McpToolsPurpose;
  /**
   * When false, all "value-moving" MCP tools are blocked (defense-in-depth).
   * For `purpose: chat_readonly` this is forced to false.
   */
  allowValueMoving?: boolean;
  userId?: string | null;
};

export type LoadAiSdkMcpToolsResult = {
  tools: Record<string, Tool>;
  close: () => Promise<void>;
  loaded: Array<{ venue: McpVenue; toolCount: number }>;
};

type ToolLike = {
  description?: string;
  inputSchema?: Tool["inputSchema"];
  execute: Tool["execute"];
};

const VALUE_MOVING_PATTERNS: RegExp[] = [
  /(^|_)order(_|$)/i,
  /(^|_)swap(_|$)/i,
  /(^|_)trade(_|$)/i,
  /(^|_)execute(_|$)/i,
  /(^|_)send(_|$)/i,
  /(^|_)transfer(_|$)/i,
  /(^|_)approve(_|$)/i,
  /(^|_)sign(_|$)/i,
  /(^|_)place(_|$)/i,
  /(^|_)cancel(_|$)/i,
  /(^|_)withdraw(_|$)/i,
  /(^|_)deposit(_|$)/i,
  /(^|_)bridge(_|$)/i,
  /(^|_)deploy(_|$)/i,
  /(^|_)mint(_|$)/i,
  /(^|_)stake(_|$)/i,
  /(^|_)unstake(_|$)/i,
  /(^|_)buy(_|$)/i,
  /(^|_)sell(_|$)/i,
];

const SENSITIVE_MCP_TOOL_NAME_PATTERNS: RegExp[] = [
  /private_key/i,
  /mnemonic/i,
  /seed_phrase/i,
  /encrypted_json/i,
  /(^|_)encrypt(_|$)/i,
];

export function isProbablyValueMovingToolName(toolName: string): boolean {
  const trimmed = toolName.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();

  // Read-only exceptions (avoid false positives).
  if (normalized.includes("order_book") || normalized.includes("orderbook")) return false;
  if (normalized.includes("recent_trades") || normalized.endsWith("_trades")) return false;
  if (normalized.includes("swap_quote") || normalized.includes("swap_price")) return false;
  if (normalized.endsWith("_quote") || normalized.endsWith("_price")) return false;
  if (normalized.includes("transfer_status") || normalized.includes("route_status")) return false;

  return VALUE_MOVING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isSensitiveMcpToolName(toolName: string): boolean {
  const trimmed = toolName.trim();
  if (!trimmed) return false;
  return SENSITIVE_MCP_TOOL_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function stripSensitiveTools(tools: Record<string, Tool>): Record<string, Tool> {
  return Object.fromEntries(Object.entries(tools).filter(([name]) => !isSensitiveMcpToolName(name)));
}

function isToolLike(value: unknown): value is ToolLike {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.execute !== "function") return false;
  if ("description" in record && record.description !== undefined && typeof record.description !== "string") {
    return false;
  }
  if ("inputSchema" in record && record.inputSchema !== undefined && (typeof record.inputSchema !== "object" || record.inputSchema === null)) {
    return false;
  }
  return true;
}

function normalizeMcpTools(rawTools: unknown, venue: McpVenue): Record<string, Tool> {
  if (!rawTools || typeof rawTools !== "object") {
    return {};
  }

  const out: Record<string, Tool> = {};
  for (const [name, value] of Object.entries(rawTools as Record<string, unknown>)) {
    if (!isToolLike(value)) {
      logger.warn(`[mcp:${venue}] Ignoring invalid tool "${name}"`);
      continue;
    }

    out[name] = {
      ...value,
      execute: value.execute,
      ...(value.description ? { description: value.description } : {}),
      ...(value.inputSchema ? { inputSchema: value.inputSchema } : {}),
    } as Tool;
  }

  return out;
}

function normalizeToolKey(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_]+/g, "_");
}

function buildHeaders(params: { apiKey?: string | null }): Record<string, string> | undefined {
  const apiKey = params.apiKey?.trim();
  if (!apiKey) return undefined;
  return { Authorization: `Bearer ${apiKey}` };
}

type VenueConfig = {
  venue: McpVenue;
  url: string;
  apiKey?: string | null;
  allowlist?: string[];
  transport: "http" | "sse";
};

function normalizeMcpUrlForVenue(venue: McpVenue, rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  const needsMcpPath = venue === "moralis" || venue === "nex";
  if (!needsMcpPath) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/mcp";
      return url.toString();
    }
    if (url.pathname.endsWith("/mcp/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
      return url.toString();
    }
    return trimmed;
  } catch {
    const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
    if (withoutTrailingSlash.endsWith("/mcp")) return withoutTrailingSlash;
    return `${withoutTrailingSlash}/mcp`;
  }
}

/**
 * Fetch MCP configurations from Supabase or Fallback to Env Vars
 */
async function fetchVenueConfigs(params?: {
  userId?: string | null;
  purpose?: McpToolsPurpose;
  allowValueMoving?: boolean;
}): Promise<VenueConfig[]> {
  const configs: VenueConfig[] = [];
  const userId = params?.userId ?? null;
  const purpose = params?.purpose ?? "chat_readonly";
  const allowValueMoving = purpose === "chat_readonly" ? false : Boolean(params?.allowValueMoving);

  // 1. Try fetching from Supabase if userId is present
  if (userId) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to read potentially private registry
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get user enabled configs joined with registry
      const { data, error } = await supabase
        .from("user_mcp_config")
        .select(`
          enabled,
          config_overrides,
          mcp_registry (
            name,
            sre_url,
            transport,
            tool_allowlist,
            is_public
          )
        `)
        .eq("user_id", userId)
        .eq("enabled", true);

      if (!error && data) {
        for (const row of data as UserMcpConfigJoinRow[]) {
          const registryData = row.mcp_registry;
          const registry: McpRegistryJoinRow | null | undefined =
            Array.isArray(registryData) ? registryData[0] : registryData;
          if (!registry) continue;

          configs.push({
            venue: registry.name,
            url: normalizeMcpUrlForVenue(registry.name, registry.sre_url),
            transport: (registry.transport as "http" | "sse") ?? "http",
            allowlist: registry.tool_allowlist ?? undefined,
            // Future: merge config_overrides for api keys if needed
          });
        }
      }
    } catch (err) {
      logger.warn("[mcp] Failed to fetch user config from Supabase, falling back to env", err);
    }
  }

  // 2. Fetch default public/fallback configs from Environment Variables (Backward Compat)
  // Only add if not already present from DB
  const existingVenues = new Set(configs.map((c) => c.venue));
  const fallbackVenues: McpVenue[] = [
    "hyperliquid", 
    "uniswap", 
    "cow", 
    "nex", 
    "moralis", 
    "thegraph",
    "blockscout", 
    "crypto_com",
    "crypto_sentiment",
    "chainlink",
    "blocknative",
    "etherscan",
    "alchemy",
    "binance",
    "pump_fun",
    "helius",
    "bsc_chain"
  ];

  for (const venue of fallbackVenues) {
    if (existingVenues.has(venue)) continue;

    const prefix = `MCP_${venue.toUpperCase()}_MCP_`;
    let urlRaw = process.env[`${prefix}URL`]?.trim();

    // Default public URL for Crypto.com if not configured
    if (venue === "crypto_com" && !urlRaw) {
      urlRaw = "https://mcp.crypto.com/market-data/mcp";
    }

    if (!urlRaw) continue;

    configs.push({
      venue,
      url: normalizeMcpUrlForVenue(venue, urlRaw),
      apiKey: process.env[`${prefix}API_KEY`]?.trim() ?? null,
      transport: "http", 
      allowlist:
        purpose === "chat_readonly" || !allowValueMoving
          ? parseCsvList(process.env[`${prefix}ALLOWED_TOOLS_READONLY`])
          : parseCsvList(process.env[`${prefix}ALLOWED_TOOLS_TRADING`]) ??
            parseCsvList(process.env[`${prefix}ALLOWED_TOOLS_READONLY`]),
    });
  }

  return configs;
}

function parseCsvList(raw?: string | null): string[] | undefined {
  if (!raw) return undefined;
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveTimeoutMs(
  envKey: string,
  fallbackMs: number,
): number {
  const raw = process.env[envKey];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }
  return Math.floor(parsed);
}


function applyAllowlist(tools: Record<string, Tool>, allowlist?: string[]): Record<string, Tool> {
  if (!allowlist || allowlist.length === 0) return tools;
  const allowed = new Set(allowlist);
  return Object.fromEntries(Object.entries(tools).filter(([name]) => allowed.has(name)));
}

function stripValueMovingTools(tools: Record<string, Tool>, venue: McpVenue): Record<string, Tool> {
  if (venue === "moralis") return tools;
  return Object.fromEntries(Object.entries(tools).filter(([name]) => !isProbablyValueMovingToolName(name)));
}

const READONLY_FALLBACK_EXPECTED_TOOL_IDS: Record<string, string[]> = {
  thegraph: ["getSubgraphSchema", "querySubgraph"],
  blockscout: [
    "get_chains_list",
    "get_address_info",
    "get_transactions_by_address",
    "get_transaction_logs",
    "get_contract_abi",
  ],
  nex: [
    "aave_user_positions",
    "aave_user_health",
    "debank_user_total_balance",
    "defi_swap_quote_structured",
    "cryptopanic_latest_news",
    "wormhole_supported_chains",
    "wormhole_supported_routes",
    "wormhole_route_status",
    "wormhole_transfer_status",
  ],
};

const VALUE_MOVING_FALLBACK_EXPECTED_TOOL_IDS: Record<string, string[]> = {
  nex: ["wormhole_bridge_token"],
};

function toNamespacedToolId(venue: McpVenue, toolName: string): string {
  return `mcp_${venue}__${normalizeToolKey(toolName)}`;
}

export async function getExpectedAiSdkMcpToolIds(params: {
  purpose: McpToolsPurpose;
  allowValueMoving?: boolean;
  userId?: string | null;
}): Promise<string[]> {
  const configs = await fetchVenueConfigs({
    userId: params.userId,
    purpose: params.purpose,
    allowValueMoving: params.allowValueMoving,
  });
  const ids = new Set<string>();

  for (const cfg of configs) {
    const fallbackCandidates = [
      ...(READONLY_FALLBACK_EXPECTED_TOOL_IDS[cfg.venue] ?? []),
      ...(params.purpose === "agent_runtime" && params.allowValueMoving
        ? (VALUE_MOVING_FALLBACK_EXPECTED_TOOL_IDS[cfg.venue] ?? [])
        : []),
    ];
    const candidates =
      cfg.allowlist && cfg.allowlist.length > 0
        ? cfg.allowlist
        : fallbackCandidates;

    for (const name of candidates) {
      const toolName = name.trim();
      if (!toolName) continue;
      if (isSensitiveMcpToolName(toolName)) continue;
      if (
        params.purpose === "chat_readonly" &&
        cfg.venue !== "moralis" &&
        isProbablyValueMovingToolName(toolName)
      ) {
        continue;
      }
      ids.add(toNamespacedToolId(cfg.venue, toolName));
    }
  }

  return Array.from(ids).sort();
}

function withValueMovingGate(params: {
  tools: Record<string, Tool>;
  allowValueMoving: boolean;
  venue: McpVenue;
}): Record<string, Tool> {
  if (params.venue === "moralis") return params.tools;
  if (params.allowValueMoving) return params.tools;

  const out: Record<string, Tool> = {};
  for (const [name, tool] of Object.entries(params.tools)) {
    if (!isProbablyValueMovingToolName(name)) {
      out[name] = tool;
      continue;
    }
    out[name] = {
      ...tool,
      description: `[BLOCKED:${params.venue}] ${tool.description ?? ""}`.trim(),
      execute: async () => {
        throw new Error("value_moving_mcp_tool_blocked");
      },
    };
  }
  return out;
}

function namespaceTools(params: { venue: McpVenue; tools: Record<string, Tool> }): Record<string, Tool> {
  const prefix = `mcp_${params.venue}__`;
  return Object.fromEntries(
    Object.entries(params.tools).map(([name, tool]) => [
      `${prefix}${normalizeToolKey(name)}`,
      {
        ...tool,
        description: `[MCP:${params.venue}] ${tool.description ?? ""}`.trim(),
      } satisfies Tool,
    ]),
  );
}

function normalizeUrlForTransport(urlRaw: string, transport: "http" | "sse"): string {
  if (transport !== "sse") return urlRaw;
  try {
    const url = new URL(urlRaw);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname === "" || pathname === "/") {
      url.pathname = "/sse";
      return url.toString();
    }
    // Common: env is set to .../mcp; for SSE we need .../sse.
    if (pathname.endsWith("/mcp")) {
      url.pathname = pathname.replace(/\/mcp$/, "/sse");
      return url.toString();
    }
    return url.toString();
  } catch {
    const trimmed = urlRaw.replace(/\/+$/, "");
    if (trimmed.endsWith("/mcp")) return trimmed.replace(/\/mcp$/, "/sse");
    return trimmed;
  }
}

async function createMcpClientForTransport(params: {
  url: string;
  apiKey?: string | null;
  transport: "http" | "sse";
}): Promise<MCPClient> {
  const headers = buildHeaders({ apiKey: params.apiKey });
  const url = normalizeUrlForTransport(params.url, params.transport);
  return createMcpClient({ transport: { type: params.transport, url, headers } });
}

async function loadVenueTools(params: {
  cfg: VenueConfig;
  purpose: McpToolsPurpose;
  allowValueMoving: boolean;
}): Promise<{
  client: MCPClient;
  loaded: { venue: McpVenue; toolCount: number };
  tools: Record<string, Tool>;
} | null> {
  const { cfg, purpose, allowValueMoving } = params;
  const venue = cfg.venue;
  const clientInitTimeoutMs = resolveTimeoutMs(
    "AI_SDK_MCP_CLIENT_INIT_TIMEOUT_MS",
    2_500,
  );
  const toolsDiscoveryTimeoutMs = resolveTimeoutMs(
    "AI_SDK_MCP_TOOLS_DISCOVERY_TIMEOUT_MS",
    3_500,
  );

  let client: MCPClient | null = null;

  try {
    const attempts: Array<{ transport: "http" | "sse"; url: string }> = [
      { transport: cfg.transport, url: cfg.url },
    ];

    let tools: Record<string, Tool> | null = null;
    let lastError: unknown = null;

    for (const attempt of attempts) {
      const scopeBase = `mcp:${venue}:${attempt.transport}:${attempt.url}`;
      try {
        const clientResult = await withTimeoutFallbackResult(
          createMcpClientForTransport({
            url: attempt.url,
            apiKey: cfg.apiKey,
            transport: attempt.transport,
          }),
          {
            timeoutMs: clientInitTimeoutMs,
            scope: `${scopeBase}:connect`,
            fallback: async () => null,
          },
        );

        if (!clientResult.value) {
          lastError = new Error(
            `mcp_client_init_timeout_after_${clientInitTimeoutMs}ms`,
          );
          client = null;
          continue;
        }

        client = clientResult.value;

        const toolsResult = await withTimeoutFallbackResult(
          client.tools(),
          {
            timeoutMs: toolsDiscoveryTimeoutMs,
            scope: `${scopeBase}:tools`,
            fallback: async () => null,
          },
        );

        if (!toolsResult.value) {
          lastError = new Error(
            `mcp_tools_discovery_timeout_after_${toolsDiscoveryTimeoutMs}ms`,
          );
          await client.close().catch(() => {});
          client = null;
          continue;
        }

        tools = normalizeMcpTools(toolsResult.value, venue);
        break;
      } catch (error) {
        lastError = error;
        await client?.close().catch(() => {});
        client = null;
      }
    }

    if (!client || !tools) {
      throw lastError instanceof Error
        ? lastError
        : new Error(String(lastError ?? "unknown_mcp_error"));
    }

    tools = stripSensitiveTools(tools);
    tools = applyAllowlist(tools, cfg.allowlist);

    if (purpose === "chat_readonly") {
      tools = stripValueMovingTools(tools, venue);
    }

    tools = withValueMovingGate({ tools, allowValueMoving, venue });

    const namespaced = namespaceTools({ venue, tools });

    return {
      client,
      loaded: { venue, toolCount: Object.keys(namespaced).length },
      tools: namespaced,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[mcp:${venue}] failed to initialize tools (${cfg.url}): ${message}`);
    await client?.close().catch(() => {});
    return null;
  }
}

export async function loadAiSdkMcpTools(params: LoadAiSdkMcpToolsParams): Promise<LoadAiSdkMcpToolsResult> {
  const purpose = params.purpose;
  const allowValueMoving = purpose === "chat_readonly" ? false : Boolean(params.allowValueMoving);
  
  const clients: MCPClient[] = [];
  const loaded: Array<{ venue: McpVenue; toolCount: number }> = [];
  const toolsByVenue: Array<Record<string, Tool>> = [];

  const configs = await fetchVenueConfigs({
    userId: params.userId,
    purpose,
    allowValueMoving,
  });
  const results = await Promise.all(
    configs.map((cfg) =>
      loadVenueTools({
        cfg,
        purpose,
        allowValueMoving,
      }),
    ),
  );

  for (const result of results) {
    if (!result) {
      continue;
    }

    clients.push(result.client);
    loaded.push(result.loaded);
    toolsByVenue.push(result.tools);
  }

  return {
    tools: Object.assign({}, ...toolsByVenue),
    loaded,
    close: async () => {
      await Promise.allSettled(clients.map((client) => client.close()));
    },
  };
}
