"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  RewardsDailyQuestCard,
  RewardsQuestsCard,
  RewardsReferralCard,
  RewardsTierProgressCard,
} from "@/components/rewards";
import { Card, CardContent } from "@/components/ui/card";
import {
  useClaimDailyQuestXp,
  useCompleteQuest,
  useRewardsSummary,
} from "@/lib/hooks/rewards/use-rewards-summary";

export default function RewardsPage() {
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
    <section className="space-y-6" data-testid="rewards-page">
      <div className="space-y-1">
        <h1 className="text-xl font-regular">Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Track XP tiers, claim daily quest rewards, and complete quests to progress.
        </p>
      </div>

      {summaryQuery.isLoading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading rewards...
          </CardContent>
        </Card>
      ) : null}

      {summaryQuery.error ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-destructive">
            {summaryQuery.error instanceof Error ? summaryQuery.error.message : "Failed to load rewards"}
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RewardsTierProgressCard xp={data.xp} />
          <RewardsDailyQuestCard
            dailyQuest={data.dailyQuest}
            onClaim={handleClaimDailyQuest}
            isClaiming={claimDailyQuestMutation.isPending}
          />
          <RewardsQuestsCard
            quests={data.quests}
            activeQuestCode={activeQuestCode}
            onCompleteQuest={handleCompleteQuest}
          />
          <RewardsReferralCard referrals={data.referrals} onCopyInviteLink={handleCopyInviteLink} />
        </div>
      ) : null}
    </section>
  );
}
