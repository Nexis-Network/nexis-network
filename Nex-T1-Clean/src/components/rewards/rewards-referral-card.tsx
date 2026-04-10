"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewardsSummaryPayload } from "@/lib/rewards/types";

type RewardsReferralCardProps = {
  referrals: RewardsSummaryPayload["referrals"];
  onCopyInviteLink: () => void;
};

export function RewardsReferralCard({ referrals, onCopyInviteLink }: RewardsReferralCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals</CardTitle>
        <CardDescription>Invite users and earn signup and paid-plan XP bonuses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Invite code</p>
          <p className="font-mono text-sm">{referrals.inviteCode || "Unavailable"}</p>
        </div>

        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Invite link</p>
          <p className="truncate text-sm">{referrals.inviteUrl}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">Total referrals</p>
            <p className="font-medium">{referrals.totalReferrals.toLocaleString()}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">Referral XP</p>
            <p className="font-medium">{referrals.totalReferralXp.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-md border p-2 text-center">Signups: {referrals.signupCount}</div>
          <div className="rounded-md border p-2 text-center">Pro: {referrals.proBonusCount}</div>
          <div className="rounded-md border p-2 text-center">Ultra: {referrals.ultraBonusCount}</div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onCopyInviteLink}>
          Copy invite link
        </Button>
      </CardContent>
    </Card>
  );
}
