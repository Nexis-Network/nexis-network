import {
  getCoinCategories,
  getCoinDataByContract,
  getCoinDetails,
  getNftDetails,
  getNftMarketChart,
  getTopCoins,
  searchCoins,
} from "@/server/market/coingecko";
import { searchPairs } from "@/server/market/dexscreener";
import { getTopPairs } from "@/server/market/dextools";
import { getDefiLlamaProtocols } from "@/server/market/defillama";
import {
  getEvmErc20Metadata,
  getEvmErc20TokenPrice,
  pickEvmTokenLogo,
} from "@/server/moralis/evm/token";
import { getSolanaTokenPairsByAddress } from "@/server/moralis/solana/dex";
import {
  getPumpfunTokenMetadata,
  getPumpfunTokenPrice,
} from "@/server/moralis/solana/pumpfun";
import { getSolanaTokenPrice } from "@/server/moralis/solana/price";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import {
  normalizeEvmAddress,
  normalizeEvmChain,
  normalizeSolanaAddress,
  normalizeSolanaNetwork,
} from "@/server/moralis/validation";
import {
  getMessariAssetMetrics,
  getMessariReports,
} from "@/lib/vendors/messari";
import type { MessariReportResponse } from "@/lib/vendors/messari";
import type {
  AssetNewsItem,
  AssetSnapshotResponse,
  NftAssetSnapshot,
  PeerAsset,
  TokenAssetSnapshot,
} from "@/types/token-page";
import type {
  CoinCategorySummary,
  CoinDetails,
  CoinMarketRow,
  DefiLlamaProtocol,
  DexPairSummary,
  DexTokenSummary,
  NftCollectionDetails,
} from "@/types/market";

import { logger } from "@/lib/logger";
const MESSARI_LOOKBACK_DAYS = 45;
const MAX_DEX_QUERIES = 3;
const MAX_DEX_RESULTS = 8;
const MAX_PEERS = 6;
const DEFAULT_NFT_CHART_TIMEFRAME = "30D";
const DEFAULT_NFT_CHART_DAYS = 30;
const TOKEN_SNAPSHOT_STEP_TIMEOUT_MS = Number(
  process.env.TOKEN_SNAPSHOT_STEP_TIMEOUT_MS ?? 20_000,
);
const TOKEN_VENDOR_TIMEOUT_BUFFER_MS = 2_500;
const TOKEN_VENDOR_TIMEOUT_MS = Math.max(
  7_000,
  TOKEN_SNAPSHOT_STEP_TIMEOUT_MS - TOKEN_VENDOR_TIMEOUT_BUFFER_MS,
);
const TOKEN_MAX_PEER_CATEGORIES = 3;
const TOKEN_DEX_TIMEOUT_MS = Math.max(
  5_000,
  TOKEN_SNAPSHOT_STEP_TIMEOUT_MS - 4_000,
);
const MAX_MESSARI_SLUG_ATTEMPTS = Number(
  process.env.MESSARI_SLUG_ATTEMPTS ?? 5,
);

const CHAIN_TO_CATEGORY_MAP: Record<string, string> = {
  "solana": "solana-ecosystem",
  "ethereum": "ethereum-ecosystem",
  "base": "base-ecosystem",
  "arbitrum": "arbitrum-ecosystem",
  "optimism": "optimism-ecosystem",
  "polygon": "polygon-ecosystem",
  "avalanche": "avalanche-ecosystem",
  "bsc": "bnb-chain-ecosystem",
};

const DEXTOOLS_NETWORK_MAP: Record<string, string> = {
  ethereum: "ether",
  eth: "ether",
  optimism: "optimism",
  arbitrum: "arbitrum",
  polygon: "polygon",
  matic: "polygon",
  base: "base",
  avalanche: "avax",
  avax: "avax",
  bnb: "bsc",
  "binance-smart-chain": "bsc",
  bsc: "bsc",
  fantom: "fantom",
  linea: "linea",
  scroll: "scroll",
  blast: "blast",
};

// Token page compatibility:
// Allow navigation from Moralis-backed lists by resolving a contract-style slug to a CoinGecko id.
// Slug formats:
// - `evm-0x1-0x...` (chain hex + contract)
// - `solana-<mint>` (SPL mint)
const COINGECKO_PLATFORM_BY_EVM_CHAIN: Record<string, string> = {
  "0x1": "ethereum",
  "0x2105": "base",
  "0xa4b1": "arbitrum-one",
  "0xa": "optimism",
  "0x89": "polygon-pos",
  "0x38": "bsc",
  "0xa86a": "avalanche",
};

type ParsedContractSlug =
  | { kind: "solana"; platform: "solana"; address: string }
  | {
    kind: "evm";
    platform: string | null;
    chain: `0x${string}`;
    address: string;
  };

function parseContractSlug(slug: string): ParsedContractSlug | null {
  const trimmed = slug.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("solana-")) {
    const mint = trimmed.slice("solana-".length);
    if (!mint) return null;
    try {
      return {
        kind: "solana",
        platform: "solana",
        address: normalizeSolanaAddress(mint),
      };
    } catch {
      return null;
    }
  }

  if (lower.startsWith("evm-")) {
    const parts = trimmed.split("-");
    if (parts.length < 3) return null;
    const chainRaw = parts[1]?.toLowerCase() ?? "";
    const contractAddressRaw = parts.slice(2).join("-");
    if (!chainRaw || !contractAddressRaw) return null;
    try {
      const chain = normalizeEvmChain(chainRaw) as `0x${string}`;
      const address = normalizeEvmAddress(contractAddressRaw);
      const platform = COINGECKO_PLATFORM_BY_EVM_CHAIN[chain] ?? null;
      return { kind: "evm", chain, platform, address };
    } catch {
      return null;
    }
  }

  return null;
}

async function withSnapshotTimeout<T>(
  label: string,
  runner: (signal: AbortSignal) => Promise<T>,
  errors?: string[],
): Promise<T | null> {
  const timeoutTag = Symbol(label);
  const controller = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const runnerPromise = runner(controller.signal);
  const task = runnerPromise.catch((error) => {
    if (controller.signal.aborted) {
      return timeoutTag;
    }
    throw error;
  });

  const timeoutPromise = new Promise<typeof timeoutTag>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(
        new Error(
          `[token-snapshot] ${label} timed out after ${TOKEN_SNAPSHOT_STEP_TIMEOUT_MS}ms`,
        ),
      );
      resolve(timeoutTag);
    }, TOKEN_SNAPSHOT_STEP_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([task, timeoutPromise]);
    if (result === timeoutTag) {
      errors?.push(
        `${label}: timeout after ${TOKEN_SNAPSHOT_STEP_TIMEOUT_MS}ms`,
      );
      logger.warn(
        `[token-snapshot] ${label} timed out after ${TOKEN_SNAPSHOT_STEP_TIMEOUT_MS}ms`,
      );
      runnerPromise
        .then(() => {
          logger.warn(`[token-snapshot] ${label} completed after timeout`);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          logger.warn(`[token-snapshot] ${label} failed after timeout`, error);
        });
      return null;
    }
    return result as T;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function mergeDexSource(
  current: TokenAssetSnapshot["dexPairsSource"],
  incoming: "dexscreener" | "dextools",
): TokenAssetSnapshot["dexPairsSource"] {
  if (current === "none") {
    return incoming;
  }
  if (current === incoming) {
    return current;
  }
  return "mixed";
}

function nowIso() {
  return new Date().toISOString();
}

function buildSlugCandidates(coin: CoinDetails, explicitId: string): string[] {
  const candidates = new Set<string>();
  const normalize = (value?: string | null) => value?.trim().toLowerCase();

  candidates.add(normalize(explicitId) ?? "");
  candidates.add(normalize(coin.id) ?? "");
  candidates.add(normalize(coin.symbol) ?? "");
  candidates.add(normalize(coin.name)?.replace(/\s+/g, "-") ?? "");

  for (const category of coin.categories) {
    const normalized = normalize(category)?.replace(/\s+/g, "-");
    if (normalized) {
      candidates.add(normalized);
    }
  }

  return Array.from(candidates)
    .filter(Boolean)
    .slice(0, Math.max(1, MAX_MESSARI_SLUG_ATTEMPTS));
}

function mapMessariNewsToItems(
  entries: MessariReportResponse["data"] | undefined,
): AssetNewsItem[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.slice(0, 8).map((entry) => ({
    id: entry.id,
    title: entry.title,
    summary: null,
    url: entry.url,
    source: "Messari",
    publishedAt: entry.published_at,
    tags: entry.tags,
  }));
}

async function fetchMessariMetrics(
  coin: CoinDetails,
  explicitId: string,
  errors: string[],
  signal?: AbortSignal,
) {
  const candidates = buildSlugCandidates(coin, explicitId);
  for (const candidate of candidates) {
    try {
      const response = await getMessariAssetMetrics(candidate, undefined, {
        signal,
      });
      const payload = response.data?.data;
      if (!payload) {
        continue;
      }
      return {
        tvlUsd: payload.defi?.total_value_locked_usd ?? null,
        volume24hUsd: payload.market_data?.volume_last_24_hours ?? null,
        transactions24h: payload.chain_data?.transactions_last_24_hours ?? null,
        revenue24hUsd: payload.fees?.revenue_last_24_hours ?? null,
      } satisfies TokenAssetSnapshot["messariMetrics"];
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`messari.metrics(${candidate}): ${message}`);
    }
  }
  return undefined;
}

async function fetchMessariReportsForCoin(
  coin: CoinDetails,
  explicitId: string,
  errors: string[],
  signal?: AbortSignal,
) {
  const candidates = buildSlugCandidates(coin, explicitId);
  const publishedAfter = new Date(
    Date.now() - MESSARI_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const candidate of candidates) {
    try {
      const response = await getMessariReports(
        { asset: candidate, publishedAfter },
        1800,
        { signal },
      );
      if (Array.isArray(response.data?.data) && response.data.data.length) {
        return mapMessariNewsToItems(response.data.data);
      }
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`messari.reports(${candidate}): ${message}`);
    }
  }
  return [];
}

function normalizePeer(row: CoinMarketRow, categories?: string[]): PeerAsset {
  return {
    id: row.id,
    slug: row.id,
    name: row.name,
    symbol: row.symbol,
    priceUsd: row.currentPrice,
    priceChangePercent24h: row.priceChangePercentage24h,
    marketCapUsd: row.marketCap,
    logoUrl: row.image,
    categories,
    entityType: "token",
  } satisfies PeerAsset;
}

async function fetchPeerAssets(
  coin: CoinDetails,
  errors: string[],
  signal?: AbortSignal,
  options?: { timeoutMs?: number; maxCategories?: number },
): Promise<PeerAsset[]> {
  if (!coin.categories.length) {
    // Fallback: If no categories, use the primary chain as a category for peer discovery
    const primaryChain = coin.networks[0]?.chain;
    if (primaryChain) {
      return fetchPeerAssetsByChain(
        primaryChain,
        coin,
        errors,
        signal,
        options,
      );
    }
    return [];
  }

  try {
    const categoriesResponse = await getCoinCategories();
    const availableCategories = categoriesResponse.data ?? [];
    const normalizedCategories = coin.categories
      .map((category) => category.trim().toLowerCase())
      .filter((category) => category.length > 0);
    if (!normalizedCategories.length) {
      return [];
    }

    const normalizedCategorySet = new Set(normalizedCategories);

    const matchingCategories = availableCategories.filter((
      category: CoinCategorySummary,
    ) => normalizedCategorySet.has(category.name.trim().toLowerCase()));

    if (!matchingCategories.length) {
      return [];
    }

    const limitedCategories = matchingCategories.slice(
      0,
      options?.maxCategories ?? TOKEN_MAX_PEER_CATEGORIES,
    );
    const categoryIds = Array.from(
      new Set(limitedCategories.map((category) => category.id)),
    );
    const categoryNames = Array.from(
      new Set(limitedCategories.map((category) => category.name)),
    );
    const peersPageSize = Math.min(
      60,
      Math.max(25, MAX_PEERS * limitedCategories.length * 2),
    );

    // CoinGecko only supports one category at a time in getTopCoins
    const primaryCategory = categoryIds[0];

    const markets = await getTopCoins({
      vsCurrency: "usd",
      order: "market_cap_desc",
      perPage: peersPageSize,
      page: 1,
      category: primaryCategory,
      priceChangePercentage: "24h",
    });

    return (markets.data ?? []).map((row) => normalizePeer(row, categoryNames));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    errors.push(`peers: ${message}`);
    return [];
  }
}

async function fetchPeerAssetsByChain(
  chain: string,
  coin: CoinDetails,
  errors: string[],
  _signal?: AbortSignal,
  _options?: { timeoutMs?: number },
): Promise<PeerAsset[]> {
  try {
    const category = CHAIN_TO_CATEGORY_MAP[chain.toLowerCase()];

    const markets = await getTopCoins({
      vsCurrency: "usd",
      order: "volume_desc",
      perPage: 20,
      page: 1,
      category,
      priceChangePercentage: "24h",
    });

    return (markets.data ?? [])
      .filter((row) => row.id !== coin.id)
      .slice(0, MAX_PEERS)
      .map((row) => normalizePeer(row, [chain]));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    errors.push(`peersByChain(${chain}): ${message}`);
    return [];
  }
}

async function fetchDefiStats(
  coin: CoinDetails,
  errors: string[],
  signal?: AbortSignal,
) {
  try {
    const protocols = await getDefiLlamaProtocols({ signal });
    const match = findMatchingProtocol(protocols.data, coin);
    if (!match) {
      return undefined;
    }
    return {
      tvlUsd: match.tvlUsd,
      change1h: match.change1h ?? null,
      change1d: match.change1d ?? null,
      change7d: match.change7d ?? null,
      change1m: match.change1m ?? null,
      url: match.url ?? null,
    } satisfies TokenAssetSnapshot["defiLlama"];
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    errors.push(`defillama.protocols: ${message}`);
    return undefined;
  }
}

function findMatchingProtocol(
  protocols: DefiLlamaProtocol[],
  coin: CoinDetails,
): DefiLlamaProtocol | null {
  const symbol = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();
  const id = coin.id.toLowerCase();

  return (
    protocols.find((protocol) => protocol.slug?.toLowerCase() === id) ??
      protocols.find((protocol) => protocol.symbol?.toLowerCase() === symbol) ??
      protocols.find((protocol) => protocol.name?.toLowerCase() === name) ??
      null
  );
}

async function fetchDexPairs(
  coin: CoinDetails,
  errors: string[],
  signal?: AbortSignal,
  options?: { timeoutMs?: number },
): Promise<
  { pairs: DexPairSummary[]; source: TokenAssetSnapshot["dexPairsSource"] }
> {
  const seen = new Map<string, DexPairSummary>();
  let source: TokenAssetSnapshot["dexPairsSource"] = "none";

  const queries = new Set<string>();
  for (const network of coin.networks) {
    if (network.contractAddress) {
      queries.add(network.contractAddress);
    }
  }
  if (coin.symbol) {
    queries.add(coin.symbol);
  }

  const prioritizedQueries = Array.from(queries).slice(0, MAX_DEX_QUERIES);

  await Promise.all(
    prioritizedQueries.map(async (query) => {
      try {
        const response = await searchPairs(query, {
          limit: MAX_DEX_RESULTS,
          signal,
          timeoutMs: options?.timeoutMs ?? TOKEN_DEX_TIMEOUT_MS,
        });
        for (const pair of response.data ?? []) {
          if (pair.pairAddress && !seen.has(pair.pairAddress)) {
            seen.set(pair.pairAddress, pair);
          }
        }
        if (response.data?.length) {
          source = mergeDexSource(source, "dexscreener");
        }
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "unknown error";
        errors.push(`dexscreener.search(${query}): ${message}`);
      }
    }),
  );

  if (seen.size < MAX_DEX_RESULTS) {
    const networks = coin.networks
      .map((network) => DEXTOOLS_NETWORK_MAP[network.chain.toLowerCase()])
      .filter(Boolean);

    const uniqueNetworks = Array.from(new Set(networks)).slice(0, 2);

    for (const network of uniqueNetworks) {
      try {
        const response = await getTopPairs({
          network,
          limit: 25,
          signal,
          timeoutMs: options?.timeoutMs ?? TOKEN_DEX_TIMEOUT_MS,
        });
        for (const pair of response.data ?? []) {
          if (!pair.baseToken?.symbol) continue;
          if (
            pair.baseToken.symbol.toLowerCase() !== coin.symbol.toLowerCase()
          ) continue;
          const key = pair.pairAddress ?? pair.id;
          if (key && !seen.has(key)) {
            seen.set(key, pair);
          }
        }
        if ((response.data ?? []).length) {
          source = mergeDexSource(source, "dextools");
        }
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "unknown error";
        errors.push(`dextools.topPairs(${network}): ${message}`);
      }
    }
  }

  return {
    pairs: Array.from(seen.values()).slice(0, MAX_DEX_RESULTS),
    source,
  };
}

function buildTokenSnapshot(
  coin: CoinDetails,
): Omit<TokenAssetSnapshot, "dexPairs" | "dexPairsSource" | "news" | "peers"> {
  return {
    kind: "token",
    id: coin.id,
    slug: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    rank: coin.marketCapRank ?? null,
    genesisDate: coin.genesisDate ?? null,
    description: coin.description ?? null,
    categories: coin.categories,
    sentiment: {
      upPercent: coin.sentimentVotesUpPercentage ?? null,
      downPercent: coin.sentimentVotesDownPercentage ?? null,
    },
    imageUrl: coin.image?.large ?? coin.image?.small ?? coin.image?.thumb ??
      null,
    homepageUrls: coin.homepageUrls,
    blockchainSiteUrls: coin.blockchainSiteUrls,
    networks: coin.networks,
    marketData: {
      priceUsd: coin.marketData.currentPriceUsd ?? null,
      priceChangePercent24h: coin.marketData.priceChangePercentage24h ?? null,
      priceChangePercent7d: coin.marketData.priceChangePercentage7d ?? null,
      priceChangePercent30d: coin.marketData.priceChangePercentage30d ?? null,
      priceChangePercent1y: coin.marketData.priceChangePercentage1y ?? null,
      marketCapUsd: coin.marketData.marketCapUsd ?? null,
      fullyDilutedValuationUsd: coin.marketData.fullyDilutedValuationUsd ??
        null,
      totalVolumeUsd: coin.marketData.totalVolumeUsd ?? null,
      circulatingSupply: coin.marketData.circulatingSupply ?? null,
      totalSupply: coin.marketData.totalSupply ?? null,
      maxSupply: coin.marketData.maxSupply ?? null,
      high24hUsd: coin.marketData.high24hUsd ?? null,
      low24hUsd: coin.marketData.low24hUsd ?? null,
      athUsd: coin.marketData.athUsd ?? null,
      athDate: coin.marketData.athDate ?? null,
      atlUsd: coin.marketData.atlUsd ?? null,
      atlDate: coin.marketData.atlDate ?? null,
      lastUpdated: coin.marketData.lastUpdated ?? null,
    },
  };
}

function buildNftSnapshot(nft: NftCollectionDetails): NftAssetSnapshot {
  return {
    kind: "nft",
    id: nft.id,
    slug: nft.id,
    name: nft.name,
    symbol: nft.symbol,
    description: nft.description ?? null,
    homepageUrl: nft.homepageUrl ?? null,
    imageUrl: nft.imageUrl ?? null,
    blockchains: nft.blockchains,
    contractAddress: nft.contractAddress ?? null,
    floorPriceNative: nft.floorPriceNative ?? null,
    floorPriceUsd: nft.floorPriceUsd ?? null,
    volume24hUsd: nft.volume24hUsd ?? null,
    totalVolumeUsd: nft.totalVolumeUsd ?? null,
    marketCapUsd: nft.marketCapUsd ?? null,
    numberOfTokens: nft.numberOfTokens ?? null,
    ownersCount: nft.ownersCount ?? null,
    oneDaySales: nft.oneDaySales ?? null,
    oneDayAveragePriceUsd: nft.oneDayAveragePriceUsd ?? null,
    lastUpdated: nft.lastUpdated ?? null,
    chart: null,
    peers: [],
    news: [],
  } satisfies NftAssetSnapshot;
}

function normalizeMoralisDexToken(raw: UntypedJson): DexTokenSummary {
  const record = asRecord(raw);
  if (record) {
    return {
      address: toStringOrNull(
        record.address ?? record.mint ?? record.tokenAddress ??
          record.token_address,
      ) ?? null,
      symbol: toStringOrNull(record.symbol ?? record.token_symbol) ?? null,
      name: toStringOrNull(record.name ?? record.token_name) ?? null,
      logoUrl: toStringOrNull(
        record.logo ?? record.image ?? record.imageUrl ?? record.thumbnail,
      ) ?? null,
      priceUsd:
        toNumber(record.priceUsd ?? record.price_usd ?? record.usd_price) ??
          null,
      priceNative: toNumber(record.priceNative ?? record.price_native) ?? null,
    } satisfies DexTokenSummary;
  }

  const address = toStringOrNull(raw);
  return {
    address,
    symbol: null,
    name: null,
    logoUrl: null,
    priceUsd: null,
    priceNative: null,
  } satisfies DexTokenSummary;
}

function normalizeMoralisSolanaPairsToDexPairs(
  raw: UntypedJson,
): DexPairSummary[] {
  const record = asRecord(raw);
  const list = (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result)
      ? (record?.result as UntypedJson[])
      : null) ??
    (Array.isArray(record?.pairs) ? (record?.pairs as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  return list
    .map((entry, index) => {
      const r = asRecord(entry) ?? {};
      const pairAddress = toStringOrNull(
        r.pairAddress ?? r.address ?? r.pair_address ?? r.pair,
      ) ?? null;
      const dexName = toStringOrNull(
        r.dex ?? r.exchange ?? r.dexName ?? r.dex_name ?? r.dexId ?? r.dex_id,
      ) ?? null;
      const chainId = "solana";
      const network = "solana";

      const baseTokenRaw = (asRecord(r.baseToken) ? r.baseToken : null) ??
        (asRecord(r.base_token) ? r.base_token : null) ??
        (asRecord(r.token0) ? r.token0 : null) ??
        r.baseToken ??
        r.base_token ??
        r.baseMint ??
        r.base_mint ??
        r.token0 ??
        null;

      const quoteTokenRaw = (asRecord(r.quoteToken) ? r.quoteToken : null) ??
        (asRecord(r.quote_token) ? r.quote_token : null) ??
        (asRecord(r.token1) ? r.token1 : null) ??
        r.quoteToken ??
        r.quote_token ??
        r.quoteMint ??
        r.quote_mint ??
        r.token1 ??
        null;

      const baseToken = normalizeMoralisDexToken(baseTokenRaw);
      const quoteToken = normalizeMoralisDexToken(quoteTokenRaw);

      const id = pairAddress
        ? `${chainId}:${pairAddress}`
        : `${chainId}:${baseToken.address ?? baseToken.symbol ?? "base"}:${
          quoteToken.address ?? quoteToken.symbol ?? "quote"
        }:${index}`;
      const url = pairAddress
        ? `https://dexscreener.com/solana/${pairAddress}`
        : null;

      return {
        id,
        source: "moralis",
        chainId,
        network,
        dexId: dexName,
        dexName,
        pairAddress,
        url,
        baseToken,
        quoteToken,
        priceUsd: toNumber(
          r.priceUsd ?? r.price_usd ?? r.usdPrice ?? r.usd_price ?? r.price,
        ) ?? null,
        priceNative: toNumber(r.priceNative ?? r.price_native) ?? null,
        liquidityUsd:
          toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? null,
        volumeUsd24h: toNumber(
          r.volumeUsd24h ?? r.volume_24h_usd ?? r.volume_usd_24h ??
            r.volumeUsd,
        ) ?? null,
        pairCreatedAt: toStringOrNull(
          r.pairCreatedAt ?? r.createdAt ?? r.created_at ?? r.created,
        ) ?? null,
      } satisfies DexPairSummary;
    })
    .filter((pair) =>
      pair.pairAddress || pair.baseToken.address || pair.quoteToken.address
    )
    .slice(0, MAX_DEX_RESULTS);
}

function normalizeMoralisPumpfunMetadata(
  raw: UntypedJson,
  fallbackAddress: string,
) {
  const record = asRecord(raw);
  if (!record) {
    return {
      address: fallbackAddress,
      name: null,
      symbol: null,
      description: null,
      imageUrl: null,
      website: null,
      twitter: null,
      telegram: null,
    };
  }

  return {
    address: toStringOrNull(
      record.mint ?? record.address ?? record.tokenAddress ??
        record.token_address,
    ) ?? fallbackAddress,
    name: toStringOrNull(record.name ?? record.token_name) ?? null,
    symbol: toStringOrNull(record.symbol ?? record.token_symbol) ?? null,
    description: toStringOrNull(record.description) ?? null,
    imageUrl: toStringOrNull(record.image ?? record.imageUrl ?? record.logo) ??
      null,
    website: toStringOrNull(record.website) ?? null,
    twitter: toStringOrNull(record.twitter) ?? null,
    telegram: toStringOrNull(record.telegram) ?? null,
  };
}

function normalizeMoralisPumpfunPrice(
  raw: UntypedJson,
  fallbackAddress: string,
) {
  const record = asRecord(raw) ?? {};
  return {
    address: toStringOrNull(
      record.address ?? record.mint ?? record.tokenAddress ??
        record.token_address,
    ) ?? fallbackAddress,
    pairAddress: toStringOrNull(
      record.pairAddress ?? record.pair_address ?? record.pair,
    ) ?? null,
    exchange:
      toStringOrNull(record.exchange ?? record.exchangeName ?? record.dex) ??
        "pumpfun",
    priceUsd: toNumber(
      record.priceUsd ?? record.price_usd ?? record.usdPrice ??
        record.usd_price,
    ) ?? null,
    priceNative: toNumber(record.priceNative ?? record.price_native) ?? null,
    marketCapUsd: toNumber(
      record.marketCapUsd ?? record.market_cap_usd ?? record.market_cap,
    ) ?? null,
    liquidityUsd: toNumber(
      record.liquidityUsd ?? record.liquidity_usd ?? record.liquidity,
    ) ?? null,
    volume24hUsd: toNumber(
      record.volumeUsd24h ?? record.volume_24h_usd ?? record.volume_usd_24h,
    ) ?? null,
    updatedAt: toStringOrNull(
      record.updatedAt ?? record.updated_at ?? record.lastUpdated ??
        record.last_updated,
    ) ?? null,
  };
}

function normalizeMoralisSolanaTokenPrice(
  raw: UntypedJson,
  fallbackAddress: string,
) {
  const record = asRecord(raw) ?? {};
  return {
    address: toStringOrNull(
      record.address ?? record.mint ?? record.tokenAddress ??
        record.token_address,
    ) ?? fallbackAddress,
    name:
      toStringOrNull(record.name ?? record.tokenName ?? record.token_name) ??
        null,
    symbol: toStringOrNull(
      record.symbol ?? record.tokenSymbol ?? record.token_symbol,
    ) ?? null,
    priceUsd: toNumber(
      record.priceUsd ?? record.price_usd ?? record.usdPrice ??
        record.usd_price ?? record.usdPrice,
    ) ?? null,
    priceNative: toNumber(record.priceNative ?? record.price_native) ?? null,
    marketCapUsd: toNumber(
      record.marketCapUsd ?? record.market_cap_usd ?? record.market_cap,
    ) ?? null,
    liquidityUsd: toNumber(
      record.liquidityUsd ?? record.liquidity_usd ?? record.liquidity,
    ) ?? null,
    volume24hUsd: toNumber(
      record.volumeUsd24h ?? record.volume_24h_usd ?? record.volume_usd_24h,
    ) ?? null,
    updatedAt: toStringOrNull(
      record.updatedAt ?? record.updated_at ?? record.lastUpdated ??
        record.last_updated,
    ) ?? null,
  };
}

async function buildMoralisContractTokenSnapshot(
  contract: ParsedContractSlug,
  errors: string[],
  requestedSlug: string,
): Promise<TokenAssetSnapshot | null> {
  if (contract.kind === "evm") {
    const chainLabel = COINGECKO_PLATFORM_BY_EVM_CHAIN[contract.chain] ??
      contract.chain;
    let meta = null as
      | null
      | Awaited<ReturnType<typeof getEvmErc20Metadata>>[number];
    let price = null as
      | null
      | Awaited<ReturnType<typeof getEvmErc20TokenPrice>>;

    try {
      meta = (await getEvmErc20Metadata({
        chain: contract.chain,
        addresses: [contract.address],
      }))[0] ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(
        `moralis.erc20.metadata(${contract.chain}:${contract.address}): ${message}`,
      );
    }

    try {
      price = await getEvmErc20TokenPrice({
        chain: contract.chain,
        address: contract.address,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(
        `moralis.erc20.price(${contract.chain}:${contract.address}): ${message}`,
      );
    }

    const name = meta?.name ?? price?.tokenName ?? contract.address;
    const symbol = meta?.symbol ?? price?.tokenSymbol ?? "TOKEN";
    const imageUrl = pickEvmTokenLogo(meta) ?? (price?.tokenLogo ?? null);
    const priceUsd = price?.usdPrice ?? null;
    const priceChangePercent24h = toNumber(price?.["24hrPercentChange"]) ??
      null;

    const dexResult = await withSnapshotTimeout(
      "dexscreener.search(contract)",
      (signal) =>
        searchPairs(contract.address, {
          limit: MAX_DEX_RESULTS,
          signal,
          timeoutMs: TOKEN_DEX_TIMEOUT_MS,
        }),
      errors,
    );

    return {
      kind: "token",
      id: requestedSlug,
      slug: requestedSlug,
      name,
      symbol,
      rank: null,
      genesisDate: null,
      description: null,
      categories: [],
      sentiment: undefined,
      imageUrl,
      homepageUrls: [],
      blockchainSiteUrls: [],
      networks: [{ chain: chainLabel, contractAddress: contract.address }],
      marketData: {
        priceUsd,
        priceChangePercent24h,
        priceChangePercent7d: null,
        priceChangePercent30d: null,
        priceChangePercent1y: null,
        marketCapUsd: null,
        fullyDilutedValuationUsd: null,
        totalVolumeUsd: null,
        circulatingSupply: null,
        totalSupply: null,
        maxSupply: null,
        high24hUsd: null,
        low24hUsd: null,
        athUsd: null,
        athDate: null,
        atlUsd: null,
        atlDate: null,
        lastUpdated: nowIso(),
      },
      dexPairs: dexResult?.data ?? [],
      dexPairsSource: dexResult?.data?.length ? "dexscreener" : "none",
      news: [],
      peers: [],
    } satisfies TokenAssetSnapshot;
  }

  const network = normalizeSolanaNetwork("mainnet");
  const address = contract.address;

  const [pumpMeta, pumpPrice, solPrice, solPairs] = await Promise.all([
    getPumpfunTokenMetadata({ network, address }).catch((error) => {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`moralis.pumpfun.metadata(${address}): ${message}`);
      return null;
    }),
    getPumpfunTokenPrice({ network, address }).catch((error) => {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`moralis.pumpfun.price(${address}): ${message}`);
      return null;
    }),
    getSolanaTokenPrice({ network, address, currency: "usd" }).catch(
      (error) => {
        const message = error instanceof Error
          ? error.message
          : "unknown error";
        errors.push(`moralis.sol.price(${address}): ${message}`);
        return null;
      },
    ),
    getSolanaTokenPairsByAddress({ network, address }).catch((error) => {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`moralis.sol.pairs(${address}): ${message}`);
      return null;
    }),
  ]);

  const normalizedMeta = pumpMeta
    ? normalizeMoralisPumpfunMetadata(pumpMeta, address)
    : null;
  const normalizedPumpPrice = pumpPrice
    ? normalizeMoralisPumpfunPrice(pumpPrice, address)
    : null;
  const normalizedSolPrice = solPrice
    ? normalizeMoralisSolanaTokenPrice(solPrice, address)
    : null;

  const name = normalizedMeta?.name ??
    normalizedSolPrice?.name ??
    address;
  const symbol = normalizedMeta?.symbol ??
    normalizedSolPrice?.symbol ??
    "TOKEN";
  const description = normalizedMeta?.description ?? null;
  const imageUrl = normalizedMeta?.imageUrl ?? null;

  const priceUsd = normalizedPumpPrice?.priceUsd ??
    normalizedSolPrice?.priceUsd ?? null;
  const marketCapUsd = normalizedPumpPrice?.marketCapUsd ??
    normalizedSolPrice?.marketCapUsd ?? null;
  const totalVolumeUsd = normalizedPumpPrice?.volume24hUsd ??
    normalizedSolPrice?.volume24hUsd ?? null;

  const dexPairs = solPairs
    ? normalizeMoralisSolanaPairsToDexPairs(solPairs)
    : [];

  return {
    kind: "token",
    id: requestedSlug,
    slug: requestedSlug,
    name,
    symbol,
    rank: null,
    genesisDate: null,
    description,
    categories: [],
    sentiment: undefined,
    imageUrl,
    homepageUrls: [
      normalizedMeta?.website,
      normalizedMeta?.twitter,
      normalizedMeta?.telegram,
    ].filter(Boolean) as string[],
    blockchainSiteUrls: [],
    networks: [{ chain: "solana", contractAddress: address }],
    marketData: {
      priceUsd,
      priceChangePercent24h: null,
      priceChangePercent7d: null,
      priceChangePercent30d: null,
      priceChangePercent1y: null,
      marketCapUsd,
      fullyDilutedValuationUsd: null,
      totalVolumeUsd,
      circulatingSupply: null,
      totalSupply: null,
      maxSupply: null,
      high24hUsd: null,
      low24hUsd: null,
      athUsd: null,
      athDate: null,
      atlUsd: null,
      atlDate: null,
      lastUpdated: nowIso(),
    },
    dexPairs,
    dexPairsSource: dexPairs.length ? "moralis" : "none",
    news: [],
    peers: [],
  } satisfies TokenAssetSnapshot;
}

export async function getTokenAssetSnapshot(
  slug: string,
): Promise<AssetSnapshotResponse> {
  const errors: string[] = [];
  const requestedSlug = slug;

  const contract = parseContractSlug(slug);
  if (contract) {
    try {
      if (contract.kind === "solana") {
        const response = await getCoinDataByContract(
          contract.platform,
          contract.address,
        );
        if (response.data?.id) {
          slug = response.data.id;
        } else {
          try {
            const search = await searchCoins(contract.address);
            if (search.data && search.data.length > 0) {
              slug = search.data[0].id;
            } else {
              errors.push(
                `coingecko.contract(${contract.platform}:${contract.address}): not found in search`,
              );
              const fallback = await buildMoralisContractTokenSnapshot(
                contract,
                errors,
                requestedSlug,
              );
              return {
                data: fallback,
                fetchedAt: nowIso(),
                errors,
              } satisfies AssetSnapshotResponse;
            }
          } catch {
            errors.push(
              `coingecko.contract(${contract.platform}:${contract.address}): search error`,
            );
            const fallback = await buildMoralisContractTokenSnapshot(
              contract,
              errors,
              requestedSlug,
            );
            return {
              data: fallback,
              fetchedAt: nowIso(),
              errors,
            } satisfies AssetSnapshotResponse;
          }
        }
      } else if (contract.platform) {
        const response = await getCoinDataByContract(
          contract.platform,
          contract.address,
        );
        if (response.data?.id) {
          slug = response.data.id;
        } else {
          try {
            const search = await searchCoins(contract.address);
            if (search.data && search.data.length > 0) {
              slug = search.data[0].id;
            } else {
              errors.push(
                `coingecko.contract(${contract.platform}:${contract.address}): not found in search`,
              );
              const fallback = await buildMoralisContractTokenSnapshot(
                contract,
                errors,
                requestedSlug,
              );
              return {
                data: fallback,
                fetchedAt: nowIso(),
                errors,
              } satisfies AssetSnapshotResponse;
            }
          } catch {
            errors.push(
              `coingecko.contract(${contract.platform}:${contract.address}): search error`,
            );
            const fallback = await buildMoralisContractTokenSnapshot(
              contract,
              errors,
              requestedSlug,
            );
            return {
              data: fallback,
              fetchedAt: nowIso(),
              errors,
            } satisfies AssetSnapshotResponse;
          }
        }
      } else {
        errors.push(
          `coingecko.contract(evm:${contract.chain}:${contract.address}): unsupported chain mapping`,
        );
        const fallback = await buildMoralisContractTokenSnapshot(
          contract,
          errors,
          requestedSlug,
        );
        return {
          data: fallback,
          fetchedAt: nowIso(),
          errors,
        } satisfies AssetSnapshotResponse;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (contract.kind === "solana") {
        errors.push(
          `coingecko.contract(${contract.platform}:${contract.address}): ${message}`,
        );
      } else {
        errors.push(
          `coingecko.contract(${
            contract.platform ?? contract.chain
          }:${contract.address}): ${message}`,
        );
      }
      const fallback = await buildMoralisContractTokenSnapshot(
        contract,
        errors,
        requestedSlug,
      );
      return {
        data: fallback,
        fetchedAt: nowIso(),
        errors,
      } satisfies AssetSnapshotResponse;
    }
  }

  try {
    const coinResponse = await getCoinDetails(slug);
    const coin = coinResponse.data;

    const [messariMetrics, messariNews, defiStats, dexResult, peers] =
      await Promise.all([
        withSnapshotTimeout(
          "messari.metrics",
          (signal) => fetchMessariMetrics(coin, slug, errors, signal),
          errors,
        ),
        withSnapshotTimeout(
          "messari.reports",
          (signal) => fetchMessariReportsForCoin(coin, slug, errors, signal),
          errors,
        ),
        withSnapshotTimeout(
          "defillama.protocols",
          (signal) => fetchDefiStats(coin, errors, signal),
          errors,
        ),
        withSnapshotTimeout(
          "dex.pairs",
          (signal) =>
            fetchDexPairs(coin, errors, signal, {
              timeoutMs: TOKEN_DEX_TIMEOUT_MS,
            }),
          errors,
        ),
        withSnapshotTimeout(
          "coingecko.peers",
          (signal) =>
            fetchPeerAssets(coin, errors, signal, {
              timeoutMs: TOKEN_VENDOR_TIMEOUT_MS,
              maxCategories: TOKEN_MAX_PEER_CATEGORIES,
            }),
          errors,
        ),
      ]);

    const snapshot: TokenAssetSnapshot = {
      ...buildTokenSnapshot(coin),
      messariMetrics: messariMetrics ?? undefined,
      defiLlama: defiStats ?? undefined,
      dexPairs: dexResult?.pairs ?? [],
      dexPairsSource: dexResult?.source ?? "none",
      news: messariNews ?? [],
      peers: peers ?? [],
    };

    return {
      data: snapshot,
      fetchedAt: nowIso(),
      errors,
    } satisfies AssetSnapshotResponse;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to load token snapshot";
    if (requestedSlug !== slug) {
      errors.push(`requestedSlug=${requestedSlug}`);
    }
    errors.push(message);
    return {
      data: null,
      fetchedAt: nowIso(),
      errors,
    } satisfies AssetSnapshotResponse;
  }
}

export async function getNftAssetSnapshot(
  slug: string,
): Promise<AssetSnapshotResponse> {
  const errors: string[] = [];
  try {
    const [nftResponse, chartResponse] = await Promise.all([
      getNftDetails(slug),
      getNftMarketChart(slug, {
        vsCurrency: "usd",
        days: DEFAULT_NFT_CHART_DAYS,
      }).catch((error) => {
        const message = error instanceof Error
          ? error.message
          : "unknown error";
        errors.push(`coingecko.nftChart: ${message}`);
        return null;
      }),
    ]);
    const snapshot = buildNftSnapshot(nftResponse.data);

    if (chartResponse?.data) {
      snapshot.chart = {
        timeframeId: DEFAULT_NFT_CHART_TIMEFRAME,
        vsCurrency: "usd",
        data: chartResponse.data,
      };
    }

    return {
      data: snapshot,
      fetchedAt: nowIso(),
      errors,
    } satisfies AssetSnapshotResponse;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to load NFT snapshot";
    errors.push(message);
    return {
      data: null,
      fetchedAt: nowIso(),
      errors,
    } satisfies AssetSnapshotResponse;
  }
}

export async function getAssetSnapshot(kind: "token" | "nft", slug: string) {
  return kind === "nft"
    ? getNftAssetSnapshot(slug)
    : getTokenAssetSnapshot(slug);
}
