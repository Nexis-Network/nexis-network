import { DEFAULT_TOKEN_REGISTRY, TOKEN_REGISTRY_VERSION } from "@/modules/tokens/registry/default-registry";
import { TOKEN_SUPPORT_OVERRIDE_ENTRIES } from "@/modules/tokens/registry/support-overrides";
import { getCommonBaseAssetIds, resolveDefaultSwapPair } from "@/modules/tokens/server/pair-service";
import {
  PUBLIC_TOKEN_REGISTRY_CACHE_KEY,
  rememberPublicRegistry,
} from "@/modules/tokens/server/registry-cache";
import { enrichTokenRegistry } from "@/modules/tokens/server/metadata-enrichment-service";
import { getExternalTokenListSnapshot } from "@/modules/tokens/server/external-token-list-service";
import { CHAIN_REGISTRY } from "@/modules/tokens/chains";
import { buildTokenAssetId } from "@/modules/tokens/utils/asset-id";
import type {
  ResolvedDefaultSwapPair,
  TokenAssetInfo,
  TokenRegistryEntry,
  TokenRegistryQuery,
  TokenRegistrySnapshot,
} from "@/modules/tokens/types";

function mergeRegistryEntries(entries: TokenRegistryEntry[]): TokenRegistryEntry[] {
  const merged = new Map<string, TokenRegistryEntry>();

  for (const entry of entries) {
    const key = buildTokenAssetId({
      chainId: entry.chainId,
      address: entry.address,
      platform: entry.platform,
    });
    const existing = merged.get(key);

    merged.set(key, {
      ...existing,
      ...entry,
      sources: Array.from(new Set([...(existing?.sources ?? []), ...entry.sources])),
      tags: Array.from(new Set([...(existing?.tags ?? []), ...(entry.tags ?? [])])),
      keywords: Array.from(new Set([...(existing?.keywords ?? []), ...(entry.keywords ?? [])])),
    });
  }

  return Array.from(merged.values());
}

function sortTokens(tokens: TokenAssetInfo[]): TokenAssetInfo[] {
  return [...tokens].sort((left, right) => {
    if (left.chainId !== right.chainId) {
      return left.chainId - right.chainId;
    }

    if (left.isNative !== right.isNative) {
      return left.isNative ? -1 : 1;
    }

    return left.symbol.localeCompare(right.symbol);
  });
}

function matchesSearch(token: TokenAssetInfo, search?: string): boolean {
  if (!search) {
    return true;
  }

  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    token.symbol.toLowerCase().includes(normalized) ||
    token.name.toLowerCase().includes(normalized) ||
    token.address.toLowerCase() === normalized ||
    token.tags.some((tag) => tag.toLowerCase().includes(normalized))
  );
}

function shouldIncludeToken(token: TokenAssetInfo, query: TokenRegistryQuery): boolean {
  if (query.chainId && token.chainId !== query.chainId) {
    return false;
  }

  if (!matchesSearch(token, query.search)) {
    return false;
  }

  if (token.supportStatus === "unsupported" && !query.includeUnsupported) {
    return false;
  }

  if (token.supportStatus === "broken" && !query.includeBroken) {
    return false;
  }

  if (token.supportStatus === "banned" && !query.includeBanned) {
    return false;
  }

  return true;
}

async function buildPublicSnapshot(): Promise<TokenRegistrySnapshot> {
  const externalSnapshot = await getExternalTokenListSnapshot();
  const entries = mergeRegistryEntries([
    ...externalSnapshot.entries,
    ...DEFAULT_TOKEN_REGISTRY,
    ...TOKEN_SUPPORT_OVERRIDE_ENTRIES,
  ]);
  const tokens = sortTokens(enrichTokenRegistry(entries));

  return {
    version: TOKEN_REGISTRY_VERSION,
    tokens,
    chains: Object.values(CHAIN_REGISTRY),
    commonBases: Object.fromEntries(
      Object.keys(CHAIN_REGISTRY).map((chainId) => [
        chainId,
        getCommonBaseAssetIds(Number(chainId)),
      ]),
    ),
    defaultPairs: Object.values(CHAIN_REGISTRY)
      .map((chain) => resolveDefaultSwapPair(tokens, chain.chainId)?.pair)
      .filter((pair): pair is NonNullable<typeof pair> => Boolean(pair)),
  };
}

export async function getTokenRegistrySnapshot(
  query: TokenRegistryQuery,
): Promise<TokenRegistrySnapshot> {
  const snapshot = await rememberPublicRegistry(
    PUBLIC_TOKEN_REGISTRY_CACHE_KEY,
    buildPublicSnapshot,
  );

  return {
    ...snapshot,
    tokens: snapshot.tokens.filter((token) => shouldIncludeToken(token, query)),
  };
}

export async function getDefaultSwapPairForChain(
  chainId: number,
): Promise<ResolvedDefaultSwapPair | null> {
  const snapshot = await getTokenRegistrySnapshot({
    includeUnsupported: true,
    includeBroken: true,
    includeBanned: true,
  });

  return resolveDefaultSwapPair(snapshot.tokens, chainId);
}
