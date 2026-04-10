import type { AgentListingType } from "@/lib/agents/types";

export type AgentFilterState = {
  query: string;
  listingTypes: AgentListingType[];
  networks: string[];
  assets: string[];
};

export type FilterOption = {
  value: string;
  label: string;
  badge?: string;
};

export const DEFAULT_AGENT_FILTER_STATE: AgentFilterState = {
  query: "",
  listingTypes: [],
  networks: [],
  assets: [],
};

type SearchParams = Record<string, string | string[] | undefined>;

export function parseAgentFilterState(search: SearchParams): AgentFilterState {
  const pickString = (key: keyof SearchParams): string | undefined => {
    const value = search[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  };

  const query = pickString("q")?.trim() ?? "";

  const listingTypesRaw = pickString("listingTypes") ?? "";
  const listingTypes = sanitizeList(listingTypesRaw).filter(isAgentListingType);

  const networksRaw = pickString("networks") ?? "";
  const networks = sanitizeList(networksRaw);

  const assetsRaw = pickString("assets") ?? "";
  const assets = sanitizeList(assetsRaw);

  return {
    query,
    listingTypes,
    networks,
    assets,
  };
}

export function mergeFilterState(
  base: AgentFilterState,
  next: Partial<AgentFilterState>,
): AgentFilterState {
  return {
    query: typeof next.query === "string" ? next.query : base.query,
    listingTypes: Array.isArray(next.listingTypes) ? next.listingTypes : base.listingTypes,
    networks: Array.isArray(next.networks) ? next.networks : base.networks,
    assets: Array.isArray(next.assets) ? next.assets : base.assets,
  };
}

function sanitizeList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isAgentListingType(value: string): value is AgentListingType {
  return value === "sale" || value === "rent" || value === "usage";
}
