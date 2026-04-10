import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import type { RewardsQuestSummary, RewardsSummaryPayload } from "@/lib/rewards/types";
import { resolveXpTier, type XpTierInfo } from "@/lib/xp/tier";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createClient } from "@/server/services/supabase/server";

const CANONICAL_APP_URL = "https://nex-t1.ai";

type RpcRow = Record<string, UntypedJson>;

type QuestDefinitionRow = {
  quest_code: string;
  title: string;
  description: string | null;
  xp_reward: number;
  recurrence: "daily" | "once" | "repeatable";
};

type QuestClaimRow = {
  quest_code: string;
  claim_date: string;
};

type ReferralConversionRow = {
  invite_code: string;
  signup_xp_awarded_at: string | null;
  pro_bonus_awarded_at: string | null;
  ultra_bonus_awarded_at: string | null;
};

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

function resolveBaseUrl() {
  return CANONICAL_APP_URL;
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function latestClaimDate(claims: QuestClaimRow[]): string | null {
  if (claims.length === 0) return null;
  return claims
    .map((claim) => claim.claim_date)
    .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))[0] ?? null;
}

export async function GET() {
  await connection();
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return apiResponse.unauthorized("Please sign in to view rewards");
    }

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const [{ data: statusData, error: statusError }, { data: inviteCodeData, error: inviteCodeError }] = await Promise.all([
      supabase.rpc("get_daily_claim_status", { p_user_id: user.id }),
      supabase.rpc("ensure_user_invite_code_for_supabase"),
    ]);

    if (statusError) {
      logger.error("[Rewards Summary] get_daily_claim_status failed", statusError);
    }

    if (inviteCodeError) {
      logger.error("[Rewards Summary] ensure_user_invite_code_for_supabase failed", inviteCodeError);
    }

    const statusRow = (statusData?.[0] ?? statusData ?? null) as RpcRow | null;
    const totalXp = toNumber(statusRow?.total_xp, 0);
    const level = toNumber(statusRow?.level, 1);

    const [{ data: questDefsData, error: questDefsError }, { data: questClaimsData, error: questClaimsError }, { data: conversionData, error: conversionError }] =
      await Promise.all([
        supabase
          .from("quest_definitions")
          .select("quest_code,title,description,xp_reward,recurrence")
          .eq("is_active", true)
          .order("quest_code", { ascending: true }),
        supabase
          .from("user_quest_claims")
          .select("quest_code,claim_date")
          .eq("user_id", user.id),
        supabase
          .from("referral_conversions")
          .select("invite_code,signup_xp_awarded_at,pro_bonus_awarded_at,ultra_bonus_awarded_at")
          .eq("inviter_user_id", user.id)
          .order("signed_up_at", { ascending: false }),
      ]);

    if (questDefsError) {
      logger.error("[Rewards Summary] quest_definitions query failed", questDefsError);
    }

    if (questClaimsError) {
      logger.error("[Rewards Summary] user_quest_claims query failed", questClaimsError);
    }

    if (conversionError) {
      logger.error("[Rewards Summary] referral_conversions query failed", conversionError);
    }

    const questDefinitions = (questDefsData ?? []) as QuestDefinitionRow[];
    const questClaims = (questClaimsData ?? []) as QuestClaimRow[];
    const conversions = (conversionData ?? []) as ReferralConversionRow[];

    const claimsByQuest = new Map<string, QuestClaimRow[]>();
    for (const claim of questClaims) {
      const current = claimsByQuest.get(claim.quest_code) ?? [];
      current.push(claim);
      claimsByQuest.set(claim.quest_code, current);
    }

    const today = todayUtcDate();

    const dailyQuestClaims = claimsByQuest.get("daily-quest-claim") ?? [];
    const dailyQuestLastClaimDate = latestClaimDate(dailyQuestClaims);
    const dailyQuestDefinition = questDefinitions.find((quest) => quest.quest_code === "daily-quest-claim");

    const quests: RewardsQuestSummary[] = questDefinitions
      .filter((quest) => quest.quest_code !== "daily-quest-claim")
      .map((quest) => {
        const claims = claimsByQuest.get(quest.quest_code) ?? [];
        const lastClaim = latestClaimDate(claims);
        const hasAnyClaim = claims.length > 0;
        const hasClaimedToday = claims.some((claim) => claim.claim_date === today);

        let isClaimable = true;
        if (quest.recurrence === "once") {
          isClaimable = !hasAnyClaim;
        } else {
          isClaimable = !hasClaimedToday;
        }

        return {
          code: quest.quest_code,
          title: quest.title,
          description: quest.description,
          xpReward: toNumber(quest.xp_reward, 75),
          recurrence: quest.recurrence,
          isClaimable,
          isCompleted: quest.recurrence === "once" ? hasAnyClaim : hasClaimedToday,
          lastClaimDate: lastClaim,
        };
      });

    const signupCount = conversions.filter((conversion) => Boolean(conversion.signup_xp_awarded_at)).length;
    const proBonusCount = conversions.filter((conversion) => Boolean(conversion.pro_bonus_awarded_at)).length;
    const ultraBonusCount = conversions.filter((conversion) => Boolean(conversion.ultra_bonus_awarded_at)).length;

    const inviteCode = typeof inviteCodeData === "string" ? inviteCodeData : "";

    const payload: RewardsSummaryPayload = {
      xp: {
        totalXp,
        level,
        tier: resolveTierFromRow(totalXp, statusRow),
      },
      dailyClaim: {
        canClaim: Boolean(statusRow?.can_claim ?? true),
        lastClaimDate: (statusRow?.last_claim_date as string | null | undefined) ?? null,
        currentStreak: toNumber(statusRow?.current_streak, 0),
        nextReward: toNumber(statusRow?.next_reward, 100),
      },
      dailyQuest: {
        canClaimToday: !dailyQuestClaims.some((claim) => claim.claim_date === today),
        rewardXp: toNumber(dailyQuestDefinition?.xp_reward, 25),
        lastClaimDate: dailyQuestLastClaimDate,
      },
      referrals: {
        inviteCode,
        inviteUrl: `${resolveBaseUrl()}/auth?view=sign-up&invite=${encodeURIComponent(inviteCode)}`,
        totalReferrals: conversions.length,
        signupCount,
        proBonusCount,
        ultraBonusCount,
        totalReferralXp: signupCount * 500 + proBonusCount * 750 + ultraBonusCount * 1500,
      },
      quests,
    };

    return apiResponse.success(payload);
  } catch (error) {
    logger.error("[Rewards Summary] Unexpected error", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to fetch rewards summary");
  }
}
