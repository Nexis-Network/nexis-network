"use client";

import type { XpTierInfo } from "@/lib/xp/tier";
import { cn } from "@/lib/utils";

import { XpTierIcon } from "./xp-tier-icon";

type XpTierChipProps = {
  tierInfo: XpTierInfo;
  totalXp: number;
  className?: string;
  iconSize?: number;
  showTierLabel?: boolean;
  compact?: boolean;
};

export function XpTierChip({
  tierInfo,
  totalXp,
  className,
  iconSize = 18,
  showTierLabel = false,
  compact = true,
}: XpTierChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/10 bg-muted/20 text-muted-foreground",
        compact ? "gap-1.5 px-2 py-1 text-[11px]" : "gap-2 px-2.5 py-1.5 text-xs",
        className,
      )}
      title={`Tier ${tierInfo.tier} • ${Math.max(0, Math.floor(totalXp)).toLocaleString()} XP`}
    >
      <XpTierIcon tier={tierInfo.tier} size={iconSize} />
      {showTierLabel ? (
        <span className="font-medium text-foreground/90">Tier {tierInfo.tier}</span>
      ) : null}
      <span className="font-mono tabular-nums">
        {Math.max(0, Math.floor(totalXp)).toLocaleString()} XP
      </span>
    </div>
  );
}

export default XpTierChip;
