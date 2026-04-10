import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest } from "@/server/moralis/client";
import { normalizeSolanaAddress, normalizeSolanaNetwork, type SolanaNetwork } from "@/server/moralis/validation";

export type MoralisPumpfunListResponse = Record<string, UntypedJson>;
export type MoralisPumpfunTokenPairsResponse = Record<string, UntypedJson>;
export type MoralisPumpfunTokenPriceResponse = Record<string, UntypedJson>;
export type MoralisPumpfunTokenMetadataResponse = Record<string, UntypedJson>;
export type MoralisPumpfunTokenBondingStatusResponse = Record<string, UntypedJson>;
export type MoralisPumpfunTokenSwapsResponse = Record<string, UntypedJson>;

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-new-pump-fun-tokens
export async function getPumpfunNewTokens(params: {
  network?: SolanaNetwork | string | null;
  limit?: number;
  cursor?: string | null;
}): Promise<MoralisPumpfunListResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisPumpfunListResponse>({
    api: "solana",
    path: `/token/${network}/exchange/pumpfun/new`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
    },
    cache: {
      ...MORALIS_CACHE.pumpfunNewTokens,
      tags: [`sol:${network}`, "pumpfun:new_tokens"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-bonding-pump-fun-tokens
export async function getPumpfunBondingTokens(params: {
  network?: SolanaNetwork | string | null;
  limit?: number;
  cursor?: string | null;
}): Promise<MoralisPumpfunListResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisPumpfunListResponse>({
    api: "solana",
    path: `/token/${network}/exchange/pumpfun/bonding`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
    },
    cache: {
      ...MORALIS_CACHE.pumpfunBondingTokens,
      tags: [`sol:${network}`, "pumpfun:bonding_tokens"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-graduated-pump-fun-tokens
export async function getPumpfunGraduatedTokens(params: {
  network?: SolanaNetwork | string | null;
  limit?: number;
  cursor?: string | null;
}): Promise<MoralisPumpfunListResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisPumpfunListResponse>({
    api: "solana",
    path: `/token/${network}/exchange/pumpfun/graduated`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
    },
    cache: {
      ...MORALIS_CACHE.pumpfunGraduatedTokens,
      tags: [`sol:${network}`, "pumpfun:graduated_tokens"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-token-bonding-status
export async function getPumpfunTokenBondingStatus(params: {
  network?: SolanaNetwork | string | null;
  address: string;
}): Promise<MoralisPumpfunTokenBondingStatusResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisPumpfunTokenBondingStatusResponse>({
    api: "solana",
    path: `/token/${network}/${address}/bonding-status`,
    cache: {
      ...MORALIS_CACHE.pumpfunBondingStatus,
      tags: [`sol:${network}`, `token:${address}`, "pumpfun:bonding_status"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-prices
export async function getPumpfunTokenPrice(params: {
  network?: SolanaNetwork | string | null;
  address: string;
}): Promise<MoralisPumpfunTokenPriceResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisPumpfunTokenPriceResponse>({
    api: "solana",
    path: `/token/${network}/${address}/price`,
    cache: {
      ...MORALIS_CACHE.pumpfunPrices,
      tags: [`sol:${network}`, `token:${address}`, "pumpfun:price"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-metadata
export async function getPumpfunTokenMetadata(params: {
  network?: SolanaNetwork | string | null;
  address: string;
}): Promise<MoralisPumpfunTokenMetadataResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisPumpfunTokenMetadataResponse>({
    api: "solana",
    path: `/token/${network}/${address}/metadata`,
    cache: {
      ...MORALIS_CACHE.pumpfunMetadata,
      tags: [`sol:${network}`, `token:${address}`, "pumpfun:metadata"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-pairs
export async function getPumpfunTokenPairsByAddress(params: {
  network?: SolanaNetwork | string | null;
  address: string;
}): Promise<MoralisPumpfunTokenPairsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisPumpfunTokenPairsResponse>({
    api: "solana",
    path: `/token/${network}/${address}/pairs`,
    cache: {
      ...MORALIS_CACHE.pumpfunPairs,
      tags: [`sol:${network}`, `token:${address}`, "pumpfun:pairs"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-swaps
export async function getPumpfunTokenSwaps(params: {
  network?: SolanaNetwork | string | null;
  address: string;
  limit?: number;
  cursor?: string | null;
}): Promise<MoralisPumpfunTokenSwapsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisPumpfunTokenSwapsResponse>({
    api: "solana",
    path: `/token/${network}/${address}/swaps`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
    },
    cache: {
      ...MORALIS_CACHE.walletHistory,
      tags: [`sol:${network}`, `token:${address}`, "pumpfun:swaps"],
    },
  });
}

export function pickPumpfunTokenAddresses(input: UntypedJson, limit = 50): string[] {
  if (!input) return [];
  const out = new Set<string>();

  const walk = (value: UntypedJson) => {
    if (out.size >= limit) return;
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === "object") {
      const record = value as Record<string, UntypedJson>;
      const maybeAddress = record.address ?? record.mint ?? record.tokenAddress ?? record.token_address;
      if (typeof maybeAddress === "string" && maybeAddress.length >= 32) {
        try {
          out.add(normalizeSolanaAddress(maybeAddress));
        } catch {}
      }
      for (const v of Object.values(record)) walk(v);
    }
  };

  walk(input);
  return Array.from(out);
}
