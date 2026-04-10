"use client";

import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

type RankBadgeProps = {
  rank: number;
};

const topRankStyles: Record<1 | 2 | 3, { badge: string; icon: string }> = {
  1: {
    badge: "bg-lime-300/10 text-lime-300 border-lime-300/20",
    icon: "text-lime-300",
  },
  2: {
    badge: "bg-sky-500/10/10 text-blue-50 border-blue-50/20",
    icon: "text-blue-50",
  },
  3: {
    badge: "bg-violet-400/10 text-violet-400 border-violet-400/20",
    icon: "text-violet-400",
  },
};

export function RankBadge({ rank }: RankBadgeProps) {
  if (rank <= 0) {
    return null;
  }

  if (rank <= 3) {
    const styles = topRankStyles[rank as 1 | 2 | 3];
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-regular",
          styles.badge,
        )}
      >
        <Crown className={cn("size-3.5", styles.icon)} aria-hidden />
        <span className="leading-none">{`#${rank}`}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center rounded-full bg-muted px-3 py-1 text-sm font-regular text-muted-foreground">
      #{rank}
    </div>
  );
}
