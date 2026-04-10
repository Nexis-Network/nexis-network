"use client";

import { SegmentedTabs } from "@/components/ui/tabs";
import { HoldersTable } from "@/components/assets/holders-table";
import { PoolsTable } from "@/components/assets/pools-table";
import { TransactionsTable } from "@/components/assets/transactions-table";
import { VestingTable } from "@/components/assets/vesting-table";
import { FundingRoundsTable } from "@/components/assets/funding-rounds-table";
import { PublicSalesTable } from "@/components/assets/public-sales-table";
import { ASSET_PAGE_TABS } from "./asset-page.constants";
import type { AssetPageTab } from "./asset-page.types";

interface AssetPageTabsProps {
  activeTab: AssetPageTab;
  symbol: string;
  tokenLogoUrl?: string;
  price: number;
  marketCap: number;
  holders: Parameters<typeof HoldersTable>[0]["holders"];
  pools: Parameters<typeof PoolsTable>[0]["pools"];
  transactions: Parameters<typeof TransactionsTable>[0]["transactions"];
  currentPage: number;
  isTransactionsLoading: boolean;
  vestingData: Parameters<typeof VestingTable>[0]["data"];
  vestingChart: Parameters<typeof VestingTable>[0]["chart"];
  publicSales: Parameters<typeof PublicSalesTable>[0]["sales"];
  fundingRounds: Parameters<typeof FundingRoundsTable>[0]["rounds"];
  onPageChange: (page: number) => void;
  onTabChange: (tab: AssetPageTab) => void;
}

export function AssetPageTabs({
  activeTab,
  symbol,
  tokenLogoUrl,
  price,
  marketCap,
  holders,
  pools,
  transactions,
  currentPage,
  isTransactionsLoading,
  vestingData,
  vestingChart,
  publicSales,
  fundingRounds,
  onPageChange,
  onTabChange,
}: AssetPageTabsProps) {
  const tabOptions = ASSET_PAGE_TABS.map((tab) => ({
    value: tab.key,
    label: tab.label,
  }));

  return (
    <div className="space-y-6 pt-4">
      <SegmentedTabs
        options={tabOptions}
        value={activeTab}
        onChange={onTabChange}
      />

      <div className="w-full min-h-[300px]">
        {activeTab === "transactions" ? (
          <TransactionsTable
            transactions={transactions}
            symbol={symbol}
            tokenLogoUrl={tokenLogoUrl}
            currentPage={currentPage}
            onPageChange={onPageChange}
            isLoading={isTransactionsLoading}
          />
        ) : null}

        {activeTab === "pools" ? (
          <PoolsTable pools={pools} symbol={symbol} tokenLogoUrl={tokenLogoUrl} />
        ) : null}

        {activeTab === "holders" ? (
          <HoldersTable
            holders={holders}
            symbol={symbol}
            price={price}
            marketCap={marketCap}
          />
        ) : null}

        {activeTab === "vesting" ? (
          <VestingTable data={vestingData} chart={vestingChart} />
        ) : null}

        {activeTab === "sales" ? (
          <PublicSalesTable sales={publicSales} symbol={symbol} />
        ) : null}

        {activeTab === "funding" ? (
          <FundingRoundsTable rounds={fundingRounds} symbol={symbol} />
        ) : null}
      </div>
    </div>
  );
}
