"use client";

import { formatFiat } from "@/lib/formatters/wallet";
import { cn } from "@/lib/utils";
import type { WalletCardHoldingSegment } from "@/lib/wallets/wallet-card-holdings";

const HOLDING_PALETTES = [
  {
    railClassName: "bg-[linear-gradient(180deg,rgba(205,255,74,0.14)_0%,rgba(205,255,74,0.04)_100%)]",
    barClassName: "bg-[linear-gradient(180deg,#d6ff54_0%,#96db24_100%)] shadow-[0_0_16px_rgba(198,255,66,0.28)]",
    labelClassName: "bg-[#d3fb57] text-[#394307]",
    valueClassName: "bg-[#95a640] text-[#1f2208]",
  },
  {
    railClassName: "bg-[linear-gradient(180deg,rgba(255,179,207,0.14)_0%,rgba(255,179,207,0.04)_100%)]",
    barClassName: "bg-[linear-gradient(180deg,#ffc1db_0%,#f49ac2_100%)] shadow-[0_0_16px_rgba(255,177,211,0.2)]",
    labelClassName: "bg-[#ffb6d3] text-[#4d1229]",
    valueClassName: "bg-[#c87da2] text-[#2f0819]",
  },
  {
    railClassName: "bg-[linear-gradient(180deg,rgba(154,138,255,0.14)_0%,rgba(154,138,255,0.04)_100%)]",
    barClassName: "bg-[linear-gradient(180deg,#b1a2ff_0%,#8172ff_100%)] shadow-[0_0_16px_rgba(150,138,255,0.22)]",
    labelClassName: "bg-[#a99cff] text-[#21135e]",
    valueClassName: "bg-[#756bd4] text-[#120c38]",
  },
  {
    railClassName: "bg-[linear-gradient(180deg,rgba(255,202,117,0.16)_0%,rgba(255,202,117,0.05)_100%)]",
    barClassName: "bg-[linear-gradient(180deg,#ffd27a_0%,#f3ac3d_100%)] shadow-[0_0_16px_rgba(255,196,102,0.2)]",
    labelClassName: "bg-[#ffc85a] text-[#543204]",
    valueClassName: "bg-[#d1993e] text-[#382101]",
  },
  {
    railClassName: "bg-[linear-gradient(180deg,rgba(160,160,160,0.12)_0%,rgba(160,160,160,0.04)_100%)]",
    barClassName: "bg-[linear-gradient(180deg,#767676_0%,#515151_100%)] shadow-[0_0_16px_rgba(111,111,111,0.18)]",
    labelClassName: "bg-[#696969] text-white/90",
    valueClassName: "bg-[#4b4b4b] text-white/82",
  },
];

function formatSegmentValue(segment: WalletCardHoldingSegment): string {
  if (segment.kind === "nft" && segment.valueUsd <= 0) {
    const count = Math.max(1, Math.trunc(segment.quantity ?? 0));
    return `${count} NFT${count === 1 ? "" : "s"}`;
  }

  return formatFiat(segment.valueUsd, { compact: true });
}

function buildSegmentBars(share: number): number[] {
  const count = Math.max(4, Math.min(9, Math.round(share / 10) + 3));
  return Array.from({ length: count }, (_, index) => index);
}

export function WalletCardHoldingsBars({
  segments,
  isLoading,
}: {
  segments: WalletCardHoldingSegment[];
  isLoading?: boolean;
}) {
  if (isLoading && segments.length === 0) {
    return (
      <div className="flex h-[84px] items-end gap-2 rounded-[18px] border border-white/8 bg-white/[0.035] px-2 py-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex flex-1 animate-pulse items-end gap-1 rounded-[14px] bg-white/[0.04] px-1.5 pb-1.5 pt-5"
          >
            {Array.from({ length: 5 }, (_, barIndex) => (
              <div
                key={barIndex}
                className="h-full flex-1 rounded-full bg-white/[0.08]"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex h-[84px] items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.035] px-3 text-[11px] text-white/45">
        No holdings data yet
      </div>
    );
  }

  return (
    <div className="flex h-[60px] gap-1.5 rounded-[18px] border border-white/8 bg-white/[0.03] p-1.5">
      {segments.map((segment, index) => {
        const palette = HOLDING_PALETTES[index % HOLDING_PALETTES.length]!;
        const flexValue = Math.max(segment.share, 12);
        const bars = buildSegmentBars(segment.share);

        return (
          <div
            key={segment.id}
            data-testid="wallet-card-holding-segment"
            className={cn(
              "relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[14px] border border-white/6 px-1.5 pb-1.5 pt-1",
              palette.railClassName,
            )}
            style={{ flex: `${flexValue} 1 0%` }}
          >
            <span
              className={cn(
                "max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.03em]",
                palette.labelClassName,
              )}
            >
              {segment.label}
            </span>

            <div className="flex h-[30px] items-end gap-1">
              {bars.map((bar) => (
                <div
                  key={bar}
                  className={cn("min-w-[4px] flex-1 rounded-full", palette.barClassName)}
                  style={{
                    height: `${52 + ((bar % 4) * 14)}%`,
                    opacity: 0.9 - (bar % 3) * 0.08,
                  }}
                />
              ))}
            </div>

            <span
              className={cn(
                "ml-auto max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.02em]",
                palette.valueClassName,
              )}
            >
              {formatSegmentValue(segment)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
