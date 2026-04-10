"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Gift, Loader2, Sparkles, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/settings/shared/settings-button";
import { Progress } from "@/components/ui/progress";
import { XpTierChip } from "@/components/xp/xp-tier-chip";
import { useClaimDailyQuestXp, useCompleteQuest, useRewardsSummary } from "@/lib/hooks/rewards/use-rewards-summary";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import { StatusBadge } from "@/components/settings/shared/status-badge";
import { MonoValue } from "@/components/settings/shared/mono-value";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import type { RewardsQuestSummary } from "@/lib/rewards/types";

function formatRecurrenceLabel(value: RewardsQuestSummary["recurrence"]) {
  if (value === "once") return "One-time";
  if (value === "daily") return "Daily";
  return "Repeatable";
}

export default function QuestsPageClient() {
  const [activeQuestCode, setActiveQuestCode] = useState<string | null>(null);

  const summaryQuery = useRewardsSummary();
  const claimDailyQuestMutation = useClaimDailyQuestXp();
  const completeQuestMutation = useCompleteQuest();

  const data = summaryQuery.data;

  async function handleCopyInviteLink() {
    if (!data?.referrals.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(data.referrals.inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Failed to copy invite link");
    }
  }

  async function handleClaimDailyQuest() {
    try {
      const result = await claimDailyQuestMutation.mutateAsync();
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim daily quest XP");
    }
  }

  async function handleCompleteQuest(questCode: string) {
    setActiveQuestCode(questCode);
    try {
      const result = await completeQuestMutation.mutateAsync(questCode);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete quest");
    } finally {
      setActiveQuestCode(null);
    }
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Quests"
        description="Complete quests, claim daily XP, and progress through reward tiers."
      />

      {summaryQuery.isLoading ? (
        <BentoCard>
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="size-4 animate-spin" />
            Loading quest rewards...
          </div>
        </BentoCard>
      ) : null}

      {summaryQuery.error ? (
        <BentoCard>
          <div className="flex h-48 items-center justify-center text-sm text-destructive">
            {summaryQuery.error instanceof Error ? summaryQuery.error.message : "Failed to load rewards"}
          </div>
        </BentoCard>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <BentoCard>
              <BentoCardHeader title="XP Tier Progress" status="online" />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <XpTierChip
                    tierInfo={data.xp.tier}
                    totalXp={data.xp.totalXp}
                    iconSize={18}
                    className="h-8 px-2 text-xs"
                    showTierLabel
                  />
                  <StatusBadge label={`Level ${data.xp.level}`} variant="info" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--bento-text-muted)]">Total XP</span>
                    <MonoValue className="text-[var(--bento-text-primary)]">
                      {data.xp.totalXp.toLocaleString()}
                    </MonoValue>
                  </div>
                  <Progress value={data.xp.tier.tierProgressPct} className="h-2 bg-white/5" />
                  <p className="text-xs text-[var(--bento-text-muted)]">
                    {data.xp.tier.nextMinXp === null
                      ? "You are currently at the highest tier."
                      : `${Math.max(0, data.xp.tier.xpToNextTier).toLocaleString()} XP to Tier ${data.xp.tier.tier + 1}`}
                  </p>
                </div>
              </div>
            </BentoCard>

            <BentoCard>
              <BentoCardHeader title="Daily Quest" />
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-[var(--bento-text-primary)]">
                    {data.dailyQuest.canClaimToday
                      ? `Claim +${data.dailyQuest.rewardXp.toLocaleString()} XP now`
                      : "Already claimed for today"}
                  </p>
                  <p className="text-xs text-[var(--bento-text-muted)]">
                    Last claim: {data.dailyQuest.lastClaimDate ?? "Never"}
                  </p>
                </div>
                <div className="grid gap-4 border-t border-[var(--settings-border)]/8 pt-4 sm:grid-cols-2">
                  <div>
                    <p className="settings-section-label">Streak</p>
                    <MonoValue className="mt-1 text-sm text-[var(--bento-text-primary)]">
                      {data.dailyClaim.currentStreak} days
                    </MonoValue>
                  </div>
                  <div>
                    <p className="settings-section-label">Next Reward</p>
                    <MonoValue className="mt-1 text-sm text-[var(--bento-text-primary)]">
                      +{data.dailyClaim.nextReward} XP
                    </MonoValue>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleClaimDailyQuest}
                  disabled={!data.dailyQuest.canClaimToday || claimDailyQuestMutation.isPending}
                  className="h-8 w-full text-xs"
                >
                  {claimDailyQuestMutation.isPending ? "Claiming..." : `Claim +${data.dailyQuest.rewardXp} XP`}
                </Button>
              </div>
            </BentoCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <BentoCard>
              <BentoCardHeader title="Active Quests" />
              <div className="mt-1">
                {data.quests.length === 0 ? (
                  <div className="settings-inline-section text-sm text-[var(--bento-text-muted)]">
                    No quests available.
                  </div>
                ) : (
                  <div className="settings-inline-list">
                    {data.quests.map((quest) => {
                      const isBusy = activeQuestCode === quest.code;
                      const disabled = !quest.isClaimable || isBusy;
                      const ctaLabel = isBusy ? "Processing..." : quest.isClaimable ? "Complete" : "Completed";
                      const statusLabel = quest.isCompleted ? "Completed" : quest.isClaimable ? "Ready" : "Locked";

                      return (
                        <div
                          key={quest.code}
                          className="settings-inline-row"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-[var(--bento-text-primary)]">{quest.title}</p>
                                <StatusBadge label={statusLabel} variant={quest.isCompleted ? "success" : "neutral"} />
                              </div>
                              <p className="text-xs text-[var(--bento-text-muted)]">
                                {quest.description ?? "No description available."}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--bento-text-muted)]">
                                <span className="inline-flex items-center gap-1">
                                  <Target className="size-3.5" />
                                  {formatRecurrenceLabel(quest.recurrence)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Sparkles className="size-3.5" />+{quest.xpReward.toLocaleString()} XP
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={quest.isClaimable ? "default" : "outline"}
                              disabled={disabled}
                              onClick={() => handleCompleteQuest(quest.code)}
                              className="h-7 px-2.5 text-xs"
                            >
                              {ctaLabel}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </BentoCard>

            <BentoCard>
              <BentoCardHeader title="Referral Rewards" />
              <div className="space-y-3">
                <div className="settings-inline-section space-y-2">
                  <p className="settings-section-label">Invite Code</p>
                  <MonoValue className="mt-1 text-sm text-[var(--bento-text-primary)]">
                    {data.referrals.inviteCode || "Unavailable"}
                  </MonoValue>
                </div>
                <div className="settings-inline-section space-y-2">
                  <p className="settings-section-label">Invite Link</p>
                  <p className="mt-1 truncate text-xs text-[var(--bento-text-primary)]">{data.referrals.inviteUrl}</p>
                </div>
                <div className="grid gap-4 border-t border-[var(--settings-border)]/8 pt-4 text-xs sm:grid-cols-2">
                  <div>
                    <p className="settings-section-label">Referrals</p>
                    <MonoValue className="mt-1 text-sm text-[var(--bento-text-primary)]">
                      {data.referrals.totalReferrals.toLocaleString()}
                    </MonoValue>
                  </div>
                  <div>
                    <p className="settings-section-label">XP Earned</p>
                    <MonoValue className="mt-1 text-sm text-[var(--bento-text-primary)]">
                      {data.referrals.totalReferralXp.toLocaleString()}
                    </MonoValue>
                  </div>
                </div>
                <div className="grid gap-4 border-t border-[var(--settings-border)]/8 pt-4 text-[11px] sm:grid-cols-3">
                  <div className="text-center text-[var(--bento-text-muted)]">
                    Signups: {data.referrals.signupCount}
                  </div>
                  <div className="text-center text-[var(--bento-text-muted)]">
                    Pro: {data.referrals.proBonusCount}
                  </div>
                  <div className="text-center text-[var(--bento-text-muted)]">
                    Ultra: {data.referrals.ultraBonusCount}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyInviteLink} className="settings-surface-button h-8 w-full text-xs">
                  <Copy className="mr-1.5 size-3.5" />
                  Copy invite link
                </Button>
              </div>
            </BentoCard>
          </div>

          <BentoCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
                <Trophy className="size-4 text-[#c7c7cc]" />
                Complete quests and referrals to climb tiers faster.
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--bento-text-muted)]">
                <CheckCircle2 className="size-3.5 text-[#c7c7cc]" />
                Rewards sync in real time
                <Gift className="size-3.5 text-[#c7c7cc]" />
              </div>
            </div>
          </BentoCard>
        </>
      ) : null}
    </SettingsPage>
  );
}
