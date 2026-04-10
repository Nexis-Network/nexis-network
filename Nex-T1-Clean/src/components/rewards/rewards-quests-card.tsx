"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RewardsQuestSummary } from "@/lib/rewards/types";

type RewardsQuestsCardProps = {
  quests: RewardsQuestSummary[];
  activeQuestCode: string | null;
  onCompleteQuest: (questCode: string) => void;
};

function formatRecurrenceLabel(value: RewardsQuestSummary["recurrence"]) {
  if (value === "once") return "One-time";
  if (value === "daily") return "Daily";
  return "Repeatable";
}

export function RewardsQuestsCard({ quests, activeQuestCode, onCompleteQuest }: RewardsQuestsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quests</CardTitle>
        <CardDescription>Complete quests to earn XP and climb tiers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.length === 0 ? <p className="text-sm text-muted-foreground">No quests available.</p> : null}

        {quests.map((quest) => (
          <div key={quest.code} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{quest.title}</p>
              <p className="text-xs text-muted-foreground">{quest.description ?? "No description"}</p>
              <p className="text-xs text-muted-foreground">
                {formatRecurrenceLabel(quest.recurrence)} · +{quest.xpReward.toLocaleString()} XP
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant={quest.isClaimable ? "default" : "outline"}
              disabled={!quest.isClaimable || activeQuestCode === quest.code}
              onClick={() => onCompleteQuest(quest.code)}
            >
              {activeQuestCode === quest.code ? "Processing..." : quest.isClaimable ? "Complete" : "Completed"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
