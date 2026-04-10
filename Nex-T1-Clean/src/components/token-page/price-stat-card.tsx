"use client";

import { ArrowUpRight, Sun } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type PriceStatCardProps = {
  price: number | null;
  deltaLabel: string;
  deltaAbsoluteLabel?: string | null;
  isPositive: boolean | null;
  timestamp: number | null;
  relativeLabel: string;
  assetType: "token" | "nft";
};

export function PriceStatCard({
  price,
  deltaLabel,
  deltaAbsoluteLabel,
  isPositive,
  timestamp,
  relativeLabel,
  assetType,
}: PriceStatCardProps) {
  const { whole, fraction } = useMemo(() => formatPriceParts(price), [price]);
  const timestampLabel = timestamp
    ? new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    : null;
  const deltaColor =
    isPositive == null ? "text-muted-foreground" : isPositive ? "text-primary" : "text-destructive";

  return (
    <div className="flex w-full flex-wrap gap-y-0 mb-5">
      <div className="flex h-16 w-full max-w-[336.73px] flex-col rounded-[12px] border border-border bg-card px-[17px] py-[9px]">
        <div className="flex h-[46px] w-full flex-col">
          <div className="flex h-[30px] w-full items-center justify-between">
            <div className="relative flex items-center gap-1 text-[20px] font-medium tracking-[0.16px] text-foreground">
              <span className="text-[20px] font-mono font-normal">$</span>
              <div className="relative flex h-[30px] items-center overflow-hidden">
                <span className="text-[24px] font-mono font-normal leading-[30px] tracking-[0.16px]">
                  {whole}
                </span>
                <span className="ml-[2px] text-[18px] font-mono font-normal leading-[24px] tracking-[0.16px] text-foreground">
                  {fraction}
                </span>
              </div>
            </div>
            <div className={cn("flex items-center gap-1 text-sm font-medium tracking-[0.16px]", deltaColor)}>
              <div className="relative flex h-[27px] w-[27px] items-center justify-center">
                <span className="absolute h-[19px] w-[19px] rotate-45 rounded-[4px]" />
                <ArrowUpRight className={cn("size-4", isPositive === false && "rotate-180")} />
              </div>
              <span>{deltaLabel}</span>
            </div>
          </div>
          <div className="flex h-[16px] w-full flex-wrap items-center gap-3 text-[12px] leading-4 tracking-[0.16px] text-muted-foreground">
            {deltaAbsoluteLabel ? <span>{deltaAbsoluteLabel} since open</span> : null}
            <span className="text-muted-foreground/80">{assetType === "token" ? "Spot multi-feed" : "Floor multi-feed"}</span>
            {timestampLabel ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sun className="size-3 text-[#F0B434]" />
                {timestampLabel}
              </span>
            ) : null}
            {relativeLabel ? <span className="text-muted-foreground/60">As of {relativeLabel}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPriceParts(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return { whole: "--", fraction: "" };
  }
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  });
  const formatted = formatter.format(value);
  const [whole, fraction] = formatted.split(".");
  return { whole, fraction: fraction ? `.${fraction}` : "" };
}

export type { PriceStatCardProps };
