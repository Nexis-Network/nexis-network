"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

export type WalletSparklineTone = "positive" | "negative" | "neutral";

type Props = {
  values: number[];
  tone?: WalletSparklineTone;
  className?: string;
};

function buildPoints(values: number[], width: number, height: number): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddingY = 2;
  const innerH = height - paddingY * 2;
  const stepX = width / Math.max(1, values.length - 1);

  return values
    .map((val, i) => {
      const x = i * stepX;
      const normalized = (val - min) / range;
      const y = height - paddingY - normalized * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function WalletSparkline({ values, tone = "neutral", className }: Props) {
  const width = 84;

  const points = useMemo(() => buildPoints(values, width, 20), [values]);
  const isNegative = tone === "negative";
  const shadow = tone === "positive" ? "shadow-[0_0_12px_#83B047]" : tone === "negative" ? "shadow-[0_0_12px_#E38752]" : "";

  if (!values.length) {
    return <div className={cn("h-[28px] w-[84px] rounded", className)} aria-hidden />;
  }

  return (
    <div className={cn("relative h-[28px] w-[84px]", className)} aria-hidden>
      <div className={cn("absolute left-0 top-[4px] h-[20px] w-[84px] rounded-[4px] bg-[#D9D9D9]", shadow)}>
        <svg
          width={width}
          height={20}
          viewBox={`0 0 ${width} 20`}
          className={cn("absolute left-0 top-0", isNegative ? "scale-x-[-1]" : "")}
        >
          <polyline
            points={points}
            fill="none"
            stroke={tone === "neutral" ? "rgba(0,0,0,0.25)" : "#111111"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
