import { connection, NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-platform";

import { getNftDetails, searchAssets, getCoingeckoMarkets } from "@/server/market/coingecko";
import { getEvmErc20Metadata, getEvmErc20TokenPrice, pickEvmTokenLogo } from "@/server/moralis/evm/token";
import { getPumpfunTokenMetadata, getPumpfunTokenPrice } from "@/server/moralis/solana/pumpfun";
import { getSolanaTokenPrice } from "@/server/moralis/solana/price";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmAddress, normalizeEvmChain, normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import type { CompareAssetSearchItem } from "@/types/token-page";


import { logger } from '@/lib/logger';

const MAX_RESULTS = 10;
const MAX_COIN_RESULTS = 6;
const MAX_NFT_RESULTS = 4;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function computeAbsoluteChange(price: number | null | undefined, percent: number | null | undefined) {
  if (!Number.isFinite(price ?? null) || !Number.isFinite(percent ?? null)) {
    return null;
  }
  const resolvedPrice = Number(price);
  const resolvedPercent = Number(percent);
  return resolvedPrice * (resolvedPercent / 100);
}

const CHAIN_SYMBOL_MAP: Record<string, string> = {
  ethereum: "ETH",
  eth: "ETH",
  solana: "SOL",
  polygon: "MATIC",
  "binance-smart-chain": "BNB",
  bsc: "BNB",
  arbitrum: "ARB",
  optimism: "OP",
  base: "BASE",
  avalanche: "AVAX",
  avax: "AVAX",
  fantom: "FTM",
  linea: "LINEA",
};

function resolveNativeSymbol(blockchains: string[] | undefined): string | null {
  if (!blockchains?.length) {
    return null;
  }
  for (const chain of blockchains) {
    const normalized = chain.trim().toLowerCase();
    if (!normalized) continue;
    if (CHAIN_SYMBOL_MAP[normalized]) {
      return CHAIN_SYMBOL_MAP[normalized];
    }
    if (normalized.length <= 5) {
      return normalized.toUpperCase();
    }
  }
  return blockchains[0]?.slice(0, 5).toUpperCase() ?? null;
}

type AddressQuery =
  | { kind: "evm"; chain: string | null; address: string }
  | { kind: "solana"; address: string };

function parseAddressQuery(query: string): AddressQuery | null {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return null;

  if (lower.startsWith("evm-")) {
    const parts = trimmed.split("-");
    if (parts.length < 3) return null;
    try {
      const chain = normalizeEvmChain(parts[1] ?? "0x1");
      const address = normalizeEvmAddress(parts.slice(2).join("-"));
      return { kind: "evm", chain, address };
    } catch {
      return null;
    }
  }

  if (lower.startsWith("solana-")) {
    const mint = trimmed.slice("solana-".length);
    if (!mint) return null;
    try {
      return { kind: "solana", address: normalizeSolanaAddress(mint) };
    } catch {
      return null;
    }
  }

  if (/^0x[0-9a-f]{40}$/i.test(trimmed)) {
    try {
      return { kind: "evm", chain: null, address: normalizeEvmAddress(trimmed) };
    } catch {
      return null;
    }
  }

  try {
    return { kind: "solana", address: normalizeSolanaAddress(trimmed) };
  } catch {
    return null;
  }
}

async function resolveEvmTokenItem(params: { chain: string; address: string }): Promise<CompareAssetSearchItem | null> {
  const [meta] = await getEvmErc20Metadata({ chain: params.chain, addresses: [params.address] }).catch(() => []);
  if (!meta) return null;

  const price = await getEvmErc20TokenPrice({ chain: params.chain, address: params.address }).catch(() => null);
  const priceUsd = price?.usdPrice ?? null;
  const priceChangePercent24h = toNumber((price as { "24hrPercentChange"?: UntypedJson })?.["24hrPercentChange"]) ?? null;
  const priceChangeUsd24h = computeAbsoluteChange(priceUsd, priceChangePercent24h);

  const slug = `evm-${params.chain.toLowerCase()}-${params.address}`;

  return {
    id: slug,
    slug,
    name: meta.name ?? params.address,
    symbol: meta.symbol ?? "TOKEN",
    assetType: "token",
    logoUrl: pickEvmTokenLogo(meta) ?? null,
    marketCapRank: null,
    priceUsd,
    priceNative: null,
    nativeSymbol: null,
    priceChangeUsd24h,
    priceChangePercent24h,
  } satisfies CompareAssetSearchItem;
}

async function resolveSolanaTokenItem(params: { address: string }): Promise<CompareAssetSearchItem | null> {
  const network = normalizeSolanaNetwork("mainnet");
  const address = params.address;

  const [metaRaw, pumpPriceRaw, solPriceRaw] = await Promise.all([
    getPumpfunTokenMetadata({ network, address }).catch(() => null),
    getPumpfunTokenPrice({ network, address }).catch(() => null),
    getSolanaTokenPrice({ network, address, currency: "usd" }).catch(() => null),
  ]);

  const meta = metaRaw ? asRecord(metaRaw) : null;
  const pumpPrice = pumpPriceRaw ? asRecord(pumpPriceRaw) : null;
  const solPrice = solPriceRaw ? asRecord(solPriceRaw) : null;

  const name = toStringOrNull(meta?.name ?? meta?.token_name) ?? toStringOrNull(solPrice?.name ?? solPrice?.tokenName) ?? address;
  const symbol = toStringOrNull(meta?.symbol ?? meta?.token_symbol) ?? toStringOrNull(solPrice?.symbol ?? solPrice?.tokenSymbol) ?? "TOKEN";
  const imageUrl = toStringOrNull(meta?.image ?? meta?.imageUrl ?? meta?.logo) ?? null;

  const priceUsd =
    toNumber(pumpPrice?.priceUsd ?? pumpPrice?.price_usd ?? pumpPrice?.usdPrice ?? pumpPrice?.usd_price) ??
    toNumber(solPrice?.priceUsd ?? solPrice?.price_usd ?? solPrice?.usdPrice ?? solPrice?.usd_price) ??
    null;

  const slug = `solana-${address}`;

  return {
    id: slug,
    slug,
    name,
    symbol,
    assetType: "token",
    logoUrl: imageUrl,
    marketCapRank: null,
    priceUsd,
    priceNative: null,
    nativeSymbol: "SOL",
    priceChangeUsd24h: null,
    priceChangePercent24h: null,
  } satisfies CompareAssetSearchItem;
}

export async function GET(request: Request) {
  await connection();
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q") ?? "";
    const trimmedQuery = rawQuery.trim();
    const rawLimit = Number(url.searchParams.get("limit") ?? MAX_RESULTS);
    const limit = clamp(rawLimit, 1, MAX_RESULTS);
    const vsCurrency = (url.searchParams.get("vs_currency") ?? "usd").toLowerCase();

    if (!trimmedQuery.length) {
      const response = apiResponse.success(
        { data: [], fetchedAt: new Date().toISOString() }
      );
      response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      return response;
    }

    const addressQuery = parseAddressQuery(trimmedQuery);
    if (addressQuery) {
      const item =
        addressQuery.kind === "evm"
          ? await (async () => {
              const candidates = addressQuery.chain
                ? [addressQuery.chain]
                : (["0x1", "0x2105", "0xa4b1"] as const);
              for (const chain of candidates) {
                const resolved = await resolveEvmTokenItem({ chain, address: addressQuery.address });
                if (resolved) return resolved;
              }
              return null;
            })()
          : await resolveSolanaTokenItem({ address: addressQuery.address });

      const response = apiResponse.success(
        {
          data: item ? [item] : [],
          fetchedAt: new Date().toISOString(),
        }
      );
      response.headers.set("Cache-Control", "public, s-maxage=45, stale-while-revalidate=30");
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      return response;
    }

    const searchResponse = await searchAssets(trimmedQuery);
    const coinResults = searchResponse.data.coins.slice(0, Math.min(limit, MAX_COIN_RESULTS));
    const remainingSlots = Math.max(0, limit - coinResults.length);
    const nftResults = searchResponse.data.nfts.slice(0, Math.min(remainingSlots || limit, MAX_NFT_RESULTS));

    const [coinSnapshots] = await Promise.all([
      coinResults.length
        ? getCoingeckoMarkets(
            coinResults.map((coin) => coin.id),
            { vsCurrency }
          ).then(res => res.data).catch(() => [])
        : Promise.resolve([]),
    ]);

    const coinSnapshotMap = new Map(coinSnapshots.map((row) => [row.id.toLowerCase(), row] as const));

    const coinItems: CompareAssetSearchItem[] = (coinResults as { id: string; slug?: string; name: string; symbol: string; marketCapRank?: number | null }[]).map((coin) => {
      const snapshot = coinSnapshotMap.get(coin.id.toLowerCase());
      const priceUsd = snapshot?.currentPrice ?? null;
      const priceChangePercent24h = snapshot?.priceChangePercentage24h ?? null;
      const priceChangeUsd24h = computeAbsoluteChange(priceUsd, priceChangePercent24h);

      return {
        id: coin.id,
        slug: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        assetType: "token",
        logoUrl: snapshot?.image ?? null,
        marketCapRank: snapshot?.marketCapRank ?? coin.marketCapRank ?? null,
        priceUsd,
        priceNative: null,
        nativeSymbol: null,
        priceChangeUsd24h,
        priceChangePercent24h,
      } satisfies CompareAssetSearchItem;
    });

    const nftItems: CompareAssetSearchItem[] = [];
    for (const nft of nftResults) {
      try {
        const detail = await getNftDetails(nft.id);
        const payload = detail.data;
        nftItems.push({
          id: nft.id,
          slug: nft.slug,
          name: nft.name,
          symbol: nft.symbol,
          assetType: "nft",
          logoUrl: payload.imageUrl ?? nft.thumbUrl ?? null,
          priceUsd: payload.floorPriceUsd ?? null,
          priceNative: payload.floorPriceNative ?? null,
          nativeSymbol: resolveNativeSymbol(payload.blockchains),
          marketCapRank: null,
          priceChangeUsd24h: null,
          priceChangePercent24h: null,
        });
      } catch (error) {
        logger.warn("[asset-search] failed to hydrate nft", nft.id, error);
      }
    }

    const items = [...coinItems, ...nftItems];

    const response = apiResponse.success(
      {
        data: items,
        fetchedAt: new Date().toISOString(),
      }
    );
    response.headers.set("Cache-Control", "public, s-maxage=45, stale-while-revalidate=30");
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return response;
  } catch (error) {
    const status = typeof (error as { status?: number } | null)?.status === "number"
      ? (error as { status: number }).status
      : 500;
    const message = error instanceof Error ? error.message : "Unable to search assets";
    
    // Fallback error code based on status
    const code = status >= 500 ? "INTERNAL_ERROR" : "SEARCH_ERROR";
    
    return apiResponse.error(code, message, status);
  }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
