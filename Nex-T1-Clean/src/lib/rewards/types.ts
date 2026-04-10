import type { XpTierInfo } from "@/lib/xp/tier";

export type RewardsQuestRecurrence = "daily" | "once" | "repeatable";

export type RewardsQuestSummary = {
  code: string;
  title: string;
  description: string | null;
  xpReward: number;
  recurrence: RewardsQuestRecurrence;
  isClaimable: boolean;
  isCompleted: boolean;
  lastClaimDate: string | null;
};

export type RewardsSummaryPayload = {
  xp: {
    totalXp: number;
    level: number;
    tier: XpTierInfo;
  };
  dailyClaim: {
    canClaim: boolean;
    lastClaimDate: string | null;
    currentStreak: number;
    nextReward: number;
  };
  dailyQuest: {
    canClaimToday: boolean;
    rewardXp: number;
    lastClaimDate: string | null;
  };
  referrals: {
    inviteCode: string;
    inviteUrl: string;
    totalReferrals: number;
    signupCount: number;
    proBonusCount: number;
    ultraBonusCount: number;
    totalReferralXp: number;
  };
  quests: RewardsQuestSummary[];
};

export type RewardsMutationResult = {
  success: boolean;
  xpEarned: number;
  totalXp: number;
  newLevel: number;
  tier: XpTierInfo;
  message: string;
};
