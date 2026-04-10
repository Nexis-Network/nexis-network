"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RewardsSummaryPayload } from "@/lib/rewards/types";

type RewardsDailyQuestCardProps = {
  dailyQuest: RewardsSummaryPayload["dailyQuest"];
  onClaim: () => void;
  isClaiming: boolean;
};

export function RewardsDailyQuestCard({ dailyQuest, onClaim, isClaiming }: RewardsDailyQuestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Quest</CardTitle>
        <CardDescription>
          {dailyQuest.canClaimToday
            ? `Claim +${dailyQuest.rewardXp.toLocaleString()} XP today.`
            : "Daily quest already claimed for today."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Last claimed: {dailyQuest.lastClaimDate ?? "Never"}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onClaim}
          disabled={!dailyQuest.canClaimToday || isClaiming}
        >
          {isClaiming ? "Claiming..." : `Claim +${dailyQuest.rewardXp} XP`}
        </Button>
      </CardContent>
    </Card>
  );
}
