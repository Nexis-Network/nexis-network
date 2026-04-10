"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import type { AutomationStrategyRecord } from "@/modules/automation/types";
import { Badge } from "@/components/ui/badge";
import {
  readMemecoinRecommendation,
  truncateMiddle,
} from "@/components/settings/automation/strategy/strategy-types";

type StrategyListItemProps = {
  strategy: AutomationStrategyRecord;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export function StrategyListItem({
  strategy,
  isExpanded,
  onToggle,
  children,
}: StrategyListItemProps) {
  const memecoinRec = readMemecoinRecommendation(strategy.metadata);

  return (
    <div className="rounded-lg border border-[var(--bento-border)] bg-white/[0.03]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-t-lg bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-[var(--bento-text-primary)] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <span>{strategy.name}</span>
          <Badge variant={strategy.isActive ? "secondary" : "outline"}>
            {strategy.isActive ? "Active" : "Paused"}
          </Badge>
          <Badge variant="outline">v{strategy.version}</Badge>
          {memecoinRec ? (
            <Badge
              variant="outline"
              title={`Last recommendation at ${memecoinRec.at}`}
            >
              Rec {truncateMiddle(memecoinRec.mint, 14)} ·{" "}
              {Math.round(memecoinRec.score)}
            </Badge>
          ) : null}
        </div>
        <div className="text-xs text-[var(--bento-text-muted)]">
          Updated {strategy.updatedAt.toLocaleString()}
        </div>
      </button>
      {isExpanded && children}
    </div>
  );
}
