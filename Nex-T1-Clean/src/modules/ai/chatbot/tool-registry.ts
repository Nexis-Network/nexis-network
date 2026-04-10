import { AI_TOOL_LOADERS } from "./tool-registry.ai";
import { MARKET_DEFI_TOOL_LOADERS } from "./tool-registry.market-defi";
import { ONCHAIN_TOOL_LOADERS } from "./tool-registry.onchain";
import { SEARCH_TOOL_LOADERS } from "./tool-registry.search";
import { SHARED_TOOL_LOADERS } from "./tool-registry.shared";
import { SOLANA_TOOL_LOADERS } from "./tool-registry.solana";
import type { ToolCategory, ToolLoader } from "./tool-registry.types";
import { WALLET_TOOL_LOADERS } from "./tool-registry.wallet";

export const TOOL_CATEGORY_ORDER: ToolCategory[] = [
  "search",
  "ai",
  "wallet",
  "defi",
  "market",
  "onchain",
  "solana",
  "bitcoin",
  "browser",
  "optional",
];

export const ALL_TOOL_LOADERS: Record<string, ToolLoader> = {
  ...SEARCH_TOOL_LOADERS,
  ...AI_TOOL_LOADERS,
  ...WALLET_TOOL_LOADERS,
  ...MARKET_DEFI_TOOL_LOADERS,
  ...ONCHAIN_TOOL_LOADERS,
  ...SOLANA_TOOL_LOADERS,
  ...SHARED_TOOL_LOADERS,
};

function buildCategoryTools(loaders: Record<string, ToolLoader>): Record<ToolCategory, string[]> {
  const buckets = Object.fromEntries(
    TOOL_CATEGORY_ORDER.map((category) => [category, [] as string[]]),
  ) as Record<ToolCategory, string[]>;

  for (const [toolId, loader] of Object.entries(loaders)) {
    buckets[loader.category].push(toolId);
  }

  return buckets;
}

export const CATEGORY_TOOLS = buildCategoryTools(ALL_TOOL_LOADERS);

export const getRegisteredToolIds = (): string[] =>
  Object.keys(ALL_TOOL_LOADERS).sort((left, right) => left.localeCompare(right));

export const getToolCategories = (): ToolCategory[] => [...TOOL_CATEGORY_ORDER];
