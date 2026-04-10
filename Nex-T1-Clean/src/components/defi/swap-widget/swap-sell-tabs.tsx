"use client";

import { SegmentedTabs } from "@/components/ui/tabs";

interface SwapSellTabsProps {
  activeTab: "swap" | "sell";
  onTabChange: (tab: "swap" | "sell") => void;
}

const SWAP_SELL_OPTIONS = [
  { value: "swap" as const, label: "Swap" },
  { value: "sell" as const, label: "Sell" },
];

export function SwapSellTabs({ activeTab, onTabChange }: SwapSellTabsProps) {
  return (
    <div className="mx-4 mb-3">
      <SegmentedTabs
        options={SWAP_SELL_OPTIONS}
        value={activeTab}
        onChange={onTabChange}
        size="sm"
      />
    </div>
  );
}
