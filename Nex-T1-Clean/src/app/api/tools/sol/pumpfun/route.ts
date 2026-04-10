import { connection, NextRequest } from "next/server";
import { z } from "zod";
import pMap from "p-map";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import {
  getPumpfunNewTokens,
  getPumpfunBondingTokens,
  getPumpfunGraduatedTokens,
  getPumpfunTokenPrice,
  getPumpfunTokenPairsByAddress,
  getPumpfunTokenMetadata,
  getPumpfunTokenBondingStatus,
  getPumpfunTokenSwaps,
} from "@/server/moralis/solana/pumpfun";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const ActionType = z.enum([
  "new",
  "bonding",
  "graduated",
  "prices",
  "pairs",
  "metadata",
  "bonding-status",
  "swaps",
]);

const querySchema = z.object({
  type: ActionType,
  network: z.string().optional(),
  address: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  addresses: z.string().optional(), // For metadata batch
});

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("tools.sol.pumpfun.unified.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "sol.pumpfun.unified" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      type: url.searchParams.get("type"),
      network: url.searchParams.get("network") ?? undefined,
      address: url.searchParams.get("address") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      addresses: url.searchParams.get("addresses") ?? undefined,
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    const { type, network: rawNetwork, limit: rawLimit, cursor: rawCursor, address: rawAddress } = parsed.data;
    const network = normalizeSolanaNetwork(rawNetwork);
    const limit = rawLimit ?? 25;
    const cursor = rawCursor ?? null;

    try {
      switch (type) {
        case "new": {
          const raw = await getPumpfunNewTokens({ network, limit, cursor });
          const { items, nextCursor } = normalizeTokenList(raw, limit);
          return cacheResponse({ network, items, cursor: nextCursor }, 10);
        }
        case "bonding": {
          const raw = await getPumpfunBondingTokens({ network, limit, cursor });
          const { items, nextCursor } = normalizeTokenList(raw, limit);
          return cacheResponse({ network, items, cursor: nextCursor }, 10);
        }
        case "graduated": {
          const raw = await getPumpfunGraduatedTokens({ network, limit, cursor });
          const { items, nextCursor } = normalizeTokenList(raw, limit);
          return cacheResponse({ network, items, cursor: nextCursor }, 30);
        }
        case "prices": {
          if (!rawAddress) throw new Error("Missing address for prices");
          const address = normalizeSolanaAddress(rawAddress);
          const raw = await getPumpfunTokenPrice({ network, address });
          const price = normalizePrice(raw, address);
          return cacheResponse({ network, address, price }, 10);
        }
        case "pairs": {
          if (!rawAddress) throw new Error("Missing address for pairs");
          const address = normalizeSolanaAddress(rawAddress);
          const raw = await getPumpfunTokenPairsByAddress({ network, address });
          const items = normalizePairs(raw);
          return cacheResponse({ network, address, items }, 15);
        }
        case "bonding-status": {
          if (!rawAddress) throw new Error("Missing address for bonding-status");
          const address = normalizeSolanaAddress(rawAddress);
          const raw = await getPumpfunTokenBondingStatus({ network, address });
          const record = asRecord(raw) ?? {};
          const bondingProgress = toNumber(record.bondingProgress ?? record.bonding_progress ?? record.progress) ?? null;
          const mint = toStringOrNull(record.mint ?? record.address ?? record.tokenAddress) ?? address;
          return cacheResponse({ network, address, mint, bondingProgress }, 20);
        }
        case "swaps": {
          if (!rawAddress) throw new Error("Missing address for swaps");
          const address = normalizeSolanaAddress(rawAddress);
          const raw = await getPumpfunTokenSwaps({ network, address, limit, cursor });
          const { swaps, nextCursor } = normalizeSwaps(raw);
          return cacheResponse({ network, address, swaps, cursor: nextCursor }, 10);
        }
        case "metadata": {
          // Metadata handles single or multiple addresses
          const addressList = collectAddresses(url.searchParams);
          if (addressList.length === 0) return apiResponse.badRequest("missing_addresses");
          
          const items = (
            await pMap(
              addressList,
              async (addr) => {
                const raw = await getPumpfunTokenMetadata({ network, address: addr }).catch(() => null);
                return raw ? normalizeMetadata(raw, addr) : null;
              },
              { concurrency: 5 }
            )
          ).filter((item): item is NonNullable<typeof item> => Boolean(item));
          
          return cacheResponse({ network, items }, 60);
        }
      }
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}

function cacheResponse(data: UntypedJson, maxAge: number) {
  const response = apiResponse.success(data);
  response.headers.set("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 6}`);
  return response;
}

// --- Normalization Helpers ---

function normalizeTokenList(raw: UntypedJson, limit: number) {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.tokens) ? (record?.tokens as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  const items = list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      const address = toStringOrNull(r.address ?? r.mint ?? r.tokenAddress ?? r.token_address) ?? null;
      return {
        address,
        name: toStringOrNull(r.name ?? r.token_name) ?? null,
        symbol: toStringOrNull(r.symbol ?? r.token_symbol) ?? null,
        imageUrl: toStringOrNull(r.image ?? r.imageUrl ?? r.logo) ?? null,
        createdAt: toStringOrNull(r.createdAt ?? r.created_at ?? r.created) ?? null,
        priceUsd: toNumber(r.priceUsd ?? r.price_usd ?? r.usd_price) ?? null,
        marketCapUsd: toNumber(r.marketCapUsd ?? r.market_cap_usd ?? r.market_cap) ?? null,
        liquidityUsd: toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? null,
        volume24hUsd: toNumber(r.volumeUsd24h ?? r.volume_24h_usd ?? r.volume_usd_24h ?? r.volumeUsd) ?? null,
      };
    })
    .filter((t) => t.address)
    .slice(0, limit);

  const nextCursor = toStringOrNull(record?.cursor ?? record?.nextCursor ?? record?.next_cursor) ?? null;
  return { items, nextCursor };
}

function normalizePrice(raw: UntypedJson, fallbackAddress: string) {
  const record = asRecord(raw) ?? {};
  return {
    address: toStringOrNull(record.address ?? record.mint ?? record.tokenAddress ?? record.token_address) ?? fallbackAddress,
    pairAddress: toStringOrNull(record.pairAddress ?? record.pair_address ?? record.pair) ?? null,
    exchange: toStringOrNull(record.exchange ?? record.exchangeName ?? record.dex) ?? "pumpfun",
    priceUsd: toNumber(record.priceUsd ?? record.price_usd ?? record.usdPrice ?? record.usd_price) ?? null,
    priceNative: toNumber(record.priceNative ?? record.price_native) ?? null,
    marketCapUsd: toNumber(record.marketCapUsd ?? record.market_cap_usd ?? record.market_cap) ?? null,
    liquidityUsd: toNumber(record.liquidityUsd ?? record.liquidity_usd ?? record.liquidity) ?? null,
    volume24hUsd: toNumber(record.volumeUsd24h ?? record.volume_24h_usd ?? record.volume_usd_24h) ?? null,
    updatedAt: toStringOrNull(record.updatedAt ?? record.updated_at ?? record.lastUpdated ?? record.last_updated) ?? null,
  };
}

function normalizePairs(raw: UntypedJson) {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.pairs) ? (record?.pairs as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  return list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      return {
        pairAddress: toStringOrNull(r.pairAddress ?? r.pair_address ?? r.address) ?? null,
        baseToken: toStringOrNull(r.baseToken ?? r.base_token ?? r.baseMint ?? r.base_mint ?? r.token0) ?? null,
        quoteToken: toStringOrNull(r.quoteToken ?? r.quote_token ?? r.quoteMint ?? r.quote_mint ?? r.token1) ?? null,
        createdAt: toStringOrNull(r.createdAt ?? r.created_at ?? r.pairCreatedAt) ?? null,
        priceUsd: toNumber(r.priceUsd ?? r.price_usd ?? r.price) ?? null,
        liquidityUsd: toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? null,
        volume24hUsd: toNumber(r.volumeUsd24h ?? r.volume_24h_usd ?? r.volume_usd_24h ?? r.volumeUsd) ?? null,
      };
    })
    .filter((p) => p.pairAddress || p.baseToken || p.quoteToken);
}

function normalizeSwaps(raw: UntypedJson) {
  const record = asRecord(raw);
    const list =
        (Array.isArray(raw) ? raw : null) ??
        (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
        (Array.isArray(record?.swaps) ? (record?.swaps as UntypedJson[]) : null) ??
        (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
        [];

  const swaps = list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      return {
        txHash: toStringOrNull(r.transactionHash ?? r.signature ?? r.txHash ?? r.transaction_hash) ?? null,
        timestamp: toStringOrNull(r.blockTimestamp ?? r.block_timestamp ?? r.timestamp) ?? null,
        side: toStringOrNull(r.side ?? r.transactionType ?? r.transaction_type ?? r.type) ?? null,
        bought: toStringOrNull(r.bought) ?? null,
        sold: toStringOrNull(r.sold) ?? null,
        totalValueUsd: toNumber(r.totalValueUsd ?? r.total_value_usd ?? r.valueUsd ?? r.usdValue) ?? null,
      };
    })
    .filter((swap) => swap.txHash || swap.timestamp);
    
  const nextCursor = toStringOrNull(record?.cursor ?? record?.nextCursor ?? record?.next_cursor) ?? null;
  return { swaps, nextCursor };
}

function normalizeMetadata(raw: UntypedJson, fallbackAddress: string) {
  const record = asRecord(raw);
  const address = toStringOrNull(record?.mint ?? record?.address ?? record?.tokenAddress ?? record?.token_address) ?? fallbackAddress;
  return {
    address,
    name: toStringOrNull(record?.name ?? record?.token_name) ?? null,
    symbol: toStringOrNull(record?.symbol ?? record?.token_symbol) ?? null,
    description: toStringOrNull(record?.description) ?? null,
    imageUrl: toStringOrNull(record?.image ?? record?.imageUrl ?? record?.logo) ?? null,
    website: toStringOrNull(record?.website) ?? null,
    twitter: toStringOrNull(record?.twitter) ?? null,
    telegram: toStringOrNull(record?.telegram) ?? null,
  };
}

function collectAddresses(params: URLSearchParams): string[] {
  const repeated = params.getAll("address").filter(Boolean);
  if (repeated.length) {
    return repeated.map((a) => normalizeSolanaAddress(a));
  }

  const addresses = params.get("addresses");
  if (addresses) {
    try {
      const parsed = JSON.parse(addresses) as UntypedJson;
      if (Array.isArray(parsed)) {
        return parsed.map((a) => normalizeSolanaAddress(String(a)));
      }
    } catch {}
  }

  const single = params.get("address");
  return single ? [normalizeSolanaAddress(single)] : [];
}
