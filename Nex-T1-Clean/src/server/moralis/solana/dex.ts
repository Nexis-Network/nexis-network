import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest } from "@/server/moralis/client";
import { normalizeSolanaAddress, normalizeSolanaNetwork, type SolanaNetwork } from "@/server/moralis/validation";

export type MoralisSolPairsResponse = Record<string, UntypedJson>;
export type MoralisSolPairStatsResponse = Record<string, UntypedJson>;
export type MoralisSolOhlcvResponse = Record<string, UntypedJson>;

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/get-token-pairs-by-address
export async function getSolanaTokenPairsByAddress(params: {
  network?: SolanaNetwork | string | null;
  address: string;
}): Promise<MoralisSolPairsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisSolPairsResponse>({
    api: "solana",
    path: `/token/${network}/${address}/pairs`,
    cache: {
      ...MORALIS_CACHE.solPairsByToken,
      tags: [`sol:${network}`, `token:${address}`, "sol:pairs_by_token"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/get-token-pair-stats
export async function getSolanaTokenPairStats(params: {
  network?: SolanaNetwork | string | null;
  pairAddress: string;
}): Promise<MoralisSolPairStatsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const pairAddress = normalizeSolanaAddress(params.pairAddress);

  return moralisRequest<MoralisSolPairStatsResponse>({
    api: "solana",
    path: `/token/${network}/pairs/${pairAddress}/stats`,
    cache: {
      ...MORALIS_CACHE.solPairStats,
      tags: [`sol:${network}`, `pair:${pairAddress}`, "sol:pair_stats"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/price/get-ohlcv-by-pair-address?network=mainnet&address=...&fromDate=...&toDate=...&timeframe=1h&currency=usd&limit=5
export async function getSolanaOhlcvByPairAddress(params: {
  network?: SolanaNetwork | string | null;
  pairAddress: string;
  fromDate: string;
  toDate: string;
  timeframe: string;
  currency?: string;
  limit?: number;
}): Promise<MoralisSolOhlcvResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const pairAddress = normalizeSolanaAddress(params.pairAddress);
  const limit = Math.min(500, Math.max(1, params.limit ?? 50));

  return moralisRequest<MoralisSolOhlcvResponse>({
    api: "solana",
    path: `/token/${network}/pairs/${pairAddress}/ohlcv`,
    query: {
      fromDate: params.fromDate,
      toDate: params.toDate,
      timeframe: params.timeframe,
      currency: params.currency ?? "usd",
      limit,
    },
    cache: {
      ...MORALIS_CACHE.solOhlcv,
      tags: [`sol:${network}`, `pair:${pairAddress}`, "sol:ohlcv"],
    },
  });
}

