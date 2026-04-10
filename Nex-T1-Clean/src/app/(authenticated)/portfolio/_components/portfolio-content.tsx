"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentsTab } from "./agents-tab";
import { WalletPortfolio } from "@/lib/user/profile";
import { PortfolioLayout } from "./portfolio-layout";
import { PortfolioSidebar } from "./portfolio-sidebar";
import { TokensTable } from "./tokens-table";
import { NFTsTab } from "./nfts-tab";
import { PortfolioHeader } from "./portfolio-header";
import { ApprovalsTab } from "./approvals-tab";
import { TransactionHistoryTable } from "@/components/dashboard/transaction-history-table";
import { NetWorthHistoryTable } from "./net-worth-history-table";
import { PortfolioDashboard } from "@/components/portfolio/PortfolioDashboard";
import { useAggregatedPortfolio } from "@/lib/hooks/use-aggregated-portfolio";

interface PortfolioContentProps {
  wallets: WalletPortfolio[];
  snapshots: UntypedJson[];
}

export function PortfolioContent({
  wallets,
  snapshots,
}: PortfolioContentProps) {
  const [selectedChainId, setSelectedChainId] = useState("all");
  const [selectedWalletId, setSelectedWalletId] = useState<string | "all">(
    "all",
  );
  const { portfolio, isLoading } = useAggregatedPortfolio();

  return (
    <PortfolioLayout
      sidebar={<PortfolioSidebar portfolio={portfolio} isLoading={isLoading} />}
      className="gap-8"
    >
      <div className="flex w-full flex-col gap-6 text-[var(--settings-foreground-strong)]">
        {/* Top Bar with Search */}
        <div className="flex items-center justify-between">
          <PortfolioHeader
            wallets={wallets}
            selectedChainId={selectedChainId}
            onChainSelect={setSelectedChainId}
            selectedWalletId={selectedWalletId}
            onWalletSelect={setSelectedWalletId}
          />
        </div>

        {/* Tab Navigation Area */}
        <Tabs defaultValue="overview" className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[var(--settings-border-soft)] pb-0">
            <TabsList className="h-auto w-auto justify-start gap-8 border-none bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                Agents
              </TabsTrigger>
              <TabsTrigger
                value="tokens"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                Tokens
              </TabsTrigger>
              <TabsTrigger
                value="nfts"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                NFTs
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                Approvals
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-base font-normal text-[var(--settings-foreground-subtle)] shadow-none transition-all data-[state=active]:border-[var(--settings-foreground-strong)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--settings-foreground-strong)] hover:text-[var(--settings-foreground-strong)]"
              >
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Empty space filler */}
            <div className="flex-1" />
          </div>

          <div className="flex-1 pt-4">
            <TabsContent value="overview" className="mt-0 space-y-8">
              <PortfolioDashboard
                selectedChainId={selectedChainId}
                selectedWalletId={selectedWalletId}
                portfolio={portfolio}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="agents" className="mt-0 space-y-4">
              <AgentsTab />
            </TabsContent>

            <TabsContent value="tokens" className="mt-0">
              <TokensTable chainId={selectedChainId} wallets={wallets} />
            </TabsContent>

            <TabsContent value="nfts" className="mt-0">
              <NFTsTab chainId={selectedChainId} wallets={wallets} />
            </TabsContent>

            <TabsContent value="approvals" className="mt-0">
              <ApprovalsTab chainId={selectedChainId} wallets={wallets} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-8">
              {portfolio?.transactions && (
                <div>
                  <h3 className="mb-4 text-lg font-medium text-[var(--settings-foreground-strong)]">
                    Transaction History
                  </h3>
                  <TransactionHistoryTable
                    transactions={portfolio.transactions.map((t) => ({
                      id: t.id,
                      tx_hash: t.hash,
                      chain: t.chain.kind,
                      type:
                        t.category === "transfer"
                          ? t.direction === "in"
                            ? "receive"
                            : "send"
                          : t.category,
                      status: "success",
                      block_time: t.timestamp || undefined,
                      // We could join with assets to get amount/symbol if needed,
                      // but UnifiedTransaction doesn't have it directly.
                      // For now we rely on the summary which contains the info.
                    }))}
                  />
                </div>
              )}

              <div>
                <NetWorthHistoryTable snapshots={snapshots} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PortfolioLayout>
  );
}
