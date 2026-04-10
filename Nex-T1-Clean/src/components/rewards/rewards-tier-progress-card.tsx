"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpTierChip } from "@/components/xp/xp-tier-chip";
import type { RewardsSummaryPayload } from "@/lib/rewards/types";

type RewardsTierProgressCardProps = {
  xp: RewardsSummaryPayload["xp"];
};

export function RewardsTierProgressCard({ xp }: RewardsTierProgressCardProps) {
  const { totalXp, level, tier } = xp;

  const nextTierText =
    tier.nextMinXp === null ? "Max tier reached" : `${tier.xpToNextTier.toLocaleString()} XP to Tier ${tier.tier + 1}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>XP Tier</CardTitle>
        <CardDescription>Current progression and tier status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <XpTierChip tierInfo={tier} totalXp={totalXp} iconSize={20} className="h-9 px-2.5 text-xs" showTierLabel />
        <div className="flex items-center justify-between text-sm">
          <span>Level {level}</span>
          <span className="tabular-nums text-muted-foreground">{totalXp.toLocaleString()} XP</span>
        </div>
        <Progress value={tier.tierProgressPct} className="h-2" />
        <p className="text-xs text-muted-foreground">{nextTierText}</p>
      </CardContent>
    </Card>
  );
}
