"use client";

import React from "react";

interface ExchangeRateCardProps {
  sellSymbol: string;
  buySymbol: string;
  exchangeRate: string | null;  // e.g. "3,258.00"
  networkFeeUsd: string | null; // e.g. "$2.10"
  networkFeePct: string | null; // e.g. "0.05%"
  estimatedTime: string;        // e.g. "Real time" | "~15 sec"
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-[7px]">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-[11px] font-mono text-white text-right">{value}</span>
    </div>
  );
}

export function ExchangeRateCard({
  sellSymbol,
  buySymbol,
  exchangeRate,
  networkFeeUsd,
  networkFeePct,
  estimatedTime,
}: ExchangeRateCardProps) {
  const rateDisplay = exchangeRate
    ? `1 ${sellSymbol} = ${exchangeRate} ${buySymbol}`
    : "Fetching rate...";

  const feeDisplay =
    networkFeeUsd && networkFeePct
      ? `${networkFeeUsd} (${networkFeePct})`
      : networkFeeUsd ?? "—";

  return (
    <div className="border-t border-white/[0.06] mt-1">
      <DetailRow label="Exchange Rate" value={rateDisplay} />
      <DetailRow label="Network Fe" value={feeDisplay} />
      <DetailRow label="Est. Time:" value={estimatedTime} />
    </div>
  );
}
