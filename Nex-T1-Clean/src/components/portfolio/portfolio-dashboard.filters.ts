import { portfolioChainMatchesFilter } from "@/lib/portfolio/chain-filter";
import type { PortfolioDashboardWallet } from "./portfolio-dashboard.types";

type FilterPortfolioWalletsArgs = {
  wallets: PortfolioDashboardWallet[];
  selectedChainId?: string;
  selectedWalletId?: string | "all";
};

export function filterPortfolioWallets(
  args: FilterPortfolioWalletsArgs,
): PortfolioDashboardWallet[] {
  return args.wallets.filter((wallet) =>
    matchesWalletFilters(wallet, args.selectedChainId, args.selectedWalletId),
  );
}

function matchesWalletFilters(
  wallet: PortfolioDashboardWallet,
  selectedChainId?: string,
  selectedWalletId?: string | "all",
): boolean {
  if (
    selectedChainId &&
    selectedChainId !== "all" &&
    !portfolioChainMatchesFilter(getWalletChainHint(wallet), selectedChainId)
  ) {
    return false;
  }

  return !selectedWalletId ||
    selectedWalletId === "all" ||
    wallet.walletId === selectedWalletId;
}

function getWalletChainHint(
  wallet: PortfolioDashboardWallet,
): string | number {
  const metadata = isRecord(wallet.metadata) ? wallet.metadata : null;
  return (
    (typeof metadata?.chainId === "string" || typeof metadata?.chainId === "number"
      ? metadata.chainId
      : null) ??
    (typeof metadata?.chain_id === "string" ||
    typeof metadata?.chain_id === "number"
      ? metadata.chain_id
      : null) ??
    wallet.namespace
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
