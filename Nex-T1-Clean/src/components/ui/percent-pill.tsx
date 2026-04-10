"use client";

import { TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type PercentPillTone = "positive" | "negative" | "neutral";

export type PercentPillProps = {
  value: number | null | undefined;
  tone?: PercentPillTone;
  className?: string;
};

function defaultTone(value: number): PercentPillTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function PercentPill({ value, tone, className }: PercentPillProps) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const resolvedTone = tone ?? defaultTone(value);
  const absText = `${Math.abs(value).toFixed(1)}%`;

  if (resolvedTone === "neutral") {
    return (
      <span
        className={cn(
          "inline-flex h-[18px] items-center gap-1 rounded-full border px-1.5 text-[10px] leading-[14px] text-muted-foreground",
          className,
        )}
      >
        {absText}
      </span>
    );
  }

  const isPositive = resolvedTone === "positive";
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium leading-[14px]",
        isPositive
          ? "bg-[#83B047]/5 border-[#2F3E1C] text-[#83B047]"
          : "bg-[#E38752]/5 border-[#4C2D1B] text-[#E38752]",
        className,
      )}
    >
      <TrendingUp className={cn("h-3 w-3", isPositive ? "" : "rotate-180")} />
      <span>{absText}</span>
    </span>
  );
}

