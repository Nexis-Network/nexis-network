import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest } from "@/server/moralis/client";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";

import { type MoralisPaginated } from "./wallet";
import { normalizeEvmAddress, normalizeEvmChain } from "@/server/moralis/validation";

export type MoralisEvmErc20Metadata = {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  logo?: string;
  thumbnail?: string;
  possible_spam?: boolean;
  verified_collection?: boolean;
};

export type MoralisEvmErc20Price = {
  tokenName?: string;
  tokenSymbol?: string;
  tokenLogo?: string;
  tokenDecimals?: string;
  tokenAddress?: string;
  usdPrice: number;
  ["24hrPercentChange"]?: string;
  exchangeName?: string;
  exchangeAddress?: string;
};

/**
 * Moralis EVM Token API (Swagger v2.2)
 * - GET /erc20/metadata?addresses[]=...
 * - GET /erc20/metadata/symbols?symbols[]=...
 * - GET /erc20/{address}/price?include=percent_change
 * - POST /erc20/prices
 *
 * Verification source: https://deep-index.moralis.io/api-docs/v2.2/swagger-ui-init.js
 */

export async function getEvmErc20Metadata(params: {
  chain?: string | number | null;
  addresses: string[];
}): Promise<MoralisEvmErc20Metadata[]> {
  const chain = normalizeEvmChain(params.chain);
  const addresses = params.addresses.slice(0, 10).map((addr) => normalizeEvmAddress(addr));
  if (!addresses.length) return [];

  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    path: "/erc20/metadata",
    query: { chain, addresses } as Record<string, UntypedJson>,
    cache: {
      ...MORALIS_CACHE.tokenMetadata,
      tags: [`chain:${chain}`, ...addresses.map((a) => `token:${a.toLowerCase()}`), "evm:erc20_metadata"],
    },
  });

  return Array.isArray(payload) ? (payload as MoralisEvmErc20Metadata[]) : [];
}

export async function getEvmErc20MetadataBySymbols(params: {
  chain?: string | number | null;
  symbols: string[];
}): Promise<MoralisEvmErc20Metadata[]> {
  const chain = normalizeEvmChain(params.chain);
  const symbols = params.symbols
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10);
  if (!symbols.length) return [];

  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    path: "/erc20/metadata/symbols",
    query: { chain, symbols } as Record<string, UntypedJson>,
    cache: {
      ...MORALIS_CACHE.tokenMetadata,
      tags: [`chain:${chain}`, ...symbols.map((s) => `symbol:${s}`), "evm:erc20_metadata_symbols"],
    },
  });

  return Array.isArray(payload) ? (payload as MoralisEvmErc20Metadata[]) : [];
}

export async function getEvmErc20TokenPrice(params: {
  chain?: string | number | null;
  address: string;
  include24hrPercentChange?: boolean;
}): Promise<MoralisEvmErc20Price> {
  const chain = normalizeEvmChain(params.chain);
  const address = normalizeEvmAddress(params.address);

  const payload = await moralisRequest<MoralisEvmErc20Price>({
    api: "evm",
    path: `/erc20/${address}/price`,
    query: {
      chain,
      include: params.include24hrPercentChange === false ? undefined : "percent_change",
    } as Record<string, UntypedJson>,
    cache: {
      ...MORALIS_CACHE.tokenPrices,
      tags: [`chain:${chain}`, `token:${address.toLowerCase()}`, "evm:erc20_price"],
    },
  });

  return payload ?? ({ usdPrice: 0 } as MoralisEvmErc20Price);
}

export async function getEvmErc20TokenPrices(params: {
  chain?: string | number | null;
  addresses: string[];
  include24hrPercentChange?: boolean;
}): Promise<MoralisEvmErc20Price[]> {
  const chain = normalizeEvmChain(params.chain);
  const addresses = params.addresses.slice(0, 30).map((addr) => normalizeEvmAddress(addr));
  if (!addresses.length) return [];

  const body = {
    tokens: addresses.map((token_address) => ({ token_address })),
  };

  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    method: "POST",
    path: "/erc20/prices",
    query: {
      chain,
      include: params.include24hrPercentChange === false ? undefined : "percent_change",
    } as Record<string, UntypedJson>,
    body,
    cache: {
      ...MORALIS_CACHE.tokenPrices,
      tags: [`chain:${chain}`, "evm:erc20_prices_batch"],
    },
  });

  return Array.isArray(payload) ? (payload as MoralisEvmErc20Price[]) : [];
}

export function pickEvmTokenLogo(meta: Partial<MoralisEvmErc20Metadata> | null | undefined): string | null {
  const record = asRecord(meta);
  return toStringOrNull(record?.logo ?? record?.thumbnail) ?? null;
}

export function pickEvmTokenDecimals(meta: Partial<MoralisEvmErc20Metadata> | null | undefined): number | null {
  const record = asRecord(meta);
  return toNumber(record?.decimals) ?? null;
}


export async function searchEvmTokens(params: {
  query: string;
  chain?: string | number | null;
  limit?: number;
  // sort logic if needed
}): Promise<MoralisEvmErc20Metadata[]> {
  const chain = normalizeEvmChain(params.chain);

  const payload = await moralisRequest<MoralisPaginated<MoralisEvmErc20Metadata>>({
    api: "evm",
    path: "/erc20/search",
    query: {
      chain,
      q: params.query,
      limit: Math.min(100, params.limit ?? 25),
      match_name: true,
      match_symbol: true,
    } as Record<string, UntypedJson>,
    cache: {
      ...MORALIS_CACHE.tokenMetadata,
      tags: [`chain:${chain}`, `search:${params.query}`, "evm:token_search"],
    },
  });

  return Array.isArray(payload.result) ? payload.result : [];
}

export async function getEvmMultipleTokenAnalytics(params: {
  tokens: { token_address: string; chain: string | number }[];
}): Promise<Record<string, UntypedJson>[]> {
  if (!params.tokens.length) return [];

  // This endpoint is POST /erc20/stats
  // or /erc20/analytics (check docs, prompt says: get-multiple-token-analytics)
  // Actually, prompt link: https://docs.moralis.com/web3-data-api/evm/reference/get-multiple-token-analytics
  // Path: /erc20/analytics (POST)

  const body = {
    tokens: params.tokens.map(t => ({
      token_address: normalizeEvmAddress(t.token_address),
      chain: normalizeEvmChain(t.chain)
    }))
  };

  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    method: "POST",
    path: "/erc20/analytics",
    body,
    cache: {
      ...MORALIS_CACHE.tokenPrices, // Analytics change often-ish
      tags: ["evm:token_analytics_batch"],
    },
  });

  return Array.isArray(payload) ? (payload as Record<string, UntypedJson>[]) : [];
}
