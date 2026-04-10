"use server";

import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { fetchAllWatchlistItems } from "@/modules/watchlist/service";
import { moralisRequest } from "@/server/moralis/client";


import { logger } from '@/lib/logger';
interface WalletPnL {
  totalPnlUsd: number;
  totalPnlPercent: number;
}

interface WalletData {
  watchlistCount: number;
  pnl: WalletPnL;
}

export async function getEnhancedWalletData(address: string, chainId: number | string): Promise<WalletData | null> {
  const supabase = await getSupabaseServerClient();
  let watchlistCount = 0;

  // 1. Get Watchlist Count
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const items = await fetchAllWatchlistItems(supabase, user.id);
        watchlistCount = items.length;
      } catch (e) {
        logger.error("Failed to fetch watchlist count", e);
      }
    }
  }

  // 2. Get PnL
  let pnl: WalletPnL = { totalPnlUsd: 0, totalPnlPercent: 0 };
  const chainStr = String(chainId).toLowerCase();
  
  const isSolana = chainStr === "101" || chainStr === "solana";

  if (isSolana) {
     // CoinGecko does not support Wallet PnL.
     // Previous BirdEye integration removed.
     // Valid to return 0 for now until a new provider is added.
     pnl = { totalPnlUsd: 0, totalPnlPercent: 0 };
  } else {
    // EVM -> Moralis
    try {
        const hexChain = "0x" + Number(chainId).toString(16);
        // Using Generic request
        // NOTE: The `profitability` endpoint is part of the new Moralis Wallet API.
        const response = await moralisRequest<UntypedJson>({
            api: "evm",
            path: `wallets/${address}/profitability`,
            query: { chain: hexChain }
        });
        
        if (response) {
            // Mapping Moralis response
            // Assuming: { total_profit_usd: 123, total_profit_percentage: 12 }
            pnl = {
                totalPnlUsd: toNumber(response.total_profit_usd) ?? 0,
                totalPnlPercent: toNumber(response.total_profit_percentage) ?? 0
            };
        }
    } catch {
        // Fallback: 0
    }
  }

  return {
    watchlistCount,
    pnl
  };
}

function toNumber(val: unknown): number | null {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
    }
    return null;
}
