"use server";

import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { addWatchlistItem } from "@/modules/watchlist/service";
import { watchlistItemInputSchema } from "@/modules/watchlist/validation";
import { revalidatePath } from "next/cache";


import { logger } from '@/lib/logger';
export async function addToWatchlistAction(asset: {
  symbol: string;
  address: string;
  chain: string;
  name: string;
  logoUrl?: string;
}) {
  const supabase = await getSupabaseServerClient();
  
  if (!supabase) {
    return { success: false, error: "Database unavailable" };
  }
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 2. Add to Watchlist
    // We use the address as the assetId for crypto assets usually
    const payload = watchlistItemInputSchema.parse({
      assetId: asset.address.toLowerCase(),
      assetType: "crypto",
      symbol: asset.symbol,
      displayName: asset.name,
      source: "nex-dashboard",
      metadata: {
        chain: asset.chain,
        logo: asset.logoUrl,
        chainId: asset.chain === "evm" ? "1" : "solana", // Simplification
      },
    });

    await addWatchlistItem(supabase, user.id, payload);

    // 3. Revalidate
    revalidatePath("/watchlist");
    return { success: true };
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to add to watchlist:", message);
    return { success: false, error: message || "Failed to add to watchlist" };
  }

}

export async function getWatchlistAction() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "Database unavailable" };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  
  try {
    const { ensureDefaultWatchlist, fetchDefaultWatchlist } = await import("@/modules/watchlist/service");
    // Ensure a default watchlist exists for the user (auto-creates for new users)
    await ensureDefaultWatchlist(supabase, user.id);
    const summary = await fetchDefaultWatchlist(supabase, user.id);
    return { success: true, data: summary };
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


export async function removeWatchlistItemAction(itemId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "Database unavailable" };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await import("@/modules/watchlist/service").then(m => m.deleteWatchlistItem(supabase, itemId));
    revalidatePath("/watchlist");
    return { success: true };
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

