// Domain: leaderboard
// Responsibility: Serve real-time leaderboard data from Supabase with fallback to seed
// Depends on: supabase

import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { getLeaderboardSeed } from "@/server/services/data/leaderboard";


import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  await connection();
  try {
    // Await params for Next.js 15+ compatibility
    const _resolvedParams = await params;
    const url = new URL(request.url);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "100", 10));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

    const supabase = await createClient();
    
    // Fall back to seeded data if Supabase is not configured
    if (!supabase) {
      return apiResponse.success(getLeaderboardSeed());
    }
    
    // Try to get real leaderboard data from Supabase
    const { data: leaderboardData, error } = await supabase.rpc("get_leaderboard", {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.error("[Leaderboard] Database error:", error);
      // Fall back to seeded data if DB call fails
      return apiResponse.success(getLeaderboardSeed());
    }

    // If we have real data, transform it
    if (leaderboardData && leaderboardData.length > 0) {
      const entries = leaderboardData.map((row: UntypedJson) => ({
        rank: Number(row.rank),
        wallet_address: row.wallet_address,
        wallet_type: row.wallet_type ?? "evm",
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
        xp: row.total_xp ?? 0,
        volume_usd: Number(row.volume_usd ?? 0),
        referral_fees_usd: Number(row.referral_fees_usd ?? 0),
        pnl_usd: Number(row.pnl_usd ?? 0),
        active_chains: row.active_chains ?? [],
        level: row.level ?? 1,
        login_streak: row.login_streak ?? 0,
      }));

      // Get total count for metadata
      const { count } = await supabase
        .from("user_leaderboard_stats")
        .select("*", { count: "exact", head: true })
        .gt("total_xp", 0);

      return apiResponse.success({
        entries,
        updated_at: new Date().toISOString(),
        sample_size: count ?? entries.length,
        source: "realtime",
      });
    }

    // Fall back to seeded data if no real users yet
    return apiResponse.success(getLeaderboardSeed());
  } catch (error) {
    logger.error("[Leaderboard] Error:", error);
    // Fall back to seeded data on any error
    return apiResponse.success(getLeaderboardSeed());
  }
}

// Forward other methods to return method not allowed
export async function POST() {
  return apiResponse.error("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export async function DELETE() {
  return apiResponse.error("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export async function PATCH() {
  return apiResponse.error("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export async function PUT() {
  return apiResponse.error("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
