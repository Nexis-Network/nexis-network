import "server-only";

import type { WatchlistAssetType } from "@/types/watchlist";
import { watchlistItemInputSchema, type WatchlistItemNormalized } from "@/modules/watchlist/validation";
import { normalizeEvmAddress, normalizeSolanaAddress } from "@/server/moralis/validation";

const EVM_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;
const SOL_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

const CHAIN_ALIAS_MAP: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  base: "base",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon",
  bsc: "bsc",
  "binance-smart-chain": "bsc",
  avalanche: "avalanche",
  avax: "avalanche",
  fantom: "fantom",
  linea: "linea",
  sol: "solana",
  solana: "solana",
};

const EVM_CHAIN_ID_TO_NAME: Record<number, string> = {
  1: "ethereum",
  10: "optimism",
  56: "bsc",
  137: "polygon",
  8453: "base",
  42161: "arbitrum",
  43114: "avalanche",
};

type AddressFamily = "evm" | "sol";

type AddressCandidate = {
  address: string;
  family: AddressFamily;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstString(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstNumber(input: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
  }
  return null;
}

function normalizeChainName(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return CHAIN_ALIAS_MAP[normalized] ?? normalized;
}

function normalizeUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.7;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function inferAddressFromString(value: string): AddressCandidate | null {
  const evmMatches = value.match(EVM_ADDRESS_REGEX);
  if (evmMatches) {
    for (const match of evmMatches) {
      try {
        const normalized = normalizeEvmAddress(match);
        return { family: "evm", address: normalized };
      } catch {
        continue;
      }
    }
  }

  const solMatches = value.match(SOL_ADDRESS_REGEX);
  if (solMatches) {
    for (const match of solMatches) {
      try {
        const normalized = normalizeSolanaAddress(match);
        return { family: "sol", address: normalized };
      } catch {
        continue;
      }
    }
  }

  return null;
}

function collectStringCandidates(payload: Record<string, unknown>): string[] {
  const values: string[] = [];
  const stack: unknown[] = [payload];
  let traversedObjects = 0;

  while (stack.length > 0 && traversedObjects < 50) {
    const current = stack.pop();
    if (!isRecord(current)) continue;
    traversedObjects += 1;

    for (const value of Object.values(current)) {
      if (typeof value === "string" && value.trim()) {
        values.push(value.trim());
        continue;
      }
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === "string" && entry.trim()) {
            values.push(entry.trim());
          } else if (isRecord(entry)) {
            stack.push(entry);
          }
        }
        continue;
      }
      if (isRecord(value)) {
        stack.push(value);
      }
    }
  }

  return values;
}

function inferAddress(payload: Record<string, unknown>, sourceUrl: string | null): AddressCandidate | null {
  const directAddress = firstString(payload, [
    "addressOrMint",
    "tokenAddress",
    "contractAddress",
    "mint",
    "address",
    "assetAddress",
    "collectionAddress",
  ]);

  if (directAddress) {
    try {
      return { family: "evm", address: normalizeEvmAddress(directAddress) };
    } catch {
      try {
        return { family: "sol", address: normalizeSolanaAddress(directAddress) };
      } catch {
        // Fall through to string extraction.
      }
    }
  }

  const candidates = collectStringCandidates(payload);
  if (sourceUrl) {
    candidates.push(sourceUrl);
    try {
      candidates.push(decodeURIComponent(sourceUrl));
    } catch {
      // Keep original url only.
    }
  }

  for (const candidate of candidates) {
    const resolved = inferAddressFromString(candidate);
    if (resolved) return resolved;
  }

  return null;
}

function inferAssetType(payload: Record<string, unknown>, family: AddressFamily): WatchlistAssetType {
  const rawAssetType = firstString(payload, ["assetType", "type", "itemType", "tokenType"])?.toUpperCase() ?? null;
  if (
    rawAssetType === "EVM_ERC20" ||
    rawAssetType === "EVM_NFT" ||
    rawAssetType === "SOL_SPL" ||
    rawAssetType === "SOL_NFT" ||
    rawAssetType === "UNKNOWN"
  ) {
    return rawAssetType;
  }

  const tokenId = firstString(payload, ["tokenId", "nftId", "collectionTokenId"]);
  const isNftHint = Boolean(tokenId) || rawAssetType === "NFT" || firstString(payload, ["standard"])?.toUpperCase() === "ERC721";

  if (family === "evm") {
    return isNftHint ? "EVM_NFT" : "EVM_ERC20";
  }
  return isNftHint ? "SOL_NFT" : "SOL_SPL";
}

function inferSourceSite(payload: Record<string, unknown>, sourceUrl: string): string {
  const explicitSourceSite = firstString(payload, ["sourceSite", "site", "domain", "hostname"]);
  if (explicitSourceSite) return explicitSourceSite.toLowerCase();

  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "embedded";
  }
}

function inferChainName(payload: Record<string, unknown>, family: AddressFamily, chainId: number | null): string {
  const explicit = normalizeChainName(firstString(payload, ["chainName", "chain", "network", "blockchain"]));
  if (explicit) return explicit;
  if (chainId && EVM_CHAIN_ID_TO_NAME[chainId]) {
    return EVM_CHAIN_ID_TO_NAME[chainId];
  }
  return family === "evm" ? "ethereum" : "solana";
}

function normalizedMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  const metadata = payload.metadata;
  if (!isRecord(metadata)) return {};

  const safeEntries = Object.entries(metadata).filter(([key]) => key.length <= 100);
  return Object.fromEntries(safeEntries);
}

export function normalizeEmbeddedWatchlistPayload(raw: unknown): WatchlistItemNormalized | null {
  if (!isRecord(raw)) return null;

  const sourceUrl = normalizeUrl(firstString(raw, ["sourceUrl", "pageUrl", "url", "href", "location"]));
  if (!sourceUrl) return null;

  const address = inferAddress(raw, sourceUrl);
  if (!address) return null;

  const chainId = firstNumber(raw, ["chainId", "networkId"]);
  const chainName = inferChainName(raw, address.family, chainId);
  const assetType = inferAssetType(raw, address.family);
  const tokenId = firstString(raw, ["tokenId", "nftId", "collectionTokenId"]);
  const sourceSite = inferSourceSite(raw, sourceUrl);

  const candidate = {
    assetType,
    chainName,
    chainId: chainId ?? undefined,
    addressOrMint: address.address,
    tokenId: tokenId ?? undefined,
    symbol: firstString(raw, ["symbol", "ticker"]) ?? undefined,
    name: firstString(raw, ["name", "tokenName", "title"]) ?? undefined,
    displayName: firstString(raw, ["displayName", "label"]) ?? undefined,
    logoUrl: normalizeUrl(firstString(raw, ["logoUrl", "imageUrl", "iconUrl"])) ?? undefined,
    source: firstString(raw, ["source"]) ?? "extension",
    sourceSite,
    sourceUrl,
    confidence: normalizeConfidence(raw.confidence),
    evidence: undefined,
    metadata: normalizedMetadata(raw),
  };

  try {
    return watchlistItemInputSchema.parse(candidate);
  } catch {
    return null;
  }
}
