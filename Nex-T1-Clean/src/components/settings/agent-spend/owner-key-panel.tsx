"use client";

import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/settings/shared/bento-card";

type Props = {
  userId: string | null;
};

export function OwnerKeyPanel({ userId }: Props) {
  void userId;

  return (
    <BentoCard>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-medium text-[var(--bento-text-primary)]">Wallet delegates</div>
          <div className="text-xs text-[var(--bento-text-muted)]">
            Agent wallet signing is managed by Nex Wallets. Owner key registration is no longer required.
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Nex Wallet
        </Badge>
      </div>
    </BentoCard>
  );
}
