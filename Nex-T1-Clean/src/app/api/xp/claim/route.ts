// Domain: gamification
// Responsibility: Handle daily XP claim and claim status requests

import { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { resolveXpTier, type XpTierInfo } from "@/lib/xp/tier";
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

function resolveTierFromRow(totalXp: number, row?: RpcRow | null): XpTierInfo {
  const fallback = resolveXpTier(totalXp);
  if (!row) return fallback;

  const hasNextMinXp = Object.prototype.hasOwnProperty.call(row, "next_min_xp");

  return {
    tier: toNumber(row.tier, fallback.tier) as XpTierInfo["tier"],
    badgePath: typeof row.badge_path === "string" ? row.badge_path : fallback.badgePath,
    minXp: toNumber(row.min_xp, fallback.minXp),
    nextMinXp: hasNextMinXp
      ? row.next_min_xp == null
        ? null
        : toNumber(row.next_min_xp, fallback.nextMinXp ?? 0)
      : fallback.nextMinXp,
    xpToNextTier: toNumber(row.xp_to_next_tier, fallback.xpToNextTier),
    tierProgressPct: toNumber(row.tier_progress_pct, fallback.tierProgressPct),
  };
}

function defaultStatusPayload() {
  const tier = resolveXpTier(0);
  return {
    canClaim: true,
    currentStreak: 0,
    nextReward: 100,
    totalXp: 0,
    level: 1,
    tier,
  };
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return apiResponse.unauthorized("Please sign in to claim XP");
    }

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const { data, error } = await supabase.rpc("claim_daily_xp", {
      p_user_id: user.id,
    });

    if (error) {
      logger.error("[XP Claim] Database error", error);
      return apiResponse.badRequest(error.message || "Failed to claim XP", error.code);
    }

    const result = (data?.[0] ?? data ?? null) as RpcRow | null;
    if (!result) {
      return apiResponse.internalError("No result from claim function");
    }

    const totalXp = toNumber(result.total_xp, 0);
    const claimSuccess = Boolean(result.success);
    const message = typeof result.message === "string" ? result.message : "XP processed";

    return apiResponse.success({
      success: claimSuccess,
      xpEarned: toNumber(result.xp_earned, 0),
      streakDay: toNumber(result.streak_day, 0),
      totalXp,
      newLevel: toNumber(result.new_level, 1),
      tier: resolveTierFromRow(totalXp, result),
      message,
      alreadyClaimed: claimSuccess === false && message.toLowerCase().includes("already claimed"),
    });
  } catch (error) {
    logger.error("[XP Claim] Error", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Internal server error");
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return apiResponse.success(defaultStatusPayload());
    }

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.success(defaultStatusPayload());
    }

    const { data, error } = await supabase.rpc("get_daily_claim_status", {
      p_user_id: user.id,
    });

    if (error) {
      logger.error("[XP Status] Database error", error);
      return apiResponse.success(defaultStatusPayload());
    }

    const result = (data?.[0] ?? data ?? null) as RpcRow | null;
    if (!result) {
      return apiResponse.success(defaultStatusPayload());
    }

    const totalXp = toNumber(result.total_xp, 0);

    return apiResponse.success({
      canClaim: Boolean(result.can_claim ?? true),
      lastClaimDate: (result.last_claim_date as string | null | undefined) ?? null,
      currentStreak: toNumber(result.current_streak, 0),
      nextReward: toNumber(result.next_reward, 100),
      totalXp,
      level: toNumber(result.level, 1),
      tier: resolveTierFromRow(totalXp, result),
    });
  } catch (error) {
    logger.error("[XP Status] Error", error);
    return apiResponse.success(defaultStatusPayload());
  }
}
