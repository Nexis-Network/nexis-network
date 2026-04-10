"use client";

import { Loader2 } from "lucide-react";

import { useCreditsContext } from "@/components/providers/credits-provider";
import { Progress } from "@/components/ui/progress";
import { resolveUsageCreditLimit } from "@/lib/constants/billing-limits";

export function UsageCredits() {
  const {
    credits,
    limit,
    monthlyRemaining,
    overageCredits,
    loading,
    plan,
  } = useCreditsContext();

  const monthlyLimit =
    typeof limit === "number" && limit > 0
      ? limit
      : resolveUsageCreditLimit(plan);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const safeMonthlyLimit = monthlyLimit > 0 ? monthlyLimit : 100;
  const safeMonthlyRemaining =
    typeof monthlyRemaining === "number"
      ? Math.max(monthlyRemaining, 0)
      : typeof credits === "number"
        ? Math.min(Math.max(credits, 0), safeMonthlyLimit)
        : 0;
  const used = Math.max(0, safeMonthlyLimit - safeMonthlyRemaining);
  const percentage = Math.min(100, Math.max(0, (used / safeMonthlyLimit) * 100));
  const safeOverageCredits =
    typeof overageCredits === "number" ? Math.max(overageCredits, 0) : 0;

  return (
    <div className="flex flex-col gap-1.5 px-1 py-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium text-muted-foreground/90">Monthly usage</span>
        <span className="text-muted-foreground">
          {used} / {safeMonthlyLimit}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-[6px] w-full bg-[var(--auth-menu-subtle-bg)] [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-sky-300 [&>[data-slot=progress-indicator]]:via-sky-400 [&>[data-slot=progress-indicator]]:to-sky-500 [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-500"
      />
      {safeOverageCredits > 0 ? (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Extra credits</span>
          <span>{safeOverageCredits}</span>
        </div>
      ) : null}
    </div>
  );
}
