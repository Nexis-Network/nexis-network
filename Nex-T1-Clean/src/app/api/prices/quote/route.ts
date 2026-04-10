import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { getTokenPricesByContracts } from "@/server/market/coingecko";


import { logger } from '@/lib/logger';

type Asset = { chainId: number; address: string };
type QuoteResult = { chainId: number; address: string; priceUsd: number | null; change24h: number | null };

const PLATFORM_BY_CHAIN_ID: Record<number, string> = {
  1: "ethereum",
  10: "optimistic-ethereum",
  56: "binance-smart-chain",
  100: "xdai",
  137: "polygon-pos",
  1101: "polygon-zkevm",
  250: "fantom",
  288: "boba",
  324: "zksync",
  5000: "mantle",
  534352: "scroll",
  8453: "base",
  81457: "blast",
  204: "opbnb",
  42161: "arbitrum-one",
  43114: "avalanche",
  59144: "linea",
};

export async function POST(req: NextRequest) {
  return withAuthedSupabase(async ({ cookieBridge }) => {
    try {
      const body = (await req.json().catch(() => ({}))) as { assets?: Asset[] };
      const assets = Array.isArray(body.assets) ? body.assets : [];
      if (!assets.length) {
        return cookieBridge.commit(apiResponse.success({ quotes: [] }));
      }

      // Group by platform id
      const byPlatform = new Map<string, Asset[]>();
      for (const asset of assets) {
        const platform = PLATFORM_BY_CHAIN_ID[asset.chainId];
        if (!platform || !asset.address) continue;
        const list = byPlatform.get(platform) ?? [];
        list.push({ chainId: asset.chainId, address: asset.address.toLowerCase() });
        byPlatform.set(platform, list);
      }

      const quotes: QuoteResult[] = [];
      for (const [platform, list] of byPlatform.entries()) {
        const addresses = Array.from(new Set(list.map((a) => a.address)));
        const result = await getTokenPricesByContracts(platform, addresses);
        for (const a of list) {
          const entry = result[a.address] ?? result[a.address.toLowerCase()] ?? null;
          quotes.push({
            chainId: a.chainId,
            address: a.address,
            priceUsd: entry?.usd ?? null,
            change24h: entry?.usd_24h_change ?? null,
          });
        }
      }

      return cookieBridge.commit(apiResponse.success({ quotes }));
    } catch (error) {
      logger.error("[prices/quote] Error:", error);
      return cookieBridge.commit(apiResponse.success({ quotes: [] }));
    }
  });
}
