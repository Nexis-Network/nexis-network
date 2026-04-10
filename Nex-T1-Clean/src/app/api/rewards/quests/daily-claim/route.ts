import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { resolveXpTier } from "@/lib/xp/tier";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createClient } from "@/server/services/supabase/server";


type RpcRow = Record<string, UntypedJson>;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return apiResponse.unauthorized("Please sign in to claim daily quest XP");
    }

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const { data, error } = await supabase.rpc("claim_daily_quest_xp", {
      p_user_id: user.id,
    });

    if (error) {
      logger.error("[Rewards Daily Claim] claim_daily_quest_xp failed", error);
      return apiResponse.badRequest(error.message || "Failed to claim daily quest XP", error.code);
    }

    const row = (data?.[0] ?? data ?? null) as RpcRow | null;
    if (!row) {
      return apiResponse.internalError("No result from claim_daily_quest_xp");
    }

    const totalXp = toNumber(row.total_xp, 0);

    return apiResponse.success({
      success: Boolean(row.success),
      xpEarned: toNumber(row.xp_earned, 0),
      totalXp,
      newLevel: toNumber(row.new_level, 1),
      tier: resolveXpTier(totalXp),
      message: typeof row.message === "string" ? row.message : "Daily quest processed",
    });
  } catch (error) {
    logger.error("[Rewards Daily Claim] Unexpected error", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to claim daily quest XP");
  }
}
