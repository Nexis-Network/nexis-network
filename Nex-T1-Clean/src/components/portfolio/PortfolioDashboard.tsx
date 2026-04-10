"use client";

import { useMemo } from "react";
import { PortfolioNetWorth } from "@/app/(authenticated)/portfolio/_components/portfolio-net-worth";
import { useAggregatedPortfolio } from "@/lib/hooks/use-aggregated-portfolio";
import { AggregatedPortfolio } from "@/server/services/portfolio-service";
import { resolveCdpEmbeddedEvmSelectionChainId } from "@/lib/cdp/cdp-wallet-selection";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useCdpAggregatedBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import {
  buildCdpWalletDescriptors,
  buildSyntheticCdpWalletEntries,
} from "./portfolio-dashboard.cdp-wallets";
import { filterPortfolioWallets } from "./portfolio-dashboard.filters";
import { PortfolioDashboardTable } from "./portfolio-dashboard-table";

export interface PortfolioDashboardProps {
  selectedChainId?: string;
  selectedWalletId?: string | "all";
  portfolio?: AggregatedPortfolio;
  isLoading?: boolean;
}

export function PortfolioDashboard({
  selectedChainId = "all",
  selectedWalletId = "all",
  portfolio: passedPortfolio,
}: PortfolioDashboardProps) {
  const { portfolio: fetchedPortfolio } = useAggregatedPortfolio();
  const portfolio = passedPortfolio || fetchedPortfolio;
  const { evmAddress: cdpEvmAddr, solanaAddress: cdpSolAddr } = useResolvedCdpWallets();
  const { data: userWallets } = useUserWallets();
  const cdpEvmChainId = useMemo(
    () =>
      resolveCdpEmbeddedEvmSelectionChainId({
        address: cdpEvmAddr,
        wallets: userWallets?.wallets,
      }),
    [cdpEvmAddr, userWallets?.wallets],
  );

  const cdpWalletDescriptors = useMemo(
    () =>
      buildCdpWalletDescriptors({
        evmAddress: cdpEvmAddr,
        evmChainId: cdpEvmChainId,
        solanaAddress: cdpSolAddr,
      }),
    [cdpEvmAddr, cdpEvmChainId, cdpSolAddr],
  );

  const { balances: cdpBalances } = useCdpAggregatedBalance(cdpWalletDescriptors);

  const cdpWalletEntries = useMemo(() => {
    return buildSyntheticCdpWalletEntries({
      existingWallets: portfolio?.wallets ?? [],
      balances: cdpBalances,
      evmAddress: cdpEvmAddr,
      evmChainId: cdpEvmChainId,
      solanaAddress: cdpSolAddr,
    });
  }, [cdpEvmAddr, cdpEvmChainId, cdpSolAddr, cdpBalances, portfolio?.wallets]);

  const filteredWallets = useMemo(
    () =>
      filterPortfolioWallets({
        wallets: [...(portfolio?.wallets ?? []), ...cdpWalletEntries],
        selectedChainId,
        selectedWalletId,
      }),
    [portfolio?.wallets, cdpWalletEntries, selectedChainId, selectedWalletId],
  );

  return (
    <div className="space-y-8 pb-12">
      <PortfolioNetWorth
        totalNetWorthUsd={portfolio?.totalNetWorthUsd || 0}
        assets={portfolio?.assets || []}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Assets</h3>
          <span className="text-xs text-muted-foreground">
            {filteredWallets.length} accounts
          </span>
        </div>

        <PortfolioDashboardTable wallets={filteredWallets} />
      </section>
    </div>
  );
}
