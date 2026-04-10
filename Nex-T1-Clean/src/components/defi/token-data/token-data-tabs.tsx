"use client";

import React from "react";
import { useSwapStore } from "@/stores/use-swap-store";
import { AnimatedTabs } from "@/components/ui/tabs";
import { TransactionsTab } from "./tabs/transactions-tab";
import { DescriptionTab } from "./tabs/description-tab";
import { PoolsTab } from "./tabs/pools-tab";
import { HoldersTab } from "./tabs/holders-tab";
import { TradersTab } from "./tabs/traders-tab";

export function TokenDataTabs() {
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);
  // We prefer showing data for the token the user is buying, or fallback to sell token
  const activeToken = buyToken || sellToken;

  if (!activeToken) {
    return null;
  }

  const tabs = [
    { label: "Transactions", value: "transactions" },
    { label: "Description", value: "description" },
    { label: "Pools", value: "pools" },
    { label: "Holders", value: "holders" },
    { label: "Top Traders", value: "traders" },
  ];

  const content = {
    transactions: <TransactionsTab token={activeToken} />,
    description: <DescriptionTab token={activeToken} />,
    pools: <PoolsTab token={activeToken} />,
    holders: <HoldersTab token={activeToken} />,
    traders: <TradersTab token={activeToken} />,
  };

  return (
    <div className="w-full flex flex-col mt-8 border border-white/10 rounded-2xl bg-[#0f0f10] overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-[#131415]">
        <h3 className="text-white text-lg font-semibold">{activeToken.symbol} Data</h3>
      </div>
      <div className="p-4">
        <AnimatedTabs tabs={tabs} content={content} />
      </div>
    </div>
  );
}
