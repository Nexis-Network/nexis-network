"use client";

import { useMemo } from "react";
import { useCreditsContext } from "@/components/providers/credits-provider";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type CreditUsageProps = {
  className?: string;
};

const formatReset = (resetIso: string | null): string => {
  if (!resetIso) return "—";
  const resetDate = new Date(resetIso);
  if (Number.isNaN(resetDate.valueOf())) return "—";
  const diffMs = resetDate.getTime() - Date.now();
  if (diffMs <= 0) return "Resets soon";
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  return hours === 1 ? "1 hour remaining" : `${hours} hours remaining`;
};

export function CreditUsage({ className }: CreditUsageProps) {
  const { credits, limit, reset, plan, monthlyRemaining, overageCredits } =
    useCreditsContext();

  const derived = useMemo(() => {
    const remaining = typeof credits === "number" ? Math.max(credits, 0) : null;
    const max = typeof limit === "number" && limit > 0 ? limit : null;
    const includedRemaining =
      typeof monthlyRemaining === "number"
        ? Math.max(monthlyRemaining, 0)
        : remaining !== null && max !== null
          ? Math.min(remaining, max)
          : null;
    const extraCredits =
      typeof overageCredits === "number" ? Math.max(overageCredits, 0) : 0;
    const pct =
      includedRemaining !== null && max !== null && max > 0
        ? (includedRemaining / max) * 100
        : null;
    const resetLabel = formatReset(reset);
    return { remaining, max, pct, resetLabel, extraCredits };
  }, [credits, limit, monthlyRemaining, overageCredits, reset]);

  if (derived.remaining === null || derived.max === null) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-background/80 p-3 text-xs shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">Credits</span>
          <span className="text-muted-foreground">
            {derived.remaining}/{derived.max} {plan ? `(${plan})` : null}
          </span>
        </div>
        <span className="text-muted-foreground">{derived.resetLabel}</span>
      </div>
      {derived.pct !== null ? (
        <div className="mt-2 space-y-1">
          <Progress value={derived.pct} className="h-2" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Remaining</span>
            <span>{derived.pct.toFixed(0)}%</span>
          </div>
          {derived.extraCredits > 0 ? (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Extra credits</span>
              <span>{derived.extraCredits.toFixed(0)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
