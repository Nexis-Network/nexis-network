import { isMcpEndpointAvailable } from "@/server/services/mcp/availability";
import type { ToolLoader } from "./tool-registry.types";

export const envTrue = (value: string | undefined): boolean =>
  typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

export const SHARED_TOOL_LOADERS: Record<string, ToolLoader> = {
  escalate_to_human: {
    category: "ai",
    load: async () =>
      (await import("@/modules/chat/tools/escalate-to-human")).escalateToHumanTool,
  },
};

export const cdpWalletsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS === "true";

export const memoryAdapterEnabled = (): boolean =>
  envTrue(process.env.AI_SDK_V6_MEMORY_ADAPTER_ENABLED ?? "true");

export const MARKET_MCP_BASE_URLS = {
  binance: process.env.MCP_BINANCE_BASE_URL ?? "https://binance.nex-t1.ai",
  dexscreener: process.env.MCP_DEXSCREENER_BASE_URL ?? "https://dexscreener.nex-t1.ai",
} as const;

const MARKET_MCP_TIMEOUT_MS = Number(process.env.MCP_MARKET_TOOL_HEALTH_TIMEOUT_MS ?? 1_500);
const MARKET_MCP_CACHE_TTL_MS = Number(process.env.MCP_MARKET_TOOL_HEALTH_TTL_MS ?? 60_000);

export async function isMarketMcpToolAvailable(baseUrl: string): Promise<boolean> {
  return isMcpEndpointAvailable(baseUrl, {
    requestTimeoutMs: MARKET_MCP_TIMEOUT_MS,
    cacheTtlMs: MARKET_MCP_CACHE_TTL_MS,
  });
}
