"use client";

import { AssetTick } from "@/lib/utils/asset-normalization";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AiSidePanel } from "@/components/dashboard/chat-shell/ai-side-panel";
import { FloatingChatInput } from "@/components/assets/floating-chat-input";
import { AssetPageOverview } from "@/components/assets/asset-client-view/asset-page-overview";
import { AssetPageSidebar } from "@/components/assets/asset-client-view/asset-page-sidebar";
import { AssetPageTabs } from "@/components/assets/asset-client-view/asset-page-tabs";
import { useAssetPageController } from "@/components/assets/asset-client-view/use-asset-page-controller";

interface AssetClientViewProps {
  initialAsset: AssetTick;
  initialHistory?: [number, number][];
}

export function AssetClientView({ initialAsset, initialHistory = [] }: AssetClientViewProps) {
  const controller = useAssetPageController({ initialAsset, initialHistory });

  return (
    <DashboardShell
      insetClassName="overflow-y-auto bg-background"
      rightPanel={
        <AiSidePanel
          isOpen={controller.isChatOpen}
          onClose={() => controller.handlers.setIsChatOpen(false)}
          title="Nex AI Assistant"
          description={`Ask about ${initialAsset.symbol} or request market analysis.`}
        />
      }
    >
      <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary-foreground overflow-x-hidden px-2 pb-4 pt-0 md:px-2 md:pt-0 md-pb-6 lg:px-0 lg:pt-0 lg:pb-8">
        <div className="px-0 py-4 px-4 flex items-center text-[15px] text-muted-foreground border-b border-border/60">
          <Link href="/screener" className="hover:text-foreground transition-colors font-medium">
            Tokens
          </Link>
          <span className="mx-2 text-muted-foreground">›</span>
          <span className="text-foreground font-medium">{initialAsset.symbol}</span>
        </div>

        <div className="flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto px-4">
          <div className="flex-1 min-w-0 pt-6 pb-6 px-8 lg:border-r border-border/60 space-y-8">
            <AssetPageOverview
              asset={initialAsset}
              price={controller.price}
              change24h={controller.change24h}
              historyData={controller.historyData}
              timeframe={controller.timeframe}
              interval={controller.interval}
              chartType={controller.chartType}
              highPrice={controller.highPrice}
              lowPrice={controller.lowPrice}
              formattedMarketCap={controller.formattedMarketCap}
              formattedVolume24h={controller.formattedVolume24h}
              onChartTypeChange={controller.handlers.setChartType}
              onIntervalChange={controller.handlers.setInterval}
              onTimeframeChange={controller.handlers.setTimeframe}
            />

            <AssetPageTabs
              activeTab={controller.activeTab}
              symbol={initialAsset.symbol}
              tokenLogoUrl={initialAsset.logoUrl}
              price={controller.price || initialAsset.price || 0}
              marketCap={controller.marketCap}
              holders={controller.holders}
              pools={controller.pools}
              transactions={controller.transactions}
              currentPage={controller.transactionPage}
              isTransactionsLoading={controller.isTransactionsLoading}
              vestingData={controller.vestingData}
              vestingChart={controller.vestingChart}
              publicSales={controller.publicSales}
              fundingRounds={controller.fundingRounds}
              onPageChange={controller.handlers.setTransactionPage}
              onTabChange={controller.handlers.setActiveTab}
            />
          </div>

          <AssetPageSidebar
            asset={initialAsset}
            securityData={controller.securityData}
            tradeData={controller.tradeData}
          />
        </div>
      </div>

      {!controller.isChatOpen ? (
        <FloatingChatInput
          onExpand={() => controller.handlers.setIsChatOpen(true)}
          isPanelOpen={controller.isChatOpen}
          marketContext={controller.marketContext}
        />
      ) : null}

    </DashboardShell>
  );
}
