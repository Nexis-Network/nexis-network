import "server-only";

import { getCoinDetails, getCoinIdByContract, getCoinMarketChart, getCoinSnapshotsByIds, getTokenMarketChartByContract } from "@/server/market/coingecko";
import { resolveCoingeckoApiBase, resolveCoingeckoCredentials } from "@/server/market/coingecko-base";
import { moralisRequest } from "@/server/moralis/client";
import { computeQuantSentiment } from "@/server/market/sentiment";
import type {
  AssetChainFamily,
  AssetContractRef,
  AssetDetailQuery,
  AssetDetailRange,
  AssetDetailResponse,
  AssetExchangeRow,
  AssetLiveQuery,
  AssetLiveResponse,
  AssetLiquidityPairRow,
  NftDetailScaffoldResponse,
} from "@/types/extension/asset-detail";

const DETAIL_TTL_MS = 5 * 60 * 1000;
const LIVE_TTL_MS = 30 * 1000;
const NFT_DETAIL_TTL_MS = 5 * 60 * 1000;

const PUBLIC_BASE = "https://api.coingecko.com/api/v3";
const { proApiKey: COINGECKO_API_KEY, demoApiKey: COINGECKO_DEMO_API_KEY } = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const COINGECKO_BASE = resolveCoingeckoApiBase({
  apiKey: COINGECKO_API_KEY,
  envBase: process.env.COINGECKO_API_BASE,
});

const PLATFORM_BY_CHAIN: Record<string, string> = {
  "1": "ethereum",
  "10": "optimistic-ethereum",
  "25": "cronos",
  "56": "binance-smart-chain",
  "100": "xdai",
  "137": "polygon-pos",
  "250": "fantom",
  "1284": "moonbeam",
  "8453": "base",
  "42161": "arbitrum-one",
  "42220": "celo",
  "43114": "avalanche",
  "81457": "blast",
  solana: "solana",
};

const CHAIN_KEY_BY_PLATFORM: Record<string, string> = Object.entries(PLATFORM_BY_CHAIN).reduce(
  (acc, [chainKey, platform]) => {
    acc[platform] = chainKey;
    return acc;
  },
  {} as Record<string, string>,
);

const NATIVE_COINGECKO_BY_EVM_CHAIN: Record<string, string> = {
  "1": "ethereum",
  "10": "ethereum",
  "25": "crypto-com-chain",
  "56": "binancecoin",
  "100": "xdai",
  "137": "matic-network",
  "250": "fantom",
  "1284": "moonbeam",
  "8453": "ethereum",
  "42161": "ethereum",
  "42220": "celo",
  "43114": "avalanche-2",
  "81457": "ethereum",
};

const NATIVE_SYMBOL_BY_EVM_CHAIN: Record<string, string> = {
  "1": "eth",
  "10": "eth",
  "25": "cro",
  "56": "bnb",
  "100": "xdai",
  "137": "matic",
  "250": "ftm",
  "1284": "glmr",
  "8453": "eth",
  "42161": "eth",
  "42220": "celo",
  "43114": "avax",
  "81457": "eth",
};

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  eth: "ethereum",
  weth: "weth",
  sol: "solana",
  xlm: "stellar",
  usdc: "usd-coin",
  usdt: "tether",
  busd: "binance-usd",
  dai: "dai",
  bnb: "binancecoin",
  matic: "matic-network",
  avax: "avalanche-2",
  celo: "celo",
  cro: "crypto-com-chain",
  ftm: "fantom",
  glmr: "moonbeam",
  xdai: "xdai",
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
}

const cache = new SimpleCache();

function toFinite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeChainKey(chainId: string | number | undefined): string {
  const raw = String(chainId ?? "1").trim().toLowerCase();
  if (!raw) return "1";
  if (raw === "solana" || raw === "900001" || raw === "101") return "solana";
  if (raw === "stellar" || raw === "xlm") return "stellar";
  if (/^0x[0-9a-f]+$/i.test(raw)) {
    const asInt = Number.parseInt(raw, 16);
    return Number.isFinite(asInt) && asInt > 0 ? String(asInt) : "1";
  }
  if (/^\d+$/.test(raw)) return raw;
  return raw;
}

function inferFamily(chainKey: string): AssetChainFamily {
  if (chainKey === "solana") return "SOLANA";
  if (chainKey === "stellar") return "STELLAR";
  return "EVM";
}

function normalizeRange(range: string | null | undefined): AssetDetailRange {
  const value = String(range || "1d").trim().toLowerCase();
  if (value === "7d") return "7d";
  if (value === "30d") return "30d";
  return "1d";
}

function rangeToDays(range: AssetDetailRange): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 1;
}

function normalizeAssetAddress(value: string | null | undefined): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("native:") || trimmed.startsWith("default:")) return null;
  return trimmed;
}

function normalizeContractForLookup(address: string): string {
  const trimmed = String(address || "").trim();
  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}

function resolveNativeSymbolLower(chainKey: string, family: AssetChainFamily): string {
  if (family === "SOLANA") return "sol";
  if (family === "STELLAR") return "xlm";
  return NATIVE_SYMBOL_BY_EVM_CHAIN[chainKey] ?? "eth";
}

function resolveNativeCoingeckoId(chainKey: string, family: AssetChainFamily): string {
  if (family === "SOLANA") return "solana";
  if (family === "STELLAR") return "stellar";
  return NATIVE_COINGECKO_BY_EVM_CHAIN[chainKey] ?? "ethereum";
}

function resolveCoinGeckoTokenPlatform(chainKey: string, family: AssetChainFamily): string | null {
  if (family === "STELLAR") return null;
  if (family === "SOLANA") return "solana";
  return PLATFORM_BY_CHAIN[chainKey] ?? null;
}

function stripHtmlText(value: unknown): string | null {
  const text = asText(value).trim();
  if (!text) return null;
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped || null;
}

function humanizeChainName(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeChartRows(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!Array.isArray(row) || row.length < 2) return null;
      const ts = Number(row[0]);
      const val = Number(row[1]);
      if (!Number.isFinite(ts) || !Number.isFinite(val)) return null;
      return [ts, val] as [number, number];
    })
    .filter((row): row is [number, number] => Array.isArray(row));
}

function scoreTicker(row: Record<string, unknown>): number {
  const trust = String(row.trust_score || "").toLowerCase();
  const trustWeight = trust === "green" ? 3 : trust === "yellow" ? 2 : trust ? 1 : 0;
  const volumeUsd = toFinite((row.converted_volume as Record<string, unknown> | undefined)?.usd) ?? toFinite(row.volume) ?? 0;
  return trustWeight * 100 + Math.log10(Math.max(volumeUsd, 1));
}

function dedupeByKey<T>(rows: T[], keyFn: (value: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
}

function moralisChainParam(chainKey: string): string {
  if (/^0x[0-9a-f]+$/i.test(chainKey)) return chainKey;
  if (/^\d+$/.test(chainKey)) return `0x${Number(chainKey).toString(16)}`;
  return chainKey;
}

function hasMoralisApiKey(): boolean {
  return Boolean(String(process.env.MORALIS_API_KEY || "").trim());
}

function resolveCoinGeckoBaseAndHeaders(): { base: string; headers: Record<string, string> } {
  if (COINGECKO_API_KEY) {
    return {
      base: COINGECKO_BASE,
      headers: { "x-cg-pro-api-key": COINGECKO_API_KEY },
    };
  }

  if (COINGECKO_DEMO_API_KEY) {
    return {
      base: PUBLIC_BASE,
      headers: { "x-cg-demo-api-key": COINGECKO_DEMO_API_KEY },
    };
  }

  return { base: COINGECKO_BASE, headers: {} };
}

async function fetchCoinGeckoJson(path: string, query?: Record<string, string | number | boolean>): Promise<unknown> {
  const { base, headers } = resolveCoinGeckoBaseAndHeaders();
  const url = new URL(path.startsWith("/") ? `${base}${path}` : `${base}/${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("coingecko timeout")), 12_000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        ...headers,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && (payload as Record<string, unknown>).error) ||
        response.statusText ||
        "CoinGecko request failed";
      throw new Error(`CoinGecko ${response.status}: ${String(message)}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchMoralisTokenMetadata(chainKey: string, address: string): Promise<Record<string, unknown> | null> {
  const payload = await moralisRequest<unknown>({
    api: "evm",
    path: "/erc20/metadata",
    query: {
      chain: moralisChainParam(chainKey),
      "addresses[0]": address,
    },
    cache: {
      ttlSeconds: 300,
      namespace: "extension-market",
      tags: [`chain:${chainKey}`, `token:${address.toLowerCase()}`, "erc20-metadata"],
    },
  });

  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).result)
      ? ((payload as Record<string, unknown>).result as unknown[])
      : [];

  const row = rows[0];
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

async function fetchMoralisTokenAnalytics(chainKey: string, address: string): Promise<Record<string, unknown> | null> {
  const payload = await moralisRequest<unknown>({
    api: "evm",
    path: `/erc20/${encodeURIComponent(address)}/analytics`,
    query: { chain: moralisChainParam(chainKey) },
    cache: {
      ttlSeconds: 45,
      namespace: "extension-market",
      tags: [`chain:${chainKey}`, `token:${address.toLowerCase()}`, "erc20-analytics"],
    },
  });

  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

async function fetchMoralisTokenScore(chainKey: string, address: string): Promise<Record<string, unknown> | null> {
  const payload = await moralisRequest<unknown>({
    api: "evm",
    path: `/erc20/${encodeURIComponent(address)}/score`,
    query: { chain: moralisChainParam(chainKey) },
    cache: {
      ttlSeconds: 120,
      namespace: "extension-market",
      tags: [`chain:${chainKey}`, `token:${address.toLowerCase()}`, "erc20-score"],
    },
  });

  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

async function fetchMoralisTokenPairs(chainKey: string, address: string, limit = 25): Promise<Record<string, unknown>[]> {
  const payload = await moralisRequest<unknown>({
    api: "evm",
    path: `/erc20/${encodeURIComponent(address)}/pairs`,
    query: {
      chain: moralisChainParam(chainKey),
      limit: Math.max(1, Math.min(100, Math.floor(limit))),
    },
    cache: {
      ttlSeconds: 45,
      namespace: "extension-market",
      tags: [`chain:${chainKey}`, `token:${address.toLowerCase()}`, "erc20-pairs"],
    },
  });

  const rows =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).result)
        ? ((payload as Record<string, unknown>).result as unknown[])
        : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).pairs)
          ? ((payload as Record<string, unknown>).pairs as unknown[])
          : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
            ? ((payload as Record<string, unknown>).data as unknown[])
            : [];

  return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
}

function normalizeContractsFromCoinData(
  chainKey: string,
  inputAddress: string | null,
  networks: Array<{ chain?: string; contractAddress?: string | null }> | undefined,
  platformNameById: Map<string, string>,
): AssetContractRef[] {
  const contracts: AssetContractRef[] = [];
  const normalizedInput = inputAddress ? normalizeContractForLookup(inputAddress) : null;

  (networks ?? []).forEach((network) => {
    const chain = String(network.chain || "").trim().toLowerCase();
    const address = String(network.contractAddress || "").trim();
    if (!chain || !address) return;

    const resolvedChainKey = CHAIN_KEY_BY_PLATFORM[chain] ?? chain;
    const chainName = platformNameById.get(chain) ?? humanizeChainName(chain);
    const isPrimary = normalizedInput ? normalizeContractForLookup(address) === normalizedInput : false;

    contracts.push({
      chainKey: resolvedChainKey,
      chainName,
      address,
      isPrimary,
    });
  });

  if (inputAddress && !contracts.some((row) => normalizeContractForLookup(row.address) === normalizedInput)) {
    contracts.unshift({
      chainKey,
      chainName: humanizeChainName(chainKey),
      address: inputAddress,
      isPrimary: true,
    });
  }

  return dedupeByKey(contracts, (row) => `${row.chainKey}:${normalizeContractForLookup(row.address)}`).sort(
    (lhs, rhs) => Number(rhs.isPrimary) - Number(lhs.isPrimary),
  );
}

async function resolveAssetIdentity(args: {
  chainKey: string;
  family: AssetChainFamily;
  address: string | null;
  symbolLower: string;
}): Promise<{ coinGeckoId: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const tokenPlatform = resolveCoinGeckoTokenPlatform(args.chainKey, args.family);
  const nativeSymbolLower = resolveNativeSymbolLower(args.chainKey, args.family);
  const isNativeRequest = !args.address && (!args.symbolLower || args.symbolLower === nativeSymbolLower);

  let coinGeckoId: string | null = null;

  if (args.address && tokenPlatform) {
    try {
      const lookup = await getCoinIdByContract(tokenPlatform, normalizeContractForLookup(args.address));
      coinGeckoId = lookup.data ?? null;
    } catch {
      warnings.push("coingecko_contract_lookup_unavailable");
    }
  }

  if (!coinGeckoId && args.symbolLower) {
    coinGeckoId = SYMBOL_TO_COINGECKO_ID[args.symbolLower] ?? null;
  }

  if (!coinGeckoId && isNativeRequest) {
    coinGeckoId = resolveNativeCoingeckoId(args.chainKey, args.family);
  }

  return { coinGeckoId, warnings };
}

function buildDetailCacheKey(chainKey: string, address: string | null, symbol: string, range: AssetDetailRange): string {
  return `asset-detail:${range}:${chainKey}:${address ?? (symbol || "native")}`;
}

function buildLiveCacheKey(chainKey: string, address: string | null, symbol: string): string {
  return `asset-live:${chainKey}:${address ?? (symbol || "native")}`;
}

export async function getExtensionAssetDetail(query: AssetDetailQuery): Promise<AssetDetailResponse> {
  const chainId = String(query.chainId || "1").trim();
  const chainKey = normalizeChainKey(chainId);
  const family = inferFamily(chainKey);
  const range = normalizeRange(query.range);
  const address = normalizeAssetAddress(query.address);
  const normalizedAddress = address ? normalizeContractForLookup(address) : null;
  const symbol = String(query.symbol || "").trim().toUpperCase();
  const symbolLower = symbol.toLowerCase();

  const cacheKey = buildDetailCacheKey(chainKey, normalizedAddress, symbolLower, range);
  const cached = cache.get<AssetDetailResponse>(cacheKey);
  if (cached) {
    return {
      ...cached,
      cache: {
        ...cached.cache,
        hit: true,
        ttlSec: DETAIL_TTL_MS / 1000,
      },
    };
  }

  const warnings: string[] = [];
  const days = rangeToDays(range);

  if (!normalizedAddress && !symbolLower) {
    warnings.push("address_or_symbol_required");
  }

  const identity = await resolveAssetIdentity({ chainKey, family, address: normalizedAddress, symbolLower });
  warnings.push(...identity.warnings);

  let coinData: Record<string, unknown> | null = null;
  let coinGeckoAvailable = false;
  if (identity.coinGeckoId) {
    try {
      const details = await getCoinDetails(identity.coinGeckoId);
      coinData = (details.data ?? null) as Record<string, unknown> | null;
      coinGeckoAvailable = Boolean(coinData);
    } catch {
      warnings.push("coingecko_coin_lookup_unavailable");
    }
  }

  const tokenPlatform = resolveCoinGeckoTokenPlatform(chainKey, family);

  let chartPayload: Record<string, unknown> | null = null;
  if (normalizedAddress && tokenPlatform) {
    try {
      const chart = await getTokenMarketChartByContract({
        platform: tokenPlatform,
        contractAddress: normalizedAddress,
        vsCurrency: "usd",
        days,
      });
      chartPayload = (chart.data ?? null) as Record<string, unknown> | null;
      coinGeckoAvailable = coinGeckoAvailable || Boolean(chartPayload);
    } catch {
      warnings.push("coingecko_contract_chart_unavailable");
    }
  }

  if (!chartPayload && identity.coinGeckoId) {
    try {
      const chart = await getCoinMarketChart(identity.coinGeckoId, {
        vsCurrency: "usd",
        days,
        interval: range === "1d" ? "hourly" : "daily",
      });
      chartPayload = (chart.data ?? null) as Record<string, unknown> | null;
      coinGeckoAvailable = coinGeckoAvailable || Boolean(chartPayload);
    } catch {
      warnings.push("coingecko_id_chart_unavailable");
    }
  }

  const prices = normalizeChartRows(chartPayload?.prices);
  const totalVolumes = normalizeChartRows(chartPayload?.totalVolumes ?? chartPayload?.total_volumes);

  let coinGeckoTickers: Record<string, unknown>[] = [];
  if (identity.coinGeckoId) {
    try {
      const tickersRaw = await fetchCoinGeckoJson(`/coins/${encodeURIComponent(identity.coinGeckoId)}/tickers`, {
        page: 1,
        per_page: 100,
        include_exchange_logo: false,
      });

      const rows =
        tickersRaw && typeof tickersRaw === "object" && Array.isArray((tickersRaw as Record<string, unknown>).tickers)
          ? ((tickersRaw as Record<string, unknown>).tickers as unknown[])
          : [];

      coinGeckoTickers = rows
        .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
        .sort((lhs, rhs) => scoreTicker(rhs) - scoreTicker(lhs));

      coinGeckoAvailable = coinGeckoAvailable || coinGeckoTickers.length > 0;
    } catch {
      warnings.push("coingecko_tickers_unavailable");
    }
  }

  const exchangesFromCoinGecko: AssetExchangeRow[] = coinGeckoTickers.map((ticker) => ({
    name:
      asText((ticker.market as Record<string, unknown> | undefined)?.name) ||
      asText((ticker.market as Record<string, unknown> | undefined)?.identifier) ||
      "Unknown",
    pair: `${asText(ticker.base).toUpperCase()}/${asText(ticker.target).toUpperCase()}`,
    marketType: asText(ticker.trade_url) ? "spot" : null,
    trustScore: asText(ticker.trust_score) || null,
    volumeUsd: toFinite((ticker.converted_volume as Record<string, unknown> | undefined)?.usd),
    priceUsd: toFinite((ticker.converted_last as Record<string, unknown> | undefined)?.usd),
    source: "coingecko",
  }));

  const liquidityPairsFromCoinGecko: AssetLiquidityPairRow[] = coinGeckoTickers.map((ticker) => {
    const costToMoveUp = toFinite(ticker.cost_to_move_up_usd);
    const costToMoveDown = toFinite(ticker.cost_to_move_down_usd);

    return {
      pairLabel: `${asText(ticker.base).toUpperCase()}/${asText(ticker.target).toUpperCase()}`,
      pairAddress: asText((ticker as Record<string, unknown>).pair_address) || null,
      dexName:
        asText((ticker.market as Record<string, unknown> | undefined)?.name) ||
        asText((ticker.market as Record<string, unknown> | undefined)?.identifier) ||
        null,
      liquidityUsd:
        costToMoveUp !== null && costToMoveDown !== null
          ? (costToMoveUp + costToMoveDown) / 2
          : (costToMoveUp ?? costToMoveDown ?? null),
      volume24hUsd: toFinite((ticker.converted_volume as Record<string, unknown> | undefined)?.usd),
      chainKey,
      source: "coingecko",
    };
  });

  let moralisAvailable = false;
  let moralisMetadata: Record<string, unknown> | null = null;
  let moralisPairsRows: Record<string, unknown>[] = [];

  if (family === "EVM" && normalizedAddress) {
    if (!hasMoralisApiKey()) {
      warnings.push("moralis_key_not_configured");
    } else {
      try {
        moralisMetadata = await fetchMoralisTokenMetadata(chainKey, normalizedAddress);
        moralisAvailable = moralisAvailable || Boolean(moralisMetadata);
      } catch {
        warnings.push("moralis_metadata_unavailable");
      }

      try {
        await fetchMoralisTokenAnalytics(chainKey, normalizedAddress);
        moralisAvailable = true;
      } catch {
        warnings.push("moralis_analytics_unavailable");
      }

      try {
        await fetchMoralisTokenScore(chainKey, normalizedAddress);
        moralisAvailable = true;
      } catch {
        warnings.push("moralis_score_unavailable");
      }

      try {
        moralisPairsRows = await fetchMoralisTokenPairs(chainKey, normalizedAddress, 50);
        moralisAvailable = moralisAvailable || moralisPairsRows.length > 0;
      } catch {
        warnings.push("moralis_pairs_unavailable");
      }
    }
  } else {
    warnings.push("moralis_evm_only_in_v1");
  }

  const exchangesFromMoralis: AssetExchangeRow[] = moralisPairsRows.map((row) => ({
    name:
      asText(row.exchange_name) ||
      asText(row.exchangeName) ||
      asText(row.dex_name) ||
      asText(row.exchange) ||
      "Unknown DEX",
    pair: asText(row.pair_label) || asText(row.pairLabel) || null,
    marketType: "dex",
    trustScore: null,
    volumeUsd: toFinite(row.volume_24h_usd) ?? toFinite(row.volume24hUsd) ?? toFinite((row.volume as Record<string, unknown> | undefined)?.h24),
    priceUsd: toFinite(row.usd_price) ?? toFinite(row.priceUsd),
    source: "moralis",
  }));

  const liquidityPairsFromMoralis: AssetLiquidityPairRow[] = moralisPairsRows.map((row) => ({
    pairLabel: asText(row.pair_label) || asText(row.pairLabel) || asText(row.pair_name) || asText(row.name) || "Pair",
    pairAddress: asText(row.pair_address) || asText(row.pairAddress) || asText(row.address) || null,
    dexName: asText(row.exchange_name) || asText(row.exchangeName) || asText(row.dex_name) || asText(row.exchange) || null,
    liquidityUsd:
      toFinite(row.liquidity_usd) ??
      toFinite(row.liquidityUsd) ??
      toFinite((row.liquidity as Record<string, unknown> | undefined)?.usd) ??
      toFinite(row.liquidity),
    volume24hUsd: toFinite(row.volume_24h_usd) ?? toFinite(row.volume24hUsd) ?? toFinite((row.volume as Record<string, unknown> | undefined)?.h24),
    chainKey,
    source: "moralis",
  }));

  const exchanges = dedupeByKey(
    [...exchangesFromCoinGecko, ...exchangesFromMoralis].sort((lhs, rhs) => (toFinite(rhs.volumeUsd) ?? 0) - (toFinite(lhs.volumeUsd) ?? 0)),
    (row) => `${row.source}:${String(row.name || "").toLowerCase()}:${String(row.pair || "").toLowerCase()}`,
  ).slice(0, 10);

  const liquidityPairs = dedupeByKey(
    [...liquidityPairsFromCoinGecko, ...liquidityPairsFromMoralis].sort((lhs, rhs) => {
      const rhsScore = (toFinite(rhs.liquidityUsd) ?? 0) + (toFinite(rhs.volume24hUsd) ?? 0);
      const lhsScore = (toFinite(lhs.liquidityUsd) ?? 0) + (toFinite(lhs.volume24hUsd) ?? 0);
      return rhsScore - lhsScore;
    }),
    (row) => `${row.source}:${String(row.pairAddress || row.pairLabel || "").toLowerCase()}:${String(row.dexName || "").toLowerCase()}`,
  ).slice(0, 10);

  const platformNameById = new Map<string, string>();
  if ((coinData?.networks as unknown[] | undefined)?.length) {
    try {
      const platformRowsRaw = await fetchCoinGeckoJson("/asset_platforms");
      const rows = Array.isArray(platformRowsRaw) ? platformRowsRaw : [];
      rows.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const platform = row as Record<string, unknown>;
        const id = asText(platform.id).trim();
        const name = asText(platform.name).trim();
        if (id && name) platformNameById.set(id, name);
      });
    } catch {
      warnings.push("coingecko_asset_platforms_unavailable");
    }
  }

  const contracts = normalizeContractsFromCoinData(
    chainKey,
    address,
    (coinData?.networks as Array<{ chain?: string; contractAddress?: string | null }> | undefined) ?? [],
    platformNameById,
  );

  const marketData = coinData?.marketData && typeof coinData.marketData === "object" ? (coinData.marketData as Record<string, unknown>) : null;

  const description =
    stripHtmlText(coinData?.description) ??
    stripHtmlText(moralisMetadata?.description) ??
    null;

  const logoUrl =
    asText((coinData?.image as Record<string, unknown> | undefined)?.large) ||
    asText((coinData?.image as Record<string, unknown> | undefined)?.small) ||
    asText(moralisMetadata?.logo) ||
    asText(moralisMetadata?.thumbnail) ||
    null;

  const assetName = asText(coinData?.name) || asText(moralisMetadata?.name) || null;
  const assetSymbol = (asText(coinData?.symbol) || asText(moralisMetadata?.symbol) || symbol).trim().toUpperCase() || null;

  const maxSupply = toFinite(marketData?.maxSupply) ?? toFinite(moralisMetadata?.max_supply) ?? toFinite(moralisMetadata?.maxSupply);
  const totalSupply = toFinite(marketData?.totalSupply) ?? toFinite(moralisMetadata?.total_supply) ?? toFinite(moralisMetadata?.totalSupply);

  const circulatingSupply = toFinite(marketData?.circulatingSupply);
  const marketCapUsd = toFinite(marketData?.marketCapUsd);
  const volume24hUsd = toFinite(marketData?.totalVolumeUsd);
  const athUsd = toFinite(marketData?.athUsd);
  const athDate = asText(marketData?.athDate) || null;
  const atlUsd = toFinite(marketData?.atlUsd);
  const atlDate = asText(marketData?.atlDate) || null;

  const metadataComplete = Boolean(assetName && assetSymbol && (description || marketCapUsd !== null));
  const chartsAvailable = prices.length > 1 && totalVolumes.length > 1;
  const pairsAvailable = exchanges.length > 0 || liquidityPairs.length > 0;

  if (!assetName || !assetSymbol) warnings.push("asset_identity_partial");
  if (!chartsAvailable) warnings.push("chart_data_partial");
  if (!pairsAvailable) warnings.push("pair_data_partial");
  if (!coinGeckoAvailable) warnings.push("coingecko_unavailable");

  const response: AssetDetailResponse = {
    query: {
      chainId,
      chainKey,
      family,
      ...(address ? { address } : {}),
      ...(symbol ? { symbol } : {}),
      range,
    },
    asset: {
      coingeckoId: identity.coinGeckoId,
      logoUrl,
      name: assetName,
      symbol: assetSymbol,
      description,
      maxSupply,
      totalSupply,
      circulatingSupply,
      marketCapUsd,
      volume24hUsd,
      athUsd,
      athDate,
      atlUsd,
      atlDate,
      contracts,
    },
    charts: {
      range,
      prices,
      totalVolumes,
    },
    exchanges,
    liquidityPairs,
    availability: {
      coinGecko: coinGeckoAvailable,
      moralis: moralisAvailable,
      metadataComplete,
      chartsAvailable,
      pairsAvailable,
    },
    warnings: uniqueStrings(warnings),
    cache: {
      hit: false,
      ttlSec: DETAIL_TTL_MS / 1000,
      generatedAt: new Date().toISOString(),
    },
  };

  cache.set(cacheKey, response, DETAIL_TTL_MS);
  return response;
}

export async function getExtensionAssetLive(query: AssetLiveQuery): Promise<AssetLiveResponse> {
  const chainId = String(query.chainId || "1").trim();
  const chainKey = normalizeChainKey(chainId);
  const family = inferFamily(chainKey);
  const address = normalizeAssetAddress(query.address);
  const normalizedAddress = address ? normalizeContractForLookup(address) : null;
  const symbol = String(query.symbol || "").trim().toUpperCase();
  const symbolLower = symbol.toLowerCase();

  const cacheKey = buildLiveCacheKey(chainKey, normalizedAddress, symbolLower);
  const cached = cache.get<AssetLiveResponse>(cacheKey);
  if (cached) {
    return {
      ...cached,
      cache: {
        ...cached.cache,
        hit: true,
        ttlSec: LIVE_TTL_MS / 1000,
      },
    };
  }

  const warnings: string[] = [];

  const identity = await resolveAssetIdentity({ chainKey, family, address: normalizedAddress, symbolLower });
  warnings.push(...identity.warnings);

  let priceUsd: number | null = null;
  let change24hPct: number | null = null;
  let marketCapUsd: number | null = null;
  let volume24hUsd: number | null = null;

  if (identity.coinGeckoId) {
    try {
      const snapshots = await getCoinSnapshotsByIds([identity.coinGeckoId], {
        vsCurrency: "usd",
        priceChangePercentage: "24h",
      });
      const row = snapshots[0] ?? null;
      if (row) {
        priceUsd = toFinite(row.currentPrice ?? row.priceUsd);
        change24hPct = toFinite(row.priceChangePercentage24h);
        marketCapUsd = toFinite(row.marketCap ?? row.marketCapUsd);
        volume24hUsd = toFinite(row.volume24hUsd ?? row.totalVolume);
      }
    } catch {
      warnings.push("coingecko_snapshot_unavailable");
    }
  }

  const tokenPlatform = resolveCoinGeckoTokenPlatform(chainKey, family);
  if (priceUsd === null && normalizedAddress && tokenPlatform && family !== "STELLAR") {
    try {
      const rows = await fetchCoinGeckoJson(`/simple/token_price/${encodeURIComponent(tokenPlatform)}`, {
        contract_addresses: normalizedAddress,
        vs_currencies: "usd",
        include_24hr_change: true,
      });
      const record = rows && typeof rows === "object" ? (rows as Record<string, Record<string, unknown>>)[normalizedAddress] : null;
      priceUsd = toFinite(record?.usd);
      change24hPct = toFinite(record?.usd_24h_change) ?? change24hPct;
    } catch {
      warnings.push("coingecko_simple_token_price_unavailable");
    }
  }

  let liquidityUsd: number | null = null;
  let holdersChange24hPct: number | null = null;
  let volumeChange24hPct: number | null = null;
  let moralisTokenScore: number | null = null;

  if (family === "EVM" && normalizedAddress) {
    if (!hasMoralisApiKey()) {
      warnings.push("moralis_key_not_configured");
    } else {
      try {
        const analytics = await fetchMoralisTokenAnalytics(chainKey, normalizedAddress);
        holdersChange24hPct =
          toFinite(analytics?.holdersChange24hPct) ??
          toFinite(analytics?.holder_change_24h) ??
          toFinite(analytics?.holders_change_percentage_24h);

        volumeChange24hPct =
          toFinite(analytics?.volumeChange24hPct) ??
          toFinite(analytics?.volume_change_24h_pct) ??
          toFinite(analytics?.volume_change_percentage_24h);

        volume24hUsd =
          toFinite(analytics?.volume24hUsd) ??
          toFinite(analytics?.volume_24h_usd) ??
          volume24hUsd;
      } catch {
        warnings.push("moralis_analytics_unavailable");
      }

      try {
        const score = await fetchMoralisTokenScore(chainKey, normalizedAddress);
        moralisTokenScore = toFinite(score?.score) ?? toFinite(score?.tokenScore) ?? toFinite(score?.final_score);
      } catch {
        warnings.push("moralis_score_unavailable");
      }

      try {
        const pairRows = await fetchMoralisTokenPairs(chainKey, normalizedAddress, 25);
        const topPair = pairRows[0] ?? null;

        liquidityUsd =
          toFinite(topPair?.liquidity_usd) ??
          toFinite(topPair?.liquidityUsd) ??
          toFinite((topPair?.liquidity as Record<string, unknown> | undefined)?.usd) ??
          toFinite(topPair?.liquidity);

        volume24hUsd =
          toFinite(topPair?.volume_24h_usd) ??
          toFinite(topPair?.volume24hUsd) ??
          toFinite((topPair?.volume as Record<string, unknown> | undefined)?.h24) ??
          volume24hUsd;
      } catch {
        warnings.push("moralis_pairs_unavailable");
      }
    }
  } else {
    warnings.push("moralis_evm_only_in_v1");
  }

  const sentiment = computeQuantSentiment({
    priceChange24hPct: change24hPct,
    volumeChange24hPct,
    volume24hUsd,
    marketCapUsd,
    liquidityUsd,
    holdersChange24hPct,
    moralisTokenScore,
    volatility24hPct: Math.abs(change24hPct ?? 0),
  });

  if (priceUsd === null) warnings.push("live_price_unavailable");
  if (marketCapUsd === null) warnings.push("live_market_cap_unavailable");
  if (volume24hUsd === null) warnings.push("live_volume_unavailable");

  const response: AssetLiveResponse = {
    priceUsd,
    change24hPct,
    marketCapUsd,
    volume24hUsd,
    sentiment,
    warnings: uniqueStrings(warnings),
    cache: {
      hit: false,
      ttlSec: LIVE_TTL_MS / 1000,
      generatedAt: new Date().toISOString(),
    },
  };

  cache.set(cacheKey, response, LIVE_TTL_MS);
  return response;
}

export function getExtensionNftDetailScaffold(query: {
  chainId: string | number;
  contractAddress?: string;
  tokenId?: string;
}): NftDetailScaffoldResponse {
  const chainId = String(query.chainId || "1").trim();
  const contractAddress = normalizeAssetAddress(query.contractAddress) ?? null;
  const tokenId = asText(query.tokenId).trim() || null;

  const warnings = [
    "not_enabled",
    "nft_detail_scaffold_only_v1",
    "use_token_asset_detail_for_current_ui",
  ];

  if (!hasMoralisApiKey()) {
    warnings.push("moralis_key_not_configured");
  }

  return {
    enabled: false,
    query: {
      chainId,
      contractAddress,
      tokenId,
    },
    metadata: null,
    contractMetadata: null,
    floorPrice: null,
    trades: [],
    warnings,
    cache: {
      hit: false,
      ttlSec: NFT_DETAIL_TTL_MS / 1000,
      generatedAt: new Date().toISOString(),
    },
  };
}
