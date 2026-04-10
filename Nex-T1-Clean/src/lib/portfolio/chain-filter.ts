import { getJsonString } from "@/lib/json";
import type { JsonObject } from "@/types/json";

type SupportedChainKey =
  | "ethereum"
  | "base"
  | "optimism"
  | "arbitrum"
  | "polygon"
  | "bnb"
  | "avalanche"
  | "linea"
  | "monad"
  | "hyperliquid"
  | "solana";

const CHAIN_KEY_TO_ID: Record<SupportedChainKey, number | "solana"> = {
  ethereum: 1,
  base: 8453,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
  bnb: 56,
  avalanche: 43114,
  linea: 59144,
  monad: 143,
  hyperliquid: 999,
  solana: "solana",
};

const CHAIN_ID_TO_KEY = new Map<number, SupportedChainKey>(
  Object.entries(CHAIN_KEY_TO_ID)
    .filter((entry): entry is [SupportedChainKey, number] => typeof entry[1] === "number")
    .map(([key, id]) => [id, key]),
);

const CHAIN_ALIASES: Record<string, SupportedChainKey> = {
  eth: "ethereum",
  ethereum: "ethereum",
  mainnet: "ethereum",
  base: "base",
  op: "optimism",
  optimism: "optimism",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  matic: "polygon",
  pol: "polygon",
  polygon: "polygon",
  bnb: "bnb",
  bsc: "bnb",
  avalanche: "avalanche",
  avax: "avalanche",
  linea: "linea",
  monad: "monad",
  hyperliquid: "hyperliquid",
  hype: "hyperliquid",
  sol: "solana",
  solana: "solana",
};

function parseNumericChain(raw: string): number | null {
  if (/^\d+$/u.test(raw)) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (/^0x[0-9a-f]+$/u.test(raw)) {
    const parsed = Number.parseInt(raw.slice(2), 16);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (/^eip155:\d+$/u.test(raw)) {
    const parsed = Number.parseInt(raw.split(":")[1] ?? "", 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizePortfolioChainKey(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 101) return "solana";
    return CHAIN_ID_TO_KEY.get(value) ?? String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  if (raw === "101" || raw === "solana") {
    return "solana";
  }

  const aliasMatch = CHAIN_ALIASES[raw];
  if (aliasMatch) {
    return aliasMatch;
  }

  const numeric = parseNumericChain(raw);
  if (typeof numeric === "number") {
    if (numeric === 101) return "solana";
    return CHAIN_ID_TO_KEY.get(numeric) ?? String(numeric);
  }

  return raw;
}

export function portfolioChainMatchesFilter(walletChain: unknown, filterChainId?: string | null): boolean {
  const rawFilter = String(filterChainId ?? "").trim();
  if (!rawFilter || rawFilter === "all") {
    return true;
  }

  const normalizedFilter = normalizePortfolioChainKey(rawFilter);
  const normalizedWallet = normalizePortfolioChainKey(walletChain);

  if (!normalizedFilter || !normalizedWallet) {
    return false;
  }

  return normalizedFilter === normalizedWallet;
}

export function toPortfolioRequestChainId(
  value: unknown,
  options?: {
    walletType?: string | null;
    providerName?: string | null;
    namespace?: string | null;
    metadata?: JsonObject | null;
  },
): number | "solana" | null {
  const walletType = (options?.walletType ?? "").toLowerCase();
  const providerName = (options?.providerName ?? "").toLowerCase();
  const namespace = (options?.namespace ?? "").toLowerCase();
  const metadataKind = getJsonString(options?.metadata, "kind")?.toLowerCase() ?? "";

  if (
    namespace === "solana" ||
    walletType.includes("solana") ||
    providerName.includes("phantom") ||
    providerName.includes("solflare") ||
    metadataKind === "solana"
  ) {
    return "solana";
  }

  if (metadataKind === "stellar" || namespace === "stellar") {
    return null;
  }

  const candidates = [
    value,
    options?.metadata?.chainId ?? null,
    options?.metadata?.chain_id ?? null,
    options?.metadata?.network ?? null,
    options?.metadata?.chain ?? null,
    options?.namespace ?? null,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePortfolioChainKey(candidate);
    if (!normalized) continue;
    if (normalized === "solana") return "solana";

    const mapped = CHAIN_KEY_TO_ID[normalized as SupportedChainKey];
    if (typeof mapped === "number") {
      return mapped;
    }

    const numeric = parseNumericChain(normalized);
    if (typeof numeric === "number") {
      return numeric;
    }
  }

  return 1;
}
